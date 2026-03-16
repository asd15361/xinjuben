import { ElectronAPI } from '@electron-toolkit/preload'
import type { aiApi } from './api/ai'
import type { systemApi } from './api/system'
import type { workspaceApi } from './api/workspace'
import type { workflowApi } from './api/workflow'

export interface AppApi {
  ai: typeof aiApi
  system: typeof systemApi
  workspace: typeof workspaceApi
  workflow: typeof workflowApi
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: AppApi
  }
}
