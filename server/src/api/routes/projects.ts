import { Router, type Request, type Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { ProjectRepository, ProjectRepositoryConcurrencyError } from '../../infrastructure/pocketbase/project-repository'
import type {
  SaveChatMessagesInputDto,
  SaveCharacterDraftsInputDto,
  SaveConfirmedSevenQuestionsInputDto,
  SaveDetailedOutlineSegmentsInputDto,
  SaveOutlineDraftInputDto,
  SaveScriptDraftInputDto,
  SaveScriptRuntimeStateInputDto,
  SaveStoryIntentInputDto
} from '../../shared/contracts/workspace'
import type { CreateProjectInputDto } from '../../shared/contracts/project'
import type { OutlineDraftDto } from '../../shared/contracts/workflow'
import { writeConfirmedSevenQuestionsToOutlineBlocks } from '../../shared/domain/workflow/seven-questions-authority'

export const projectsRouter = Router()

const projectRepository = new ProjectRepository()

function requireUser(req: Request, res: Response): { id: string; email: string; name: string } | null {
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

async function withProjectResult(
  res: Response,
  runner: () => Promise<unknown>
): Promise<void> {
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
) {
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

  const outlineBase = existingProject.outlineDraft ?? buildSevenQuestionsBaseOutline(existingProject)
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

projectsRouter.post('/:projectId/script', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const input = req.body as SaveScriptDraftInputDto
  await withProjectResult(res, async () => ({
    project: await projectRepository.saveScriptState({
      userId: user.id,
      projectId: req.params.projectId,
      scriptDraft: input.scriptDraft
    })
  }))
})

projectsRouter.post('/:projectId/runtime-state', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const input = req.body as SaveScriptRuntimeStateInputDto
  const existingProject = await requireProjectSnapshot(user.id, req.params.projectId, res)
  if (!existingProject) return

  await withProjectResult(res, async () => ({
    project: await projectRepository.saveScriptState({
      userId: user.id,
      projectId: req.params.projectId,
      scriptDraft: existingProject.scriptDraft ?? [],
      scriptProgressBoard: input.scriptProgressBoard,
      scriptFailureResolution: input.scriptFailureResolution,
      scriptRuntimeFailureHistory: input.scriptRuntimeFailureHistory,
      scriptStateLedger: input.scriptStateLedger
    })
  }))
})
