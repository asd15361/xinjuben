import type { ModelRouteLane } from '../../../shared/contracts/ai.ts'
import type {
  RuntimeProviderConfig,
  ProviderFamilyConfig
} from '../../infrastructure/runtime-env/provider-config.ts'

export const AI_REQUEST_TIMEOUT_PREFIX = 'ai_request_timeout:'

export interface LaneRuntime {
  lane: ModelRouteLane
  config: ProviderFamilyConfig
}

export function resolveLaneRuntime(
  lane: ModelRouteLane,
  runtimeConfig: RuntimeProviderConfig
): LaneRuntime {
  switch (lane) {
    case 'openrouter_gemini_flash_lite':
      return { lane, config: runtimeConfig.openrouterGeminiFlashLite }
    case 'openrouter_qwen_free':
      return { lane, config: runtimeConfig.openrouterQwenFree }
    case 'deepseek':
    default:
      return { lane, config: runtimeConfig.deepseek }
  }
}

export function createAbortSignal(timeoutMs: number, parentSignal?: AbortSignal): AbortSignal {
  const controller = new AbortController()

  if (parentSignal?.aborted) {
    controller.abort(parentSignal.reason)
    return controller.signal
  }

  const timeoutHandle = setTimeout(
    () => controller.abort(`${AI_REQUEST_TIMEOUT_PREFIX}${timeoutMs}ms`),
    timeoutMs
  )

  parentSignal?.addEventListener(
    'abort',
    () => {
      clearTimeout(timeoutHandle)
      controller.abort(parentSignal.reason)
    },
    { once: true }
  )

  return controller.signal
}

export function normalizeAbortError(error: Error, signal: AbortSignal): Error {
  const reason = signal.reason
  const normalized = new Error(
    typeof reason === 'string' && reason.startsWith(AI_REQUEST_TIMEOUT_PREFIX)
      ? reason
      : reason instanceof Error
        ? reason.message
        : error.message
  )
  normalized.name =
    typeof reason === 'string' && reason.startsWith(AI_REQUEST_TIMEOUT_PREFIX)
      ? 'TimeoutError'
      : error.name
  return normalized
}
