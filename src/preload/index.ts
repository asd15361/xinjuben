import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { aiApi } from './api/ai'
import { systemApi } from './api/system'
import { workspaceApi } from './api/workspace'
import { workflowApi } from './api/workflow'

// Custom APIs for renderer
const api = {
  ai: aiApi,
  system: systemApi,
  workspace: workspaceApi,
  workflow: workflowApi
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    console.log('[preload] api injected')
    void api.system.appendDiagnosticLog({ source: 'preload', message: 'api injected' })
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
