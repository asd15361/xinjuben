import { ipcMain } from 'electron'
import { WORKFLOW_STAGES } from '../../shared/contracts/workflow'

export function registerSystemHandlers(getVersion: () => string): void {
  ipcMain.on('ping', () => console.log('pong'))

  ipcMain.handle('system:get-app-info', () => ({
    name: 'XINJUBEN',
    version: getVersion(),
    stageOptions: [...WORKFLOW_STAGES]
  }))
}
