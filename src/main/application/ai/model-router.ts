import type { AiGenerateRequestDto, ModelRouteLane } from '../../../shared/contracts/ai'
import { decideRuntimePolicyOrder } from '../../../shared/domain/policy/runtime/runtime-policy'
import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'

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
  return [
    runtimeConfig.lanes.deepseek && runtimeConfig.deepseek.apiKey ? 'deepseek' : null,
    runtimeConfig.lanes.geminiFlash && runtimeConfig.geminiFlash.apiKey ? 'gemini_flash' : null,
    runtimeConfig.lanes.geminiPro && runtimeConfig.geminiPro.apiKey ? 'gemini_pro' : null
  ].filter(Boolean) as ModelRouteLane[]
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
  const message = error instanceof Error ? error.message.toLowerCase() : String(error || '').toLowerCase()
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
  if (lane === 'gemini_flash') {
    return (
      readOptionalEnvString('MODEL_ROUTER_SYSTEM_INSTRUCTION_GEMINI_FLASH') ||
      readOptionalEnvString('MODEL_ROUTER_SYSTEM_INSTRUCTION_GEMINI') ||
      runtimeConfig.geminiFlash.systemInstruction ||
      undefined
    )
  }

  if (lane === 'gemini_pro') {
    return (
      readOptionalEnvString('MODEL_ROUTER_SYSTEM_INSTRUCTION_GEMINI_PRO') ||
      readOptionalEnvString('MODEL_ROUTER_SYSTEM_INSTRUCTION_GEMINI') ||
      runtimeConfig.geminiPro.systemInstruction ||
      undefined
    )
  }

  return (
    readOptionalEnvString('MODEL_ROUTER_SYSTEM_INSTRUCTION_DEEPSEEK') ||
    runtimeConfig.deepseek.systemInstruction ||
    undefined
  )
}
