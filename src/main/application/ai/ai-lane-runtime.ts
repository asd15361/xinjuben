import type { ModelRouteLane } from '../../../shared/contracts/ai'
import type { RuntimeProviderConfig, ProviderFamilyConfig } from '../../infrastructure/runtime-env/provider-config'

export interface LaneRuntime {
  lane: ModelRouteLane
  config: ProviderFamilyConfig
}

export function resolveLaneRuntime(
  lane: ModelRouteLane,
  runtimeConfig: RuntimeProviderConfig
): LaneRuntime {
  if (lane === 'deepseek') return { lane, config: runtimeConfig.deepseek }
  if (lane === 'gemini_flash') return { lane, config: runtimeConfig.geminiFlash }
  return { lane, config: runtimeConfig.geminiPro }
}

export function createAbortSignal(timeoutMs: number): AbortSignal {
  const controller = new AbortController()
  setTimeout(() => controller.abort(), timeoutMs)
  return controller.signal
}
