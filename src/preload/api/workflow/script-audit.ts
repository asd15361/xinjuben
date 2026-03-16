import { ipcRenderer } from 'electron'
import type {
  AuditScriptInputDto,
  ExecuteScriptRepairInputDto,
  ExecuteScriptRepairResultDto,
  ScriptAuditReportDto,
  ScriptRepairPlanDto
} from '../../../shared/contracts/script-audit'

export const workflowScriptAuditApi = {
  auditScript(input: AuditScriptInputDto): Promise<ScriptAuditReportDto> {
    return ipcRenderer.invoke('workflow:audit-script', input)
  },
  buildScriptRepairPlan(input: AuditScriptInputDto): Promise<ScriptRepairPlanDto> {
    return ipcRenderer.invoke('workflow:build-script-repair-plan', input)
  },
  executeScriptRepair(input: ExecuteScriptRepairInputDto): Promise<ExecuteScriptRepairResultDto> {
    return ipcRenderer.invoke('workflow:execute-script-repair', input)
  }
}
