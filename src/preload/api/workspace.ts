import { ipcRenderer } from 'electron'
import type { CreateProjectInputDto, ProjectSnapshotDto } from '../../shared/contracts/project'
import type {
  CreateOutlineSeedInputDto,
  CreateProjectResultDto,
  DeleteProjectInputDto,
  DeleteProjectResultDto,
  GenerateDetailedOutlineInputDto,
  GenerateDetailedOutlineResultDto,
  OutlineSeedDto,
  GenerateOutlineAndCharactersInputDto,
  GenerateOutlineAndCharactersResultDto,
  SaveChatMessagesInputDto,
  SaveCharacterDraftsInputDto,
  SaveDetailedOutlineSegmentsInputDto,
  SaveGenerationStatusInputDto,
  SaveOutlineDraftInputDto,
  SaveScriptDraftInputDto,
  SaveScriptRuntimeStateInputDto,
  SaveStoryIntentInputDto,
  WorkspaceListDto
} from '../../shared/contracts/workspace'

export const workspaceApi = {
  listProjects(): Promise<WorkspaceListDto> {
    return ipcRenderer.invoke('workspace:list-projects')
  },
  createProject(input: CreateProjectInputDto): Promise<CreateProjectResultDto> {
    return ipcRenderer.invoke('workspace:create-project', input)
  },
  deleteProject(input: DeleteProjectInputDto): Promise<DeleteProjectResultDto> {
    return ipcRenderer.invoke('workspace:delete-project', input)
  },
  getProject(projectId: string): Promise<ProjectSnapshotDto | null> {
    return ipcRenderer.invoke('workspace:get-project', projectId)
  },
  saveStoryIntent(input: SaveStoryIntentInputDto): Promise<ProjectSnapshotDto | null> {
    return ipcRenderer.invoke('workspace:save-story-intent', input)
  },
  saveChatMessages(input: SaveChatMessagesInputDto): Promise<ProjectSnapshotDto | null> {
    return ipcRenderer.invoke('workspace:save-chat-messages', input)
  },
  saveGenerationStatus(input: SaveGenerationStatusInputDto): Promise<ProjectSnapshotDto | null> {
    return ipcRenderer.invoke('workspace:save-generation-status', input)
  },
  saveOutlineDraft(input: SaveOutlineDraftInputDto): Promise<ProjectSnapshotDto | null> {
    return ipcRenderer.invoke('workspace:save-outline-draft', input)
  },
  saveCharacterDrafts(input: SaveCharacterDraftsInputDto): Promise<ProjectSnapshotDto | null> {
    return ipcRenderer.invoke('workspace:save-character-drafts', input)
  },
  saveDetailedOutlineSegments(input: SaveDetailedOutlineSegmentsInputDto): Promise<ProjectSnapshotDto | null> {
    return ipcRenderer.invoke('workspace:save-detailed-outline-segments', input)
  },
  saveScriptDraft(input: SaveScriptDraftInputDto): Promise<ProjectSnapshotDto | null> {
    return ipcRenderer.invoke('workspace:save-script-draft', input)
  },
  saveScriptRuntimeState(input: SaveScriptRuntimeStateInputDto): Promise<ProjectSnapshotDto | null> {
    return ipcRenderer.invoke('workspace:save-script-runtime-state', input)
  },
  createOutlineSeed(input: CreateOutlineSeedInputDto): Promise<OutlineSeedDto | null> {
    return ipcRenderer.invoke('workspace:create-outline-seed', input)
  },
  generateOutlineAndCharacters(input: GenerateOutlineAndCharactersInputDto): Promise<GenerateOutlineAndCharactersResultDto> {
    return ipcRenderer.invoke('workspace:generate-outline-and-characters', input)
  },
  generateDetailedOutline(input: GenerateDetailedOutlineInputDto): Promise<GenerateDetailedOutlineResultDto> {
    return ipcRenderer.invoke('workspace:generate-detailed-outline', input)
  }
}
