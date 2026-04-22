import type { StoryIntentPackageDto } from '../../../../shared/contracts/intake.ts'
import type { ProjectSnapshotDto } from '../../../../shared/contracts/project.ts'
import type {
  OutlineDraftDto,
  SevenQuestionsResultDto
} from '../../../../shared/contracts/workflow.ts'
import {
  apiGetProject,
  apiGenerateOutlineAndCharacters,
  apiGenerateSevenQuestions,
  apiSaveConfirmedSevenQuestions,
  type StoryIntent
} from '../../services/api-client.ts'

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
    endingDirection: storyIntent.endingDirection
  }
}

/**
 * 生成七问初稿（HTTP API 版本）
 *
 * @param projectId 项目 ID（暂时不用于 HTTP API，保留兼容）
 * @param storyIntent 故事意图包
 * @param totalEpisodes 总集数（默认 10）
 * @throws ApiError 当未登录、积分不足或生成失败时
 */
export async function generateSevenQuestionsDraft(
  projectId: string,
  storyIntent?: StoryIntentPackageDto,
  totalEpisodes?: number
): Promise<{
  sevenQuestions: SevenQuestionsResultDto | null
}> {
  // 如果没有传入 storyIntent，尝试从项目获取（兼容旧调用方式）
  if (!storyIntent) {
    const { project } = await apiGetProject(projectId)
    if (project?.storyIntent) {
      storyIntent = project.storyIntent
    }
  }

  if (!storyIntent) {
    throw new Error('缺少故事意图信息，无法生成七问')
  }

  // 调用 HTTP API
  const result = await apiGenerateSevenQuestions({
    storyIntent: toStoryIntent(storyIntent),
    totalEpisodes: totalEpisodes || 10
  })

  // 后端返回的 sevenQuestions 格式与 SevenQuestionsResultDto 一致，直接透传
  return {
    sevenQuestions: result.sevenQuestions
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

export async function generateOutlineAndCharactersFromConfirmedSevenQuestions(
  projectId: string
): Promise<{
  project: ProjectSnapshotDto
  storyIntent: StoryIntentPackageDto | null
  outlineDraft: OutlineDraftDto | null
}> {
  const result = await apiGenerateOutlineAndCharacters({ projectId })
  return {
    project: result.project,
    storyIntent: result.project.storyIntent,
    outlineDraft: result.project.outlineDraft
  }
}
