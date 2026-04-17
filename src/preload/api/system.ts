import { ipcRenderer } from 'electron'
import type { AppInfoDto } from '../../shared/contracts/system'

export const systemApi = {
  getAppInfo(): Promise<AppInfoDto> {
    return ipcRenderer.invoke('system:get-app-info')
  },
  appendDiagnosticLog(input: { source: string; message: string }): Promise<void> {
    return ipcRenderer.invoke('system:append-diagnostic-log', input)
  }
}
