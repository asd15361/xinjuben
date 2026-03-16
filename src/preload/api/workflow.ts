import { workflowFormalFactApi } from './workflow/formal-fact'
import { workflowScriptAuditApi } from './workflow/script-audit'
import { workflowScriptGenerationApi } from './workflow/script-generation'
import { workflowStageContractApi } from './workflow/stage-contract'

export const workflowApi = {
  ...workflowFormalFactApi,
  ...workflowStageContractApi,
  ...workflowScriptGenerationApi,
  ...workflowScriptAuditApi
}
