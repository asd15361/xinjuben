import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { writeFile } from 'node:fs/promises'
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  saveChatMessages,
  saveCharacterDrafts,
  saveDetailedOutlineSegments,
  saveOutlineDraft,
  saveScriptDraft,
  saveScriptRuntimeState,
  saveStoryIntent
} from '../infrastructure/storage/project-store'
import { buildProjectStageExportDraft } from '../application/workspace/export-project-stage-markdown'
import type { CreateProjectInputDto } from '../../shared/contracts/project'
import type {
  DeleteProjectInputDto,
  ExportProjectStageMarkdownInputDto,
  SaveChatMessagesInputDto,
  SaveCharacterDraftsInputDto,
  SaveDetailedOutlineSegmentsInputDto,
  SaveOutlineDraftInputDto,
  SaveScriptDraftInputDto,
  SaveScriptRuntimeStateInputDto,
  SaveStoryIntentInputDto
} from '../../shared/contracts/workspace'
import { clearStaleGenerationStatusOnRead } from '../application/runtime/project-generation-status-hub'

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
  ipcMain.handle('workspace:list-projects', async () => ({
    projects: await listProjects()
  }))

  ipcMain.handle('workspace:create-project', async (_event, input: CreateProjectInputDto) => ({
    project: await createProject(input)
  }))

  ipcMain.handle('workspace:delete-project', async (_event, input: DeleteProjectInputDto) => ({
    ok: await deleteProject(input.projectId)
  }))

  ipcMain.handle('workspace:get-project', async (_event, projectId: string) => {
    // Auto-clear stale generationStatus on read (main-side hygiene, no broadcast)
    await clearStaleGenerationStatusOnRead(projectId)
    return getProject(projectId)
  })
  ipcMain.handle('workspace:save-story-intent', async (_event, input: SaveStoryIntentInputDto) =>
    saveStoryIntent(input)
  )
  ipcMain.handle('workspace:save-chat-messages', async (_event, input: SaveChatMessagesInputDto) =>
    saveChatMessages(input)
  )
  ipcMain.handle('workspace:save-outline-draft', async (_event, input: SaveOutlineDraftInputDto) =>
    saveOutlineDraft(input)
  )
  ipcMain.handle(
    'workspace:save-character-drafts',
    async (_event, input: SaveCharacterDraftsInputDto) => saveCharacterDrafts(input)
  )
  ipcMain.handle(
    'workspace:save-detailed-outline-segments',
    async (_event, input: SaveDetailedOutlineSegmentsInputDto) => saveDetailedOutlineSegments(input)
  )
  ipcMain.handle('workspace:save-script-draft', async (_event, input: SaveScriptDraftInputDto) =>
    saveScriptDraft(input)
  )
  ipcMain.handle(
    'workspace:save-script-runtime-state',
    async (_event, input: SaveScriptRuntimeStateInputDto) => saveScriptRuntimeState(input)
  )
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
