import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFile } from 'node:fs/promises'
import { getProject } from '../infrastructure/storage/project-store.ts'
import {
  saveScriptGenerationResult,
  readLocalContent
} from '../infrastructure/storage/local-content-store.ts'
import { buildProjectStageExportDraft } from '../application/workspace/export-project-stage-markdown.ts'
import type { ExportProjectStageMarkdownInputDto, SaveScriptGenerationResultInputDto } from '../../shared/contracts/workspace.ts'

/**
 * workspace IPC handlers - 桌面壳能力 + 本地内容存储
 *
 * 正式业务读写已全部迁移到 HTTP server routes
 * 这里保留：
 * - exportProjectStageMarkdown（需要 Electron dialog API，桌面壳能力）
 * - saveScriptGenerationResult（本地内容真相源，不写 PB）
 * - readLocalContent（本地内容真相源读取）
 */

function stageLabel(stage: ExportProjectStageMarkdownInputDto['stage']): string {
  switch (stage) {
    case 'outline':
      return '粗略大纲'
    case 'character':
      return '人物小传'
    case 'detailed_outline':
      return '详细大纲'
    case 'script':
      return '剧本'
  }
}

export function registerWorkspaceProjectHandlers(): void {
  ipcMain.handle(
    'workspace:export-project-stage-markdown',
    async (event, input: ExportProjectStageMarkdownInputDto) => {
      const project = await getProject(input.projectId)
      if (!project) {
        throw new Error(`export_project_missing:${input.projectId}`)
      }

      const ownerWindow = BrowserWindow.fromWebContents(event.sender) ?? undefined
      const draft = buildProjectStageExportDraft(project, input.stage, app)
      const saveDialogOptions = {
        title: `下载${stageLabel(input.stage)}`,
        defaultPath: draft.defaultPath,
        filters: [{ name: 'Markdown', extensions: ['md'] }]
      }
      const saveResult = ownerWindow
        ? await dialog.showSaveDialog(ownerWindow, saveDialogOptions)
        : await dialog.showSaveDialog(saveDialogOptions)

      if (saveResult.canceled || !saveResult.filePath) {
        return { saved: false, filePath: null }
      }

      await writeFile(saveResult.filePath, draft.content, 'utf8')
      return { saved: true, filePath: saveResult.filePath }
    }
  )

  // 本地内容真相源：保存剧本生成结果（不写 PB）
  ipcMain.handle(
    'workspace:save-script-generation-result',
    async (_event, input: SaveScriptGenerationResultInputDto) => {
      await saveScriptGenerationResult(input.userId, input.projectId, {
        scriptDraft: input.scriptDraft,
        scriptProgressBoard: input.scriptProgressBoard,
        scriptFailureResolution: input.scriptFailureResolution,
        scriptStateLedger: input.scriptStateLedger,
        scriptRuntimeFailureHistory: input.scriptRuntimeFailureHistory ?? []
      })
      return { success: true }
    }
  )

  // 本地内容真相源：读取项目内容
  ipcMain.handle(
    'workspace:read-local-content',
    async (_event, input: { userId: string; projectId: string }) => {
      const content = await readLocalContent(input.userId, input.projectId)
      if (!content) return null
      return {
        scriptDraft: content.scriptDraft,
        scriptProgressBoard: content.scriptProgressBoard,
        scriptFailureResolution: content.scriptFailureResolution,
        scriptStateLedger: content.scriptStateLedger
      }
    }
  )
}
