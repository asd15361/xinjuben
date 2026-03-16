import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { registerAiHandlers } from '../../ipc/ai-handlers'
import { registerSystemHandlers } from '../../ipc/system-handlers'
import { registerWorkspaceHandlers } from '../../ipc/workspace-handlers'
import { registerInputContractHandlers } from '../../ipc/workflow/input-contract-handlers'
import { registerFormalFactHandlers } from '../../ipc/workflow/formal-fact-handlers'
import { registerScriptAuditHandlers } from '../../ipc/workflow/script-audit-handlers'
import { registerScriptGenerationHandlers } from '../../ipc/workflow/script-generation-handlers'
import { registerStageContractHandlers } from '../../ipc/workflow/stage-contract-handlers'

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
  registerScriptGenerationHandlers(input.runtimeProviderConfig)
  registerScriptAuditHandlers(input.runtimeProviderConfig)
}
