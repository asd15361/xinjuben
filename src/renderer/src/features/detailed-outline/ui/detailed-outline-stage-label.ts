import type { GenerationNotice } from '../../../app/store/useWorkflowStore.ts'

export function getDetailedOutlineGenerationActionLabel(
  hasDetailedOutlineBlocks: boolean
): string {
  return hasDetailedOutlineBlocks ? '重新生成这一版详细大纲' : '生成这一版详细大纲'
}

export function buildDetailedOutlineGenerationSuccessNotice(
  hadExistingBlocks: boolean
): GenerationNotice {
  return {
    kind: 'success',
    title: hadExistingBlocks ? '详细大纲已经重新生成好了' : '详细大纲已经写出来了',
    detail: hadExistingBlocks
      ? '这次已经按新版本覆盖当前逐集细纲，后面按这版继续写。'
      : '你现在可以直接顺这版详细大纲；不管顺不顺，都可以继续往剧本走，再边做边调。',
    primaryAction: { label: '继续看详细大纲', stage: 'detailed_outline' },
    secondaryAction: { label: '去剧本', stage: 'script' }
  }
}
