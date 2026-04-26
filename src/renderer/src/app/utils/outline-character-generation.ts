import type { GenerationNotice } from '../store/useWorkflowStore.ts'
import { normalizeWorkspaceChatErrorMessage } from '../../features/workspace/ui/workspace-chat-error-message.ts'

export type OutlineCharacterVisibleStage = 'outline' | 'character'

export interface OutlineCharacterGenerationStateInput {
  outlineEpisodeCount: number
  characterCount: number
  currentStage?: OutlineCharacterVisibleStage
}

function extractNormalizedErrorCode(error: unknown): string {
  const raw =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error || '')

  return raw
    .trim()
    .replace(/^Error invoking remote method '[^']+':\s*(?:\w*Error:\s*)?/i, '')
    .replace(/^summary_generation_failed:/i, '')
}

function buildFailureTitle(
  stage: OutlineCharacterVisibleStage,
  hadExistingContent: boolean
): string {
  if (stage === 'character') {
    return hadExistingContent ? '这次没能重新生成人物小传' : '这次没能生成人物小传'
  }

  return hadExistingContent ? '这次没能重新生成剧本骨架' : '这次没能生成剧本骨架'
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
  if (input.currentStage === 'character') {
    return input.characterCount > 0 ? '重新生成人物小传' : '生成人物小传'
  }

  if (input.currentStage === 'outline') {
    return input.outlineEpisodeCount > 0 ? '重新生成剧本骨架' : '生成剧本骨架'
  }

  return hasOutlineCharacterStageContent(input) ? '重新生成人物小传和骨架' : '生成人物小传和骨架'
}

export function buildOutlineCharacterGenerationSuccessNotice(input: {
  currentStage: OutlineCharacterVisibleStage
  hadExistingContent: boolean
}): GenerationNotice {
  const title =
    input.currentStage === 'character'
      ? input.hadExistingContent
        ? '人物小传已经重新生成好了'
        : '人物小传已经生成好了'
      : input.hadExistingContent
        ? '剧本骨架已经重新生成好了'
        : '剧本骨架已经生成好了'
  const detail =
    input.currentStage === 'character'
      ? '先检查并修改人物小传，确认后再去生成剧本骨架。'
      : '剧本骨架已经按当前人物小传生成，确认后可以继续详细大纲。'

  return {
    kind: 'success',
    title,
    detail,
    primaryAction: {
      label: buildCurrentStageActionLabel(input.currentStage),
      stage: input.currentStage
    },
    secondaryAction:
      input.currentStage === 'character'
        ? { label: '去剧本骨架', stage: 'outline' }
        : { label: '去详细大纲', stage: 'detailed_outline' }
  }
}

export function buildOutlineCharacterPartialSuccessNotice(input: {
  currentStage: OutlineCharacterVisibleStage
  hadExistingContent: boolean
}): GenerationNotice {
  return {
    kind: 'warning',
    title: input.hadExistingContent
      ? '人物小传已经重新生成，骨架未写入'
      : '人物小传已经生成，骨架未写入',
    detail:
      '这次 AI 在生成剧本骨架批次时返回了不完整 JSON，系统只保住人物小传和世界底账，不再写入临时骨架。下一步先检查人物，再重新生成骨架。',
    primaryAction: {
      label: buildCurrentStageActionLabel(input.currentStage),
      stage: input.currentStage
    },
    secondaryAction:
      input.currentStage === 'outline'
        ? { label: '去人物', stage: 'character' }
        : { label: '去剧本骨架', stage: 'outline' }
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
      title: buildFailureTitle(input.currentStage, input.hadExistingContent),
      detail: '这次卡在旧七问前置条件，请直接重新生成人物小传和骨架',
      primaryAction: {
        label: buildCurrentStageActionLabel(input.currentStage),
        stage: input.currentStage
      }
    }
  }

  if (/^confirmed_story_intent_missing$/i.test(errorCode)) {
    return {
      kind: 'error',
      title: buildFailureTitle(input.currentStage, input.hadExistingContent),
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
    title: buildFailureTitle(input.currentStage, input.hadExistingContent),
    detail
  }
}
