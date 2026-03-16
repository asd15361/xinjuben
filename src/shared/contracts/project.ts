import type { ChatMessageDto } from './chat'
import type { ProjectGenerationStatusDto } from './generation'
import type { StoryIntentPackageDto } from './intake'
import type { ScriptStateLedgerDto } from './script-ledger'
import type { ScriptGenerationFailureResolutionDto, ScriptGenerationProgressBoardDto, ScriptGenerationResumeResolutionDto } from './script-generation'
import type { CharacterDraftDto, DetailedOutlineSegmentDto, OutlineDraftDto, ScriptSegmentDto } from './workflow'
import type { WorkflowStage } from './workflow'

export interface ProjectSummaryDto {
  id: string
  name: string
  workflowType: 'ai_write' | 'novel_adapt'
  stage: WorkflowStage
  genre: string
  updatedAt: string
}

export interface CreateProjectInputDto {
  name: string
  workflowType: 'ai_write' | 'novel_adapt'
  genre?: string
}

export interface ProjectSnapshotDto extends ProjectSummaryDto {
  chatMessages: ChatMessageDto[]
  generationStatus: ProjectGenerationStatusDto | null
  storyIntent: StoryIntentPackageDto | null
  outlineDraft: OutlineDraftDto | null
  characterDrafts: CharacterDraftDto[]
  detailedOutlineSegments: DetailedOutlineSegmentDto[]
  scriptDraft: ScriptSegmentDto[]
  scriptProgressBoard: ScriptGenerationProgressBoardDto | null
  scriptResumeResolution: ScriptGenerationResumeResolutionDto | null
  scriptFailureResolution: ScriptGenerationFailureResolutionDto | null
  scriptStateLedger: ScriptStateLedgerDto | null
}
