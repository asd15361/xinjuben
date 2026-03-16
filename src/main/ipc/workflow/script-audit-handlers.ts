import { ipcMain } from 'electron'
import { auditGeneratedScript } from '../../application/script-generation/audit/audit-generated-script'
import { buildScriptRepairPlan } from '../../application/script-generation/audit/build-script-repair-plan'
import { executeScriptRepair } from '../../application/script-generation/repair/execute-script-repair'
import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import type {
  AuditScriptInputDto,
  ExecuteScriptRepairInputDto,
  ExecuteScriptRepairResultDto,
  ScriptAuditReportDto,
  ScriptRepairPlanDto
} from '../../../shared/contracts/script-audit'

export function registerScriptAuditHandlers(runtimeProviderConfig: RuntimeProviderConfig): void {
  ipcMain.handle('workflow:audit-script', (_event, input: AuditScriptInputDto): ScriptAuditReportDto =>
    auditGeneratedScript(input)
  )

  ipcMain.handle('workflow:build-script-repair-plan', (_event, input: AuditScriptInputDto): ScriptRepairPlanDto =>
    buildScriptRepairPlan(input)
  )

  ipcMain.handle(
    'workflow:execute-script-repair',
    async (_event, input: ExecuteScriptRepairInputDto): Promise<ExecuteScriptRepairResultDto> =>
      executeScriptRepair(input, runtimeProviderConfig)
  )
}
