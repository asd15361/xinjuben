import { ipcRenderer } from 'electron'
import type { AppInfoDto } from '../../shared/contracts/system'

export const systemApi = {
  getAppInfo(): Promise<AppInfoDto> {
    return ipcRenderer.invoke('system:get-app-info')
  }
}
