import type { ChatMessageDto } from './chat'
import type { ProjectEntityStoreDto } from './entities'
import type { ProjectGenerationStatusDto } from './generation'
import type { StoryIntentPackageDto } from './intake'
import type { ScriptStateLedgerDto } from './script-ledger'
import type {
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationProgressBoardDto
} from './script-generation'
import type { FormalReleaseState, VisibleResultState } from './visible-release-state'
import type {
  CharacterBlockDto,
  CharacterDraftDto,
  DetailedOutlineBlockDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from './workflow'
import type { WorkflowStage } from './workflow'

export type AudienceLane = 'male' | 'female'

export type Subgenre =
  | '男频都市逆袭'
  | '男频玄幻修仙'
  | '男频历史军政'
  | '女频霸总甜宠'
  | '女频古言宅斗'
  | '女频现代逆袭'

export interface MarketProfileDto {
  audienceLane: AudienceLane
  subgenre: Subgenre
  audienceSubtype?: string
  primaryPayoffModel?: string
  relationshipPowerModel?: string
}

export interface ProjectSummaryDto {
  id: string
  name: string
  workflowType: 'ai_write' | 'novel_adapt'
  stage: WorkflowStage
  genre: string
  marketProfile: MarketProfileDto | null
  updatedAt: string
}

export interface ProjectCounts {
  chatMessages: number
  outlineEpisodes: number
  characters: number
  detailedOutlineBeats: number
  scriptSegments: number
}

export interface ProjectShellDto extends ProjectSummaryDto {
  generationTruth: VisibleResultState
  counts: ProjectCounts
}

export interface CreateProjectInputDto {
  name: string
  workflowType: 'ai_write' | 'novel_adapt'
  genre?: string
  marketProfile: MarketProfileDto
}

export interface ProjectSnapshotDto extends ProjectSummaryDto {
  chatMessages: ChatMessageDto[]
  generationStatus: ProjectGenerationStatusDto | null
  storyIntent: StoryIntentPackageDto | null
  entityStore: ProjectEntityStoreDto
  outlineDraft: OutlineDraftDto | null
  characterDrafts: CharacterDraftDto[]
  activeCharacterBlocks: CharacterBlockDto[]
  detailedOutlineBlocks: DetailedOutlineBlockDto[]
  detailedOutlineSegments: DetailedOutlineSegmentDto[]
  scriptDraft: ScriptSegmentDto[]
  scriptProgressBoard: ScriptGenerationProgressBoardDto | null
  scriptFailureResolution: ScriptGenerationFailureResolutionDto | null
  scriptRuntimeFailureHistory: string[]
  scriptStateLedger: ScriptStateLedgerDto | null
  visibleResult: VisibleResultState
  formalRelease: FormalReleaseState
}
