import { ipcMain } from 'electron'
import { WORKFLOW_STAGES } from '../../shared/contracts/workflow.ts'
import {
  appendRuntimeDiagnosticLog,
  getRuntimeDiagnosticLogPath
} from '../infrastructure/diagnostics/runtime-diagnostic-log.ts'

export function registerSystemHandlers(getVersion: () => string): void {
  ipcMain.on('ping', () => {
    void appendRuntimeDiagnosticLog('main', 'ipc ping received')
    console.log('pong')
  })

  ipcMain.handle('system:get-app-info', () => ({
    name: 'XINJUBEN',
    version: getVersion(),
    stageOptions: [...WORKFLOW_STAGES],
    diagnosticLogPath: getRuntimeDiagnosticLogPath()
  }))

  ipcMain.handle(
    'system:append-diagnostic-log',
    async (_, payload: { source: string; message: string }) => {
      await appendRuntimeDiagnosticLog(payload.source, payload.message)
    }
  )
}
