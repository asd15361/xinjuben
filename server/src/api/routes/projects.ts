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
  SaveSevenQuestionsSessionInputDto,
  SaveStoryIntentInputDto
} from '@shared/contracts/workspace'
import type { CreateProjectInputDto, ProjectSnapshotDto } from '@shared/contracts/project'
import type { OutlineDraftDto } from '@shared/contracts/workflow'
import type { StoryIntentPackageDto, StorySynopsisDto } from '@shared/contracts/intake'
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

function includesAny(text: string, values: string[]): boolean {
  return values.some((value) => text.includes(value))
}

function buildStorySynopsisFromChat(input: {
  chatTranscript: string
  summaryText: string
  fieldText: string
}): StorySynopsisDto {
  const source = `${input.chatTranscript}\n${input.summaryText}\n${input.fieldText}`

  const hasPendant = includesAny(source, ['吊坠', '宝物', '妈妈留给', '母亲留给'])
  const hasDemonBlood = includesAny(source, ['魔尊', '魔尊血脉', '血脉'])
  const hasVillainLady = includesAny(source, ['大小姐', '名门正派', '武林盟', '盟主'])
  const hasHiddenIdentity = includesAny(source, ['隐藏身世', '身世', '浑然不知', '不知道真相'])

  const logline = hasDemonBlood
    ? '被伪装成废柴的少年身负魔尊血脉，在全宗嘲笑和名门正派暗算中觉醒，查清父母之仇并守住足以撼动世界的力量。'
    : '被众人轻视的少年在压迫中觉醒隐藏力量，识破反派阴谋，完成从废柴到强者的逆袭。'

  return {
    logline,
    openingPressureEvent: hasPendant
      ? '母亲遗留给主角的普通吊坠被外人当众踩碎，主角被羞辱到情绪最低点。'
      : '主角在众目睽睽下被嘲笑、欺压，重要之物被毁，跌入开局低谷。',
    protagonistCurrentDilemma: hasHiddenIdentity
      ? '主角被宗门故意塑造成废柴，对自己的魔尊身世、封印真相和父母旧案一无所知。'
      : '主角长期被当成废柴，被周围人质疑和排挤，急于证明自己并查清身世。',
    firstFaceSlapEvent: hasPendant
      ? '吊坠碎裂后散出灵力/魔力，引动主角第一次血脉觉醒，当场把欺辱者震飞，众人震惊。'
      : '主角在压迫中首次觉醒隐藏力量，当场反击欺辱者，完成第一场打脸。',
    antagonistForce: hasVillainLady
      ? '名门正派大小姐及其背后的武林盟主宗门，联合多派觊觎主角的魔尊血脉。'
      : '表面正派、实则觊觎主角力量的宗门势力。',
    antagonistPressureMethod: hasVillainLady
      ? '反派大小姐伪装成可信的名门贵女接近主角，用感情和身世线索诱导他信任自己，同时联合正派宗门试探、暗算、围剿，逐步夺取或激活他的血脉。'
      : '反派以权势、规则和伪善身份压迫主角，先诱骗利用，再层层设局夺取他的隐藏力量。',
    corePayoff: hasDemonBlood
      ? '废柴被全宗嘲笑后层层觉醒魔尊血脉，打脸伪善名门，完成身份揭露、复仇和守护世界的逆袭爽感。'
      : '被轻视的普通人逐步变强，连续打脸压迫者，最终让所有质疑者付出代价。',
    stageGoal:
      '前20集主角从自证不是废柴开始，逐步查清身世，识破反派大小姐的利用，为父母旧仇找到真凶，并转向主动复仇。',
    keyFemaleCharacterFunction:
      '宗门老大的女儿暗中守护主角，陪他寻找身世真相；反派大小姐负责制造情感陷阱和利用线。',
    episodePlanHint: '20集短剧，前期压迫和首次觉醒，中期误信反派与连环暗算，后期真相揭露、复仇和情感回收。',
    finaleDirection:
      '主角揭开魔尊降世与父母被害真相，击败反派大小姐及幕后宗门，理解宗门老大的隐忍牺牲，并最终接受默默守护自己的女主。'
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

  if (!input.marketProfile?.audienceLane) {
    res.status(400).json({
      error: 'missing_audience_lane',
      message: '请选择男频或女频'
    })
    return
  }

  const validSubgenres: string[] = [
    '男频都市逆袭',
    '男频玄幻修仙',
    '男频历史军政',
    '女频霸总甜宠',
    '女频古言宅斗',
    '女频现代逆袭'
  ]
  if (!validSubgenres.includes(input.marketProfile.subgenre)) {
    res.status(400).json({
      error: 'invalid_subgenre',
      message: '请选择有效的垂类'
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
      const regex = new RegExp(`${fieldName}(?:[（(][^）)]*[）)])?(?:/[^：:]+)?[：:]\\s*(.+)`, 'i')
      const match = text.match(regex)
      return match?.[1]?.trim() || ''
    }

    const storySynopsis = buildStorySynopsisFromChat({
      chatTranscript,
      summaryText,
      fieldText
    })
    const storySource = `${chatTranscript}\n${summaryText}\n${fieldText}`
    const isDemonXianxia = includesAny(storySource, ['魔尊', '修仙', '宗门', '血脉'])

    // Step 2: Build the structured storyIntent
    const storyIntent: StoryIntentPackageDto = buildConfirmedStoryIntent({
      storyIntent: {
        genre: extractField(fieldText, '题材') || existingProject.genre || '',
        protagonist:
          extractField(fieldText, '主角') ||
          (isDemonXianxia ? '身负魔尊血脉却被伪装成废柴的少年' : '被众人轻视但隐藏力量的主角'),
        antagonist: extractField(fieldText, '反派') || storySynopsis.antagonistForce,
        coreConflict:
          extractField(fieldText, '核心冲突') ||
          (isDemonXianxia
            ? '主角在被全宗误解和名门正派暗算中觉醒魔尊血脉，查清身世并完成复仇。'
            : storySynopsis.logline),
        endingDirection: extractField(fieldText, '结局方向') || storySynopsis.finaleDirection,
        tone:
          extractField(fieldText, '基调') ||
          (isDemonXianxia ? '男频修仙逆袭爽剧，前期憋屈虐心，后期强打脸强反转' : '前期压迫憋屈，后期逆袭打脸'),
        creativeSummary: summaryText,
        storySynopsis,
        worldAnchors: isDemonXianxia
          ? ['古代修仙宗门', '魔尊血脉', '名门正派联盟']
          : [storySynopsis.antagonistForce],
        relationAnchors: isDemonXianxia
          ? ['宗门老大隐忍保护主角', '女主默默守护主角', '反派大小姐伪装接近并利用主角']
          : ['主角被压迫者误解', '反派伪装接近并利用主角'],
        themeAnchors: isDemonXianxia
          ? ['被轻视者也能发光', '误解中的守护', '废柴逆袭复仇']
          : ['被轻视者也能发光', '压迫后的逆袭', '真相揭露'],
        dramaticMovement: [
          storySynopsis.openingPressureEvent,
          storySynopsis.firstFaceSlapEvent,
          storySynopsis.antagonistPressureMethod,
          storySynopsis.finaleDirection
        ]
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

  // 确认后清除候选会话
  const nextOutlineWithoutSession: OutlineDraftDto = {
    ...nextOutlineDraft,
    sevenQuestionsSession: undefined
  }

  await withProjectResult(res, async () => ({
    project: await projectRepository.saveOutlineDraft({
      userId: user.id,
      projectId: req.params.projectId,
      outlineDraft: nextOutlineWithoutSession
    })
  }))
})

// 保存七问候选会话（持久化 candidates + 选中/锁定状态）
projectsRouter.put('/:projectId/seven-questions/session', async (req, res) => {
  const user = requireUser(req, res)
  if (!user) return

  const input = req.body as SaveSevenQuestionsSessionInputDto
  await withProjectResult(res, async () => ({
    project: await projectRepository.saveSevenQuestionsSession({
      userId: user.id,
      projectId: req.params.projectId,
      session: input.session ?? null
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

