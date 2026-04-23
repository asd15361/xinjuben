import { Router, type Request, type Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import {
  ProjectRepository,
  ProjectRepositoryConcurrencyError
} from '../../infrastructure/pocketbase/project-repository'
import type {
  SaveChatMessagesInputDto,
  SaveCharacterDraftsInputDto,
  SaveConfirmedSevenQuestionsInputDto,
  SaveDetailedOutlineSegmentsInputDto,
  SaveOutlineDraftInputDto,
  SaveStoryIntentInputDto
} from '@shared/contracts/workspace'
import type { CreateProjectInputDto, ProjectSnapshotDto } from '@shared/contracts/project'
import type { OutlineDraftDto } from '@shared/contracts/workflow'
import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import { writeConfirmedSevenQuestionsToOutlineBlocks } from '@shared/domain/workflow/seven-questions-authority'
import { buildConfirmedStoryIntent } from '@shared/domain/workflow/confirmed-story-intent'
import { generateTextWithRouter } from '../../application/ai/generate-text'
import {
  loadRuntimeProviderConfig,
  hasValidApiKey
} from '../../infrastructure/runtime-env/provider-config'

export const projectsRouter = Router()

const projectRepository = new ProjectRepository()

function requireUser(
  req: Request,
  res: Response
): { id: string; email: string; name: string } | null {
  if (!req.user) {
    res.status(401).json({
      error: 'not_authenticated',
      message: '请先登录'
    })
    return null
  }
  return req.user
}

function isConcurrencyError(error: unknown): error is ProjectRepositoryConcurrencyError {
  return error instanceof ProjectRepositoryConcurrencyError
}

async function withProjectResult(res: Response, runner: () => Promise<unknown>): Promise<void> {
  try {
    const result = await runner()
    if (result == null) {
      res.status(404).json({
        error: 'project_not_found',
        message: '项目不存在，或你没有权限访问'
      })
      return
    }

    res.json(result)
  } catch (error) {
    if (isConcurrencyError(error)) {
      res.status(409).json({
        error: 'version_conflict',
        message: '项目已被其他更新改动，请刷新后重试'
      })
      return
    }

    console.error('[Projects] request failed:', error)
    res.status(500).json({
      error: 'project_request_failed',
      message: error instanceof Error ? error.message : '项目接口异常'
    })
  }
}

async function requireProjectSnapshot(
  userId: string,
  projectId: string,
  res: Response
): Promise<ProjectSnapshotDto | null> {
  const project = await projectRepository.getProject(userId, projectId)
  if (!project) {
    res.status(404).json({
      error: 'project_not_found',
      message: '项目不存在，或你没有权限访问'
    })
    return null
  }
  return project
}

function buildSevenQuestionsBaseOutline(project: {
  name: string
  genre: string
  storyIntent: {
    themeAnchors?: string[]
    coreConflict?: string
    protagonist?: string
  } | null
}): OutlineDraftDto {
  return {
    title: project.name,
    genre: project.genre || '',
    theme: project.storyIntent?.themeAnchors?.[0] || '',
    mainConflict: project.storyIntent?.coreConflict || '',
    protagonist: project.storyIntent?.protagonist || '',
    summary: '',
    summaryEpisodes: [],
    facts: []
  }
}

projectsRouter.use(authMiddleware)

projectsRouter.get('/', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  await withProjectResult(res, async () => ({
    projects: await projectRepository.listProjects(user.id)
  }))
})

projectsRouter.post('/', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const input = req.body as CreateProjectInputDto
  if (!input?.name?.trim()) {
    res.status(400).json({
      error: 'invalid_project_name',
      message: '项目名称不能为空'
    })
    return
  }

  if (input.workflowType !== 'ai_write' && input.workflowType !== 'novel_adapt') {
    res.status(400).json({
      error: 'invalid_workflow_type',
      message: '项目工作流类型不合法'
    })
    return
  }

  await withProjectResult(res, async () => ({
    project: await projectRepository.createProject(user.id, input)
  }))
})

projectsRouter.get('/:projectId', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  await withProjectResult(res, async () => ({
    project: await projectRepository.getProject(user.id, req.params.projectId)
  }))
})

projectsRouter.delete('/:projectId', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const deleted = await projectRepository.deleteProject(user.id, req.params.projectId)
  if (!deleted) {
    res.status(404).json({
      error: 'project_not_found',
      message: '项目不存在，或你没有权限访问'
    })
    return
  }

  res.json({ ok: true })
})

projectsRouter.post('/:projectId/story-intent', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const input = req.body as SaveStoryIntentInputDto
  await withProjectResult(res, async () => ({
    project: await projectRepository.saveProjectMeta({
      userId: user.id,
      projectId: req.params.projectId,
      storyIntent: input.storyIntent,
      entityStore: input.entityStore ?? undefined
    })
  }))
})

/**
 * POST /:projectId/confirm-story-intent
 *
 * Confirm story intent from chat transcript.
 * Uses AI to summarize the chat into structured storyIntent,
 * then persists and returns it.
 */
