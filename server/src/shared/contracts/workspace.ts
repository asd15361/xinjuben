import type { ProjectSnapshotDto, ProjectSummaryDto } from './project'
import type { ChatMessageDto } from './chat'
import type { ScriptStateLedgerDto } from './script-ledger'
import type {
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationProgressBoardDto
} from './script-generation'
import type { ProjectEntityStoreDto } from './entities'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto,
  SevenQuestionsResultDto
} from './workflow'

export interface CreateProjectResultDto {
  project: ProjectSnapshotDto
}

export interface WorkspaceListDto {
  projects: ProjectSummaryDto[]
}

export interface SaveStoryIntentInputDto {
  projectId: string
  storyIntent: ProjectSnapshotDto['storyIntent']
  entityStore?: ProjectEntityStoreDto | null
}

export interface SaveChatMessagesInputDto {
  projectId: string
  chatMessages: ChatMessageDto[]
}

export interface SaveOutlineDraftInputDto {
  projectId: string
  outlineDraft: OutlineDraftDto
}

export interface SaveCharacterDraftsInputDto {
  projectId: string
  characterDrafts: CharacterDraftDto[]
}

export interface SaveDetailedOutlineSegmentsInputDto {
  projectId: string
  detailedOutlineSegments: DetailedOutlineSegmentDto[]
}

export interface SaveScriptDraftInputDto {
  projectId: string
  scriptDraft: ScriptSegmentDto[]
}

export interface SaveScriptRuntimeStateInputDto {
  projectId: string
  scriptProgressBoard: ScriptGenerationProgressBoardDto | null
  scriptFailureResolution: ScriptGenerationFailureResolutionDto | null
  scriptRuntimeFailureHistory?: string[]
  scriptStateLedger?: ScriptStateLedgerDto | null
}

export interface SaveConfirmedSevenQuestionsInputDto {
  projectId: string
  sevenQuestions: SevenQuestionsResultDto
}
