import { ElectronAPI } from '@electron-toolkit/preload'
import type { aiApi } from './api/ai.ts'
import type { systemApi } from './api/system.ts'
import type { workspaceApi } from './api/workspace.ts'
import type { workflowApi } from './api/workflow.ts'

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
