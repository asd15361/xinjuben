import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { aiApi } from './api/ai.ts'
import { systemApi } from './api/system.ts'
import { workspaceApi } from './api/workspace.ts'
import { workflowApi } from './api/workflow.ts'

/**
 * preload API - 桌面壳能力 + 运行时控制
 *
 * 分类说明：
 * - ai: AI Provider 信息查询（非正式业务）
 * - system: 系统信息、诊断日志（桌面壳能力）
 * - workspace: 事件订阅、导出功能（桌面壳能力）
 * - workflow: 运行时控制、合同校验、审计修复（非正式业务主链）
 *
 * 正式业务读写全部走 HTTP api-client，不经过这里
 */
const api = {
  ai: aiApi,
  system: systemApi,
  workspace: workspaceApi,
  workflow: workflowApi
}

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
