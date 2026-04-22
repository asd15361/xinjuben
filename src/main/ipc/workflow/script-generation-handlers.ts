import { registerScriptGenerationPlanHandlers } from './script-generation-plan-handlers.ts'
import { registerScriptGenerationRuntimeHandlers } from './script-generation-runtime-handlers.ts'

export function registerScriptGenerationHandlers(): void {
  registerScriptGenerationPlanHandlers()
  registerScriptGenerationRuntimeHandlers()
}
