import type { GenerationNotice } from '../store/useWorkflowStore.ts'
import { normalizeWorkspaceChatErrorMessage } from '../../features/workspace/ui/workspace-chat-error-message.ts'

export type OutlineCharacterVisibleStage = 'outline' | 'character'

export interface OutlineCharacterGenerationStateInput {
  outlineEpisodeCount: number
  characterCount: number
}

function extractNormalizedErrorCode(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error || '')

  return raw
    .trim()
    .replace(/^Error invoking remote method '[^']+':\s*(?:\w*Error:\s*)?/i, '')
    .replace(/^summary_generation_failed:/i, '')
}

function buildFailureTitle(hadExistingContent: boolean): string {
  return hadExistingContent ? '这次没能重新生成粗纲和人物' : '这次没能生成粗纲和人物'
}

function buildCurrentStageActionLabel(stage: OutlineCharacterVisibleStage): string {
  return stage === 'outline' ? '继续看粗纲' : '继续看人物'
}

export function hasOutlineCharacterStageContent(
  input: OutlineCharacterGenerationStateInput
): boolean {
  return input.outlineEpisodeCount > 0 || input.characterCount > 0
}

export function getOutlineCharacterGenerationActionLabel(
  input: OutlineCharacterGenerationStateInput
): string {
  return hasOutlineCharacterStageContent(input) ? '重新生成粗纲和人物' : '生成粗纲和人物'
}

export function buildOutlineCharacterGenerationSuccessNotice(input: {
  currentStage: OutlineCharacterVisibleStage
  hadExistingContent: boolean
}): GenerationNotice {
  return {
    kind: 'success',
    title: input.hadExistingContent ? '粗纲和人物已经重新生成好了' : '粗纲和人物已经生成好了',
    detail: input.hadExistingContent
      ? '当前粗纲和人物已经按新版本覆盖；旧的详细大纲和剧本也已经自动清空。'
      : '先确认粗纲主线，再继续补人物和后面的详细大纲。',
    primaryAction: {
      label: buildCurrentStageActionLabel(input.currentStage),
      stage: input.currentStage
    },
    secondaryAction:
      input.currentStage === 'outline'
        ? { label: '去人物', stage: 'character' }
        : { label: '去详细大纲', stage: 'detailed_outline' }
  }
}

export function buildOutlineCharacterGenerationFailureNotice(input: {
  currentStage: OutlineCharacterVisibleStage
  hadExistingContent: boolean
  error: unknown
}): GenerationNotice {
  const errorCode = extractNormalizedErrorCode(input.error)
  const detail = normalizeWorkspaceChatErrorMessage(input.error)

  if (/^rough_outline_requires_confirmed_seven_questions$/i.test(errorCode)) {
    return {
      kind: 'error',
      title: buildFailureTitle(input.hadExistingContent),
      detail,
      primaryAction: { label: '回聊天确认七问', stage: 'chat' },
      secondaryAction: {
        label: buildCurrentStageActionLabel(input.currentStage),
        stage: input.currentStage
      }
    }
  }

  if (/^confirmed_story_intent_missing$/i.test(errorCode)) {
    return {
      kind: 'error',
      title: buildFailureTitle(input.hadExistingContent),
      detail,
      primaryAction: { label: '回聊天确认信息', stage: 'chat' },
      secondaryAction: {
        label: buildCurrentStageActionLabel(input.currentStage),
        stage: input.currentStage
      }
    }
  }

  return {
    kind: 'error',
    title: buildFailureTitle(input.hadExistingContent),
    detail
  }
}
