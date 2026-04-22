import { ipcMain } from 'electron'
import { validateFormalFactDefinition } from '../../../shared/domain/formal-fact/definition-engine.ts'

/**
 * Input Contract IPC handlers
 *
 * 只保留纯计算、只读的校验能力。
 * validateStageInputContract 已迁移到 HTTP server。
 */
export function registerInputContractHandlers(): void {
  ipcMain.handle(
    'workflow:validate-formal-fact',
    (_event, input: { factDesc: string; mainPlotContext: string; theme: string }) =>
      validateFormalFactDefinition(input.factDesc, input.mainPlotContext, input.theme)
  )
}
