import type { ModelRouteLane } from '../../../shared/contracts/ai'
import type { ScriptGenerationMode } from '../../../shared/contracts/script-generation'

export function resolveLaneStrategy(_input: {
  mode: ScriptGenerationMode
  targetEpisodes: number
  hasDenseStructure: boolean
}): {
  primary: ModelRouteLane
  fallback: ModelRouteLane
} {
  return {
    primary: 'openrouter_gemini_flash_lite',
    fallback: 'openrouter_qwen_free'
  }
}