projectsRouter.post('/:projectId/confirm-story-intent', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const { chatTranscript } = req.body as { chatTranscript: string }
  if (!chatTranscript?.trim()) {
    res.status(400).json({
      error: 'missing_chat_transcript',
      message: '请提供聊天记录'
    })
    return
  }

  const projectId = req.params.projectId
  const existingProject = await requireProjectSnapshot(user.id, projectId, res)
  if (!existingProject) return

  const runtimeConfig = loadRuntimeProviderConfig()
  if (!hasValidApiKey(runtimeConfig)) {
    res.status(500).json({
      error: 'ai_not_configured',
      message: '服务器未配置 AI API Key'
    })
    return
  }

  try {
    // Step 1: Use AI to generate a structured summary from chat transcript
    const prompt = `你是一个专业的剧本策划助手。用户刚才的聊天记录如下：

${chatTranscript}

请根据以上聊天，整理出正式创作信息摘要，包含以下关键要素（每行一个）：
- 题材（genre）
- 主角（protagonist）
- 反派/对手（antagonist）
- 核心冲突（coreConflict）
- 结局方向（endingDirection）
- 基调/调性（tone）

格式要求：先写一段自然语言的创作信息总结（不超过200字），然后换行，用"---"分隔，下面按 "字段名: 值" 的格式逐行列出。`

    const aiResult = await generateTextWithRouter(
      {
        task: 'story_intake',
        prompt,
        temperature: 0.3,
        maxOutputTokens: 1500,
        timeoutMs: 35000
      },
      runtimeConfig
    )

    const generationBriefText = aiResult.text || ''
    const parts = generationBriefText.split('---')
    const summaryText = parts[0]?.trim() || generationBriefText
    const fieldText = parts[1]?.trim() || ''

    // Parse fields from "field: value" format
    function extractField(text: string, fieldName: string): string {
      const regex = new RegExp(`${fieldName}[：:]\\s*(.+)`, 'i')
      const match = text.match(regex)
      return match?.[1]?.trim() || ''
    }

    // Step 2: Build the structured storyIntent
    const storyIntent: StoryIntentPackageDto = buildConfirmedStoryIntent({
      storyIntent: {
        genre: extractField(fieldText, '题材'),
        protagonist: extractField(fieldText, '主角'),
        antagonist: extractField(fieldText, '反派'),
        coreConflict: extractField(fieldText, '核心冲突'),
        endingDirection: extractField(fieldText, '结局方向'),
        tone: extractField(fieldText, '基调')
      },
      generationBriefText: summaryText,
      chatTranscript
    })

    // Step 3: Persist the storyIntent
    const updatedProject = await projectRepository.saveProjectMeta({
      userId: user.id,
      projectId,
      storyIntent,
      entityStore: existingProject.entityStore ?? undefined
    })

    res.json({
      project: updatedProject,
      storyIntent,
      generationBriefText: summaryText
    })
  } catch (error) {
    console.error('[Projects] confirm-story-intent failed:', error)
    res.status(500).json({
      error: 'confirm_story_intent_failed',
      message: error instanceof Error ? error.message : '确认创作信息失败'
    })
  }
})

projectsRouter.post('/:projectId/chat-messages', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const input = req.body as SaveChatMessagesInputDto
  await withProjectResult(res, async () => ({
    project: await projectRepository.saveChatMessages({
      userId: user.id,
      projectId: req.params.projectId,
      chatMessages: input.chatMessages
    })
  }))
})

projectsRouter.post('/:projectId/outline', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const input = req.body as SaveOutlineDraftInputDto
  await withProjectResult(res, async () => ({
    project: await projectRepository.saveOutlineDraft({
      userId: user.id,
      projectId: req.params.projectId,
      outlineDraft: input.outlineDraft
    })
  }))
})

projectsRouter.post('/:projectId/seven-questions/confirm', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const input = req.body as SaveConfirmedSevenQuestionsInputDto
  if (!input?.sevenQuestions?.sections?.length) {
    res.status(400).json({
      error: 'invalid_seven_questions',
      message: '七问内容不能为空'
    })
    return
  }

  const existingProject = await requireProjectSnapshot(user.id, req.params.projectId, res)
  if (!existingProject) return

  const outlineBase =
    existingProject.outlineDraft ?? buildSevenQuestionsBaseOutline(existingProject)
  const nextOutlineDraft = writeConfirmedSevenQuestionsToOutlineBlocks(
    outlineBase,
    input.sevenQuestions.sections
  )

  await withProjectResult(res, async () => ({
    project: await projectRepository.saveOutlineDraft({
      userId: user.id,
      projectId: req.params.projectId,
      outlineDraft: nextOutlineDraft
    })
  }))
})

projectsRouter.post('/:projectId/characters', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const input = req.body as SaveCharacterDraftsInputDto
  await withProjectResult(res, async () => ({
    project: await projectRepository.saveCharacterDrafts({
      userId: user.id,
      projectId: req.params.projectId,
      characterDrafts: input.characterDrafts
    })
  }))
})

projectsRouter.post('/:projectId/detailed-outline', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const input = req.body as SaveDetailedOutlineSegmentsInputDto
  const existingProject = await requireProjectSnapshot(user.id, req.params.projectId, res)
  if (!existingProject) return

  await withProjectResult(res, async () => ({
    project: await projectRepository.saveDetailedOutline({
      userId: user.id,
      projectId: req.params.projectId,
      detailedOutlineBlocks: existingProject.detailedOutlineBlocks ?? [],
      detailedOutlineSegments: input.detailedOutlineSegments
    })
  }))
})

