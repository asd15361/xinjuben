import { workflowFormalFactApi } from './workflow/formal-fact.ts'
import { workflowScriptAuditApi } from './workflow/script-audit.ts'
import { workflowScriptGenerationApi } from './workflow/script-generation.ts'
import { workflowStageContractApi } from './workflow/stage-contract.ts'

export const workflowApi = {
  ...workflowFormalFactApi,
  ...workflowStageContractApi,
  ...workflowScriptGenerationApi,
  ...workflowScriptAuditApi
}
