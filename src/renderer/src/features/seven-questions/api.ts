import type { StoryIntentPackageDto } from '../../../../shared/contracts/intake'
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  SevenQuestionsResultDto
} from '../../../../shared/contracts/workflow'
import {
  apiGenerateSevenQuestions,
  ApiError,
  type StoryIntent
} from '../../services/api-client'

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
    // 尝试从 window.api 获取项目信息（保留向后兼容）
    try {
      const project = await window.api.workspace.getProject(projectId)
      if (project?.storyIntent) {
        storyIntent = project.storyIntent
      }
    } catch {
      // 忽略获取失败
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
  outlineDraft: OutlineDraftDto | null
}> {
  const result = await window.api.workspace.saveConfirmedSevenQuestions({
    projectId,
    sevenQuestions
  })
  return { outlineDraft: result.outlineDraft }
}

export async function generateOutlineAndCharactersFromConfirmedSevenQuestions(
  projectId: string
): Promise<{
  storyIntent: StoryIntentPackageDto | null
  outlineDraft: OutlineDraftDto | null
  characterDrafts: CharacterDraftDto[]
}> {
  const result =
    await window.api.workspace.generateOutlineAndCharactersFromConfirmedSevenQuestions({
      projectId
    })
  return {
    storyIntent: result.storyIntent,
    outlineDraft: result.outlineDraft,
    characterDrafts: result.characterDrafts
  }
}
