import { ipcMain } from 'electron'
import {
  createProject,
  deleteProject,
  getProject,
  listProjects,
  saveChatMessages,
  saveCharacterDrafts,
  saveDetailedOutlineSegments,
  saveGenerationStatus,
  saveOutlineDraft,
  saveScriptDraft,
  saveScriptRuntimeState,
  saveStoryIntent
} from '../infrastructure/storage/project-store'
import type { CreateProjectInputDto } from '../../shared/contracts/project'
import type {
  DeleteProjectInputDto,
  SaveChatMessagesInputDto,
  SaveCharacterDraftsInputDto,
  SaveDetailedOutlineSegmentsInputDto,
  SaveGenerationStatusInputDto,
  SaveOutlineDraftInputDto,
  SaveScriptDraftInputDto,
  SaveScriptRuntimeStateInputDto,
  SaveStoryIntentInputDto
} from '../../shared/contracts/workspace'

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

  ipcMain.handle('workspace:get-project', async (_event, projectId: string) => getProject(projectId))
  ipcMain.handle('workspace:save-story-intent', async (_event, input: SaveStoryIntentInputDto) => saveStoryIntent(input))
  ipcMain.handle('workspace:save-chat-messages', async (_event, input: SaveChatMessagesInputDto) => saveChatMessages(input))
  ipcMain.handle('workspace:save-generation-status', async (_event, input: SaveGenerationStatusInputDto) => saveGenerationStatus(input))
  ipcMain.handle('workspace:save-outline-draft', async (_event, input: SaveOutlineDraftInputDto) => saveOutlineDraft(input))
  ipcMain.handle('workspace:save-character-drafts', async (_event, input: SaveCharacterDraftsInputDto) =>
    saveCharacterDrafts(input)
  )
  ipcMain.handle(
    'workspace:save-detailed-outline-segments',
    async (_event, input: SaveDetailedOutlineSegmentsInputDto) => saveDetailedOutlineSegments(input)
  )
  ipcMain.handle('workspace:save-script-draft', async (_event, input: SaveScriptDraftInputDto) => saveScriptDraft(input))
  ipcMain.handle(
    'workspace:save-script-runtime-state',
    async (_event, input: SaveScriptRuntimeStateInputDto) => saveScriptRuntimeState(input)
  )
}
