import { ipcRenderer } from 'electron'
import type { AuditScriptInputDto, ScriptAuditReportDto, ScriptRepairPlanDto } from '../../../shared/contracts/script-audit.ts'

/**
 * Script Audit IPC API - 只保留纯计算、只读审计能力
 *
 * executeScriptRepair 已迁移到 HTTP server
 */
export const workflowScriptAuditApi = {
  auditScript(input: AuditScriptInputDto): Promise<ScriptAuditReportDto> {
    return ipcRenderer.invoke('workflow:audit-script', input)
  },
  buildScriptRepairPlan(input: AuditScriptInputDto): Promise<ScriptRepairPlanDto> {
    return ipcRenderer.invoke('workflow:build-script-repair-plan', input)
  }
}
