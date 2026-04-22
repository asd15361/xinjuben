import { ipcRenderer } from 'electron'
import type { ProjectGenerationStatusDto } from '../../shared/contracts/generation.ts'
import type {
  ExportProjectStageMarkdownInputDto,
  ExportProjectStageMarkdownResultDto
} from '../../shared/contracts/workspace.ts'

/**
 * workspace IPC API - 仅保留桌面壳能力
 *
 * 正式业务读写已全部迁移到 HTTP api-client
 * 这里只保留：
 * - 事件订阅（实时推送）
 * - 导出功能（桌面壳能力）
 */
export const workspaceApi = {
  /**
   * 生成状态更新事件订阅
   * 用于实时推送后台生成进度到前端
   */
  onGenerationStatusUpdated(
    listener: (payload: {
      projectId: string
      generationStatus: ProjectGenerationStatusDto | null
    }) => void
  ): () => void {
    const channel = 'workspace:generation-status-updated'
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { projectId: string; generationStatus: ProjectGenerationStatusDto | null }
    ): void => {
      listener(payload)
    }
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  },

  /**
   * 导出项目阶段为 Markdown
   * 桌面壳能力，不走 HTTP
   */
  exportProjectStageMarkdown(
    input: ExportProjectStageMarkdownInputDto
  ): Promise<ExportProjectStageMarkdownResultDto> {
    return ipcRenderer.invoke('workspace:export-project-stage-markdown', input)
  }
}
