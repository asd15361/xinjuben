import { ipcRenderer } from 'electron'
import type { CreateProjectInputDto, ProjectSnapshotDto } from '../../shared/contracts/project'
import type { ProjectGenerationStatusDto } from '../../shared/contracts/generation'
import type {
  ConfirmStoryIntentFromChatInputDto,
  ConfirmStoryIntentFromChatResultDto,
  CreateOutlineSeedInputDto,
  CreateProjectResultDto,
  DeleteProjectInputDto,
  DeleteProjectResultDto,
  ExportProjectStageMarkdownInputDto,
  ExportProjectStageMarkdownResultDto,
  GenerateDetailedOutlineInputDto,
  GenerateDetailedOutlineResultDto,
  OutlineSeedDto,
  LegacyGenerateOutlineAndCharactersBlockedInputDto,
  LegacyGenerateOutlineAndCharactersBlockedResultDto,
  GenerateSevenQuestionsDraftInputDto,
  GenerateSevenQuestionsDraftResultDto,
  SaveConfirmedSevenQuestionsInputDto,
  SaveConfirmedSevenQuestionsResultDto,
  GenerateOutlineAndCharactersFromConfirmedSevenQuestionsInputDto,
  GenerateOutlineAndCharactersFromConfirmedSevenQuestionsResultDto,
  SaveChatMessagesInputDto,
  SaveCharacterDraftsInputDto,
  SaveDetailedOutlineSegmentsInputDto,
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
  confirmStoryIntentFromChat(
    input: ConfirmStoryIntentFromChatInputDto
  ): Promise<ConfirmStoryIntentFromChatResultDto> {
    return ipcRenderer.invoke('workspace:confirm-story-intent-from-chat', input)
  },
  saveChatMessages(input: SaveChatMessagesInputDto): Promise<ProjectSnapshotDto | null> {
    return ipcRenderer.invoke('workspace:save-chat-messages', input)
  },
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
    ) => {
      listener(payload)
    }
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  },
  saveOutlineDraft(input: SaveOutlineDraftInputDto): Promise<ProjectSnapshotDto | null> {
    return ipcRenderer.invoke('workspace:save-outline-draft', input)
  },
  saveCharacterDrafts(input: SaveCharacterDraftsInputDto): Promise<ProjectSnapshotDto | null> {
    return ipcRenderer.invoke('workspace:save-character-drafts', input)
  },
  saveDetailedOutlineSegments(
    input: SaveDetailedOutlineSegmentsInputDto
  ): Promise<ProjectSnapshotDto | null> {
    return ipcRenderer.invoke('workspace:save-detailed-outline-segments', input)
  },
  saveScriptDraft(input: SaveScriptDraftInputDto): Promise<ProjectSnapshotDto | null> {
    return ipcRenderer.invoke('workspace:save-script-draft', input)
  },
  exportProjectStageMarkdown(
    input: ExportProjectStageMarkdownInputDto
  ): Promise<ExportProjectStageMarkdownResultDto> {
    return ipcRenderer.invoke('workspace:export-project-stage-markdown', input)
  },
  saveScriptRuntimeState(
    input: SaveScriptRuntimeStateInputDto
  ): Promise<ProjectSnapshotDto | null> {
    return ipcRenderer.invoke('workspace:save-script-runtime-state', input)
  },
  createOutlineSeed(input: CreateOutlineSeedInputDto): Promise<OutlineSeedDto | null> {
    return ipcRenderer.invoke('workspace:create-outline-seed', input)
  },
  generateOutlineAndCharactersLegacyBlocked(
    input: LegacyGenerateOutlineAndCharactersBlockedInputDto
  ): Promise<LegacyGenerateOutlineAndCharactersBlockedResultDto> {
    return ipcRenderer.invoke('workspace:generate-outline-and-characters', input)
  },
  generateDetailedOutline(
    input: GenerateDetailedOutlineInputDto
  ): Promise<GenerateDetailedOutlineResultDto> {
    return ipcRenderer.invoke('workspace:generate-detailed-outline', input)
  },
  generateSevenQuestionsDraft(
    input: GenerateSevenQuestionsDraftInputDto
  ): Promise<GenerateSevenQuestionsDraftResultDto> {
    return ipcRenderer.invoke('workspace:generate-seven-questions-draft', input)
  },
  saveConfirmedSevenQuestions(
    input: SaveConfirmedSevenQuestionsInputDto
  ): Promise<SaveConfirmedSevenQuestionsResultDto> {
    return ipcRenderer.invoke('workspace:save-confirmed-seven-questions', input)
  },
  generateOutlineAndCharactersFromConfirmedSevenQuestions(
    input: GenerateOutlineAndCharactersFromConfirmedSevenQuestionsInputDto
  ): Promise<GenerateOutlineAndCharactersFromConfirmedSevenQuestionsResultDto> {
    return ipcRenderer.invoke(
      'workspace:generate-outline-and-characters-from-confirmed-seven-questions',
      input
    )
  }
}
