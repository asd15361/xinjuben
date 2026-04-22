import type { AiGenerateRequestDto, ModelRouteLane } from '../../../shared/contracts/ai.ts'
import { decideRuntimePolicyOrder } from '../../../shared/domain/policy/runtime/runtime-policy.ts'
import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config.ts'

interface RuntimeRouteDecision {
  primary: ModelRouteLane[]
  reasonCodes: string[]
}

function readOptionalEnvString(key: string): string | undefined {
  const value = process.env[key]
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return normalized.length > 0 ? normalized : undefined
}

function enabledLanes(runtimeConfig: RuntimeProviderConfig): ModelRouteLane[] {
  const lanes: ModelRouteLane[] = []
  if (
    runtimeConfig.lanes.openrouterGeminiFlashLite &&
    runtimeConfig.openrouterGeminiFlashLite.apiKey
  ) {
    lanes.push('openrouter_gemini_flash_lite')
  }
  if (runtimeConfig.lanes.openrouterQwenFree && runtimeConfig.openrouterQwenFree.apiKey) {
    lanes.push('openrouter_qwen_free')
  }
  if (runtimeConfig.lanes.deepseek && runtimeConfig.deepseek.apiKey) {
    lanes.push('deepseek')
  }
  return lanes
}

export function decideRuntimeRoute(
  request: AiGenerateRequestDto,
  runtimeConfig: RuntimeProviderConfig
): RuntimeRouteDecision {
  const enabled = enabledLanes(runtimeConfig)
  const decision = decideRuntimePolicyOrder({
    request,
    enabledLanes: enabled
  })

  return {
    primary: decision.orderedLanes,
    reasonCodes: decision.reasonCodes
  }
}

export function shouldFallbackForError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase()
  return [
    'model_not_found',
    'service unavailable',
    'timeout',
    'timed out',
    '429',
    '503',
    'network',
    'gateway',
    'socket hang up'
  ].some((token) => message.includes(token))
}

export function resolveLaneSystemInstruction(
  lane: ModelRouteLane,
  runtimeConfig: RuntimeProviderConfig
): string | undefined {
  switch (lane) {
    case 'openrouter_gemini_flash_lite':
      return (
        readOptionalEnvString('MODEL_ROUTER_SYSTEM_INSTRUCTION_OPENROUTER_GEMINI_FLASH_LITE') ||
        runtimeConfig.openrouterGeminiFlashLite.systemInstruction ||
        undefined
      )
    case 'openrouter_qwen_free':
      return (
        readOptionalEnvString('MODEL_ROUTER_SYSTEM_INSTRUCTION_OPENROUTER_QWEN_FREE') ||
        runtimeConfig.openrouterQwenFree.systemInstruction ||
        undefined
      )
    case 'deepseek':
    default:
      return (
        readOptionalEnvString('MODEL_ROUTER_SYSTEM_INSTRUCTION_DEEPSEEK') ||
        runtimeConfig.deepseek.systemInstruction ||
        undefined
      )
  }
}
