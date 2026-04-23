import { ipcRenderer } from 'electron'
import type { ProjectGenerationStatusDto } from '../../shared/contracts/generation.ts'
import type {
  ExportProjectStageMarkdownInputDto,
  ExportProjectStageMarkdownResultDto
} from '../../shared/contracts/workspace.ts'
import type {
  ScriptSegmentDto
} from '../../shared/contracts/workflow.ts'
import type {
  ScriptGenerationProgressBoardDto,
  ScriptGenerationFailureResolutionDto
} from '../../shared/contracts/script-generation.ts'
import type { ScriptStateLedgerDto } from '../../shared/contracts/script-ledger.ts'
import type { SaveScriptGenerationResultInputDto } from '../../shared/contracts/workspace.ts'

/**
 * workspace IPC API - 桌面壳能力 + 本地内容存储
 *
 * 正式业务读写已全部迁移到 HTTP api-client
 * 这里只保留：
 * - 事件订阅（实时推送）
 * - 导出功能（桌面壳能力）
 * - 本地内容存储（剧本正文、运行时状态，本地真相源）
 */

export type SaveScriptGenerationResultInput = SaveScriptGenerationResultInputDto

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
  },

  /**
   * 保存剧本生成结果到本地内容存储
   * 本地内容真相源，不走 PB
   */
  saveScriptGenerationResult(
    input: SaveScriptGenerationResultInput
  ): Promise<{ success: boolean }> {
    return ipcRenderer.invoke('workspace:save-script-generation-result', input)
  },

  /**
   * 读取本地项目内容
   */
  readLocalContent(userId: string, projectId: string): Promise<{
    scriptDraft: ScriptSegmentDto[] | null
    scriptProgressBoard: ScriptGenerationProgressBoardDto | null
    scriptFailureResolution: ScriptGenerationFailureResolutionDto | null
    scriptStateLedger: ScriptStateLedgerDto | null
  } | null> {
    return ipcRenderer.invoke('workspace:read-local-content', { userId, projectId })
  }
}
