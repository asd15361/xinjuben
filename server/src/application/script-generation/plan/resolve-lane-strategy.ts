import type { ModelRouteLane } from '@shared/contracts/ai'

export function resolveLaneStrategy(): {
  primary: ModelRouteLane
  fallback: ModelRouteLane
} {
  return {
    primary: 'openrouter_gemini_flash_lite',
    fallback: 'openrouter_qwen_free'
  }
}
