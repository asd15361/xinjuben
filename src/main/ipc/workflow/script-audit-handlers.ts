import { ipcMain } from 'electron'
import { auditGeneratedScript } from '../../application/script-generation/audit/audit-generated-script.ts'
import { buildScriptRepairPlan } from '../../application/script-generation/audit/build-script-repair-plan.ts'
import type { AuditScriptInputDto, ScriptAuditReportDto, ScriptRepairPlanDto } from '../../../shared/contracts/script-audit.ts'

/**
 * Script Audit IPC handlers
 *
 * 只保留纯计算、只读的审计能力。
 * executeScriptRepair 已迁移到 HTTP server。
 */
export function registerScriptAuditHandlers(): void {
  ipcMain.handle(
    'workflow:audit-script',
    (_event, input: AuditScriptInputDto): ScriptAuditReportDto => auditGeneratedScript(input)
  )

  ipcMain.handle(
    'workflow:build-script-repair-plan',
    (_event, input: AuditScriptInputDto): ScriptRepairPlanDto => buildScriptRepairPlan(input)
  )
}
