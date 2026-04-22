import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config.ts'
import { registerAiHandlers } from '../../ipc/ai-handlers.ts'
import { registerSystemHandlers } from '../../ipc/system-handlers.ts'
import { registerWorkspaceHandlers } from '../../ipc/workspace-handlers.ts'
import { registerInputContractHandlers } from '../../ipc/workflow/input-contract-handlers.ts'
import { registerFormalFactHandlers } from '../../ipc/workflow/formal-fact-handlers.ts'
import { registerScriptAuditHandlers } from '../../ipc/workflow/script-audit-handlers.ts'
import { registerScriptGenerationHandlers } from '../../ipc/workflow/script-generation-handlers.ts'
import { registerStageContractHandlers } from '../../ipc/workflow/stage-contract-handlers.ts'

export function registerIpcHandlers(input: {
  runtimeProviderConfig: RuntimeProviderConfig
  getVersion: () => string
}): void {
  registerSystemHandlers(input.getVersion)
  registerAiHandlers(input.runtimeProviderConfig)
  registerWorkspaceHandlers()
  registerStageContractHandlers()
  registerInputContractHandlers()
  registerFormalFactHandlers()
  registerScriptGenerationHandlers()
  registerScriptAuditHandlers()
}
