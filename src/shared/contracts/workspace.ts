import type { ProjectSnapshotDto, ProjectSummaryDto } from './project'
import type { ChatMessageDto } from './chat'
import type { ProjectGenerationStatusDto } from './generation'
import type { ScriptStateLedgerDto } from './script-ledger'
import type {
  ConfirmFormalFactInputDto,
  DeclareFormalFactInputDto,
  FormalFactElevationEvaluationDto,
  RemoveFormalFactInputDto,
  FormalFactValidationDto
} from './formal-fact'
import type {
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationProgressBoardDto,
  ScriptGenerationResumeResolutionDto
} from './script-generation'
import type { StoryIntentPackageDto } from './intake'
import type { CharacterDraftDto, DetailedOutlineSegmentDto, OutlineDraftDto, ScriptSegmentDto } from './workflow'

export interface CreateProjectResultDto {
  project: ProjectSnapshotDto
}

export interface WorkspaceListDto {
  projects: ProjectSummaryDto[]
}

export interface DeleteProjectInputDto {
  projectId: string
}

export interface DeleteProjectResultDto {
  ok: boolean
}

export interface SaveStoryIntentInputDto {
  projectId: string
  storyIntent: ProjectSnapshotDto['storyIntent']
}

export interface SaveChatMessagesInputDto {
  projectId: string
  chatMessages: ChatMessageDto[]
}

export interface SaveGenerationStatusInputDto {
  projectId: string
  generationStatus: ProjectGenerationStatusDto | null
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
  scriptResumeResolution: ScriptGenerationResumeResolutionDto | null
  scriptFailureResolution: ScriptGenerationFailureResolutionDto | null
  scriptStateLedger?: ScriptStateLedgerDto | null
}

export interface CreateOutlineSeedInputDto {
  projectId: string
}

export interface OutlineSeedDto {
  title: string
  genre: string
  protagonist: string
  mainConflict: string
  theme: string
  source: 'story_intent_seed'
}

export interface GenerateOutlineAndCharactersInputDto {
  projectId: string
  chatTranscript: string
}

export interface GenerateOutlineAndCharactersResultDto {
  project: ProjectSnapshotDto | null
  storyIntent: StoryIntentPackageDto | null
  outlineDraft: OutlineDraftDto | null
  characterDrafts: CharacterDraftDto[]
}

export interface GenerateDetailedOutlineInputDto {
  projectId: string
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  storyIntent?: StoryIntentPackageDto | null
}

export interface GenerateDetailedOutlineResultDto {
  project: ProjectSnapshotDto | null
  detailedOutlineSegments: DetailedOutlineSegmentDto[]
}

export interface DeclareFormalFactForProjectInputDto {
  projectId: string
  declaration: DeclareFormalFactInputDto
}

export interface DeclareFormalFactForProjectResultDto {
  project: ProjectSnapshotDto | null
}

export interface ConfirmFormalFactForProjectInputDto {
  projectId: string
  confirmation: ConfirmFormalFactInputDto
}

export interface ConfirmFormalFactForProjectResultDto {
  project: ProjectSnapshotDto | null
}

export interface RemoveFormalFactForProjectInputDto {
  projectId: string
  removal: RemoveFormalFactInputDto
}

export interface RemoveFormalFactForProjectResultDto {
  project: ProjectSnapshotDto | null
}

export interface ValidateFormalFactInputDto {
  description: string
  mainPlotContext: string
  theme: string
}

export interface EvaluateFormalFactElevationInputDto {
  formalFactLabel: string
  conflictText: string
  emotionText: string
  themeText: string
}

export interface ValidateFormalFactResultDto extends FormalFactValidationDto {}
export interface EvaluateFormalFactElevationResultDto extends FormalFactElevationEvaluationDto {}
