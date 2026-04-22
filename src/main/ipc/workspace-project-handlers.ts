import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFile } from 'node:fs/promises'
import { getProject } from '../infrastructure/storage/project-store.ts'
import { buildProjectStageExportDraft } from '../application/workspace/export-project-stage-markdown.ts'
import type { ExportProjectStageMarkdownInputDto } from '../../shared/contracts/workspace.ts'

/**
 * workspace IPC handlers - 仅保留桌面壳能力
 *
 * 正式业务读写已全部迁移到 HTTP server routes
 * 这里只保留：
 * - exportProjectStageMarkdown（需要 Electron dialog API，桌面壳能力）
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
}
