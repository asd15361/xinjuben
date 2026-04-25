import type { StoryIntentPackageDto } from '../../../../shared/contracts/intake.ts'
import type { ProjectSnapshotDto } from '../../../../shared/contracts/project.ts'
import type {
  OutlineDraftDto,
  SevenQuestionsResultDto,
  SevenQuestionCandidateDto,
  SevenQuestionsSessionDto
} from '../../../../shared/contracts/workflow.ts'
import {
  apiGetProject,
  apiGenerateOutlineAndCharacters,
  apiGenerateSevenQuestions,
  apiSaveConfirmedSevenQuestions,
  apiSaveSevenQuestionsSession,
  type StoryIntent
} from '../../services/api-client.ts'
import { resolveProjectEpisodeCount } from '../../../../shared/domain/workflow/episode-count.ts'

/**
 * 将 StoryIntentPackageDto 转换为 API 所需的 StoryIntent 格式
 */
function toStoryIntent(storyIntent: StoryIntentPackageDto): StoryIntent {
  return {
    titleHint: storyIntent.titleHint,
    genre: storyIntent.genre,
    tone: storyIntent.tone,
    protagonist: storyIntent.protagonist,
    antagonist: storyIntent.antagonist,
    coreConflict: storyIntent.coreConflict,
    endingDirection: storyIntent.endingDirection,
    creativeSummary: storyIntent.creativeSummary,
    storySynopsis: storyIntent.storySynopsis
      ? {
          logline: storyIntent.storySynopsis.logline,
          openingPressureEvent: storyIntent.storySynopsis.openingPressureEvent,
          protagonistCurrentDilemma: storyIntent.storySynopsis.protagonistCurrentDilemma,
          firstFaceSlapEvent: storyIntent.storySynopsis.firstFaceSlapEvent,
          antagonistForce: storyIntent.storySynopsis.antagonistForce,
          antagonistPressureMethod: storyIntent.storySynopsis.antagonistPressureMethod,
          corePayoff: storyIntent.storySynopsis.corePayoff,
          stageGoal: storyIntent.storySynopsis.stageGoal,
          keyFemaleCharacterFunction: storyIntent.storySynopsis.keyFemaleCharacterFunction,
          episodePlanHint: storyIntent.storySynopsis.episodePlanHint,
          finaleDirection: storyIntent.storySynopsis.finaleDirection
      }
      : undefined,
    marketProfile: storyIntent.marketProfile ?? undefined
  }
}

/**
 * 生成七问初稿（HTTP API 版本）
 *
 * @param projectId 项目 ID（暂时不用于 HTTP API，保留兼容）
 * @param storyIntent 故事意图包
 * @param totalEpisodes 总集数；未传时从已确认创作信息里解析，禁止静默回落成 10 集
 * @throws ApiError 当未登录、积分不足或生成失败时
 */
export async function generateSevenQuestionsDraft(
  projectId: string,
  storyIntent?: StoryIntentPackageDto,
  totalEpisodes?: number
): Promise<{
  /** 兼容旧前端：单个七问结果 */
  sevenQuestions: SevenQuestionsResultDto | null
  /** 新字段：七问候选列表 */
  candidates: SevenQuestionCandidateDto[]
  /** 当只生成1个候选时标记 */
  needsMoreCandidates: boolean
}> {
  // 如果没有传入 storyIntent，尝试从项目获取（兼容旧调用方式）
  let projectSelection = null as ProjectSnapshotDto['marketPlaybookSelection'] | null
  if (!storyIntent) {
    const { project } = await apiGetProject(projectId)
    if (project?.storyIntent) {
      storyIntent = project.storyIntent
    }
    projectSelection = project?.marketPlaybookSelection ?? null
  } else {
    const { project } = await apiGetProject(projectId)
    projectSelection = project?.marketPlaybookSelection ?? null
  }

  if (!storyIntent) {
    throw new Error('缺少故事意图信息，无法生成七问')
  }

  const resolvedTotalEpisodes =
    totalEpisodes ||
    resolveProjectEpisodeCount({
      storyIntent,
      fallbackCount: 10
    })

  // 调用 HTTP API
  const result = await apiGenerateSevenQuestions({
    storyIntent: toStoryIntent(storyIntent),
    totalEpisodes: resolvedTotalEpisodes,
    marketPlaybookSelection: projectSelection
  })

  // 优先取 candidates，没有则把旧 sevenQuestions 包装成单候选
  const candidates = result.candidates ?? []
  const needsMoreCandidates = result.needsMoreCandidates ?? candidates.length < 2

  return {
    sevenQuestions: result.sevenQuestions,
    candidates,
    needsMoreCandidates
  }
}

export async function saveConfirmedSevenQuestions(
  projectId: string,
  sevenQuestions: SevenQuestionsResultDto
): Promise<{
  project: ProjectSnapshotDto | null
  outlineDraft: OutlineDraftDto | null
}> {
  const result = await apiSaveConfirmedSevenQuestions({
    projectId,
    sevenQuestions
  })
  return {
    project: result.project ?? null,
    outlineDraft: result.project?.outlineDraft ?? null
  }
}

/**
 * 保存七问候选会话（持久化 candidates + 选中/锁定状态）
 * 使用防抖调用，不需要每次都 await
 */
export async function saveSevenQuestionsSession(
  projectId: string,
  session: SevenQuestionsSessionDto
): Promise<void> {
  await apiSaveSevenQuestionsSession({ projectId, session })
}

export async function generateOutlineAndCharactersFromConfirmedSevenQuestions(
  projectId: string
): Promise<{
  project: ProjectSnapshotDto
  storyIntent: StoryIntentPackageDto | null
  outlineDraft: OutlineDraftDto | null
  outlineGenerationError?: string
}> {
  const result = await apiGenerateOutlineAndCharacters({ projectId })
  return {
    project: result.project,
    storyIntent: result.project.storyIntent,
    outlineDraft: result.project.outlineDraft,
    outlineGenerationError: result.outlineGenerationError
  }
}
