import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { registerScriptGenerationPlanHandlers } from './script-generation-plan-handlers'
import { registerScriptGenerationRuntimeHandlers } from './script-generation-runtime-handlers'

export function registerScriptGenerationHandlers(runtimeProviderConfig: RuntimeProviderConfig): void {
  registerScriptGenerationPlanHandlers()
  registerScriptGenerationRuntimeHandlers(runtimeProviderConfig)
}
