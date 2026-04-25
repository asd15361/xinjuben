import type { InputContractIssueDto } from './input-contract'
import type { ModelRouteLane } from './ai'
import type { ProjectEntityStoreDto } from './entities'
import type { MarketPlaybookDto, MarketPlaybookSelectionDto } from './market-playbook'
import type { ShortDramaConstitutionDto, StoryIntentPackageDto } from './intake'
import type { ScriptLedgerPostflightDto, ScriptStateLedgerDto } from './script-ledger'
import type {
  CharacterBlockDto,
  CharacterDraftDto,
  DetailedOutlineBlockDto,
  DetailedOutlineSegmentDto,
  EpisodeControlCardDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from './workflow'

export type ScriptGenerationMode = 'fresh_start' | 'resume' | 'rewrite'
export type ScriptBatchStatus = 'idle' | 'running' | 'paused' | 'failed' | 'completed'
export type ScriptEpisodeRuntimeStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped'
export type ScriptFailureKind = 'retry' | 'stopped' | 'failed'
export type ScriptRuntimeFailureHistoryCode =
  | 'runtime_interrupted'
  | 'parse_interrupted'
  | 'draft_coverage_insufficient'

export interface ScriptGenerationEpisodePlanDto {
  episodeNo: number
  status: 'pending' | 'ready' | 'blocked'
  lane: ModelRouteLane
  reason: string
  runtimeHints?: {
    episode: number
    totalEpisodes: number
    estimatedContextTokens: number
    strictness: 'normal' | 'strict'
    hasP0Risk: boolean
    hasHardAlignerRisk: boolean
    isRewriteMode: boolean
    recoveryMode: 'fresh' | 'retry_parse' | 'retry_coverage' | 'retry_runtime'
  }
}

export interface ScriptEpisodeStatusDto {
  episodeNo: number
  status: ScriptEpisodeRuntimeStatus
  batchIndex: number
  reason: string
}

export interface ScriptBatchContextDto {
  batchSize: number
  currentBatchIndex: number
  startEpisode: number
  endEpisode: number
  status: ScriptBatchStatus
  resumeFromEpisode: number | null
  reason: string
  stageContractFingerprint: string | null
  updatedAt: string
}

export interface ScriptGenerationProgressBoardDto {
  episodeStatuses: ScriptEpisodeStatusDto[]
  batchContext: ScriptBatchContextDto
}

export interface ScriptGenerationResumeResolutionDto {
  canResume: boolean
  resumeEpisode: number | null
  nextBatchStatus: Extract<ScriptBatchStatus, 'paused' | 'failed' | 'idle' | 'completed'>
  reason: string
}

export interface ScriptGenerationFailureResolutionDto {
  kind: ScriptFailureKind
  reason: string
  errorMessage?: string
  eventId?: string
  lockRecoveryAttempted: boolean
}

export interface ScriptEpisodeHardIssueDto {
  code: string
  detail: string
}

export interface ScriptEpisodeControlPlanDto {
  episodeNo: number
  episodeControlCard: EpisodeControlCardDto | null
}

export interface ScriptGenerationControlPackageDto {
  shortDramaConstitution: ShortDramaConstitutionDto | null
  episodeControlPlans: ScriptEpisodeControlPlanDto[]
}

export interface ScriptGenerationContractDto {
  ready: boolean
  targetEpisodes: number
  structuralActs: string[]
  missingActs: string[]
  confirmedFormalFacts: string[]
  missingFormalFactLandings: string[]
  storyContract: unknown
  userAnchorLedger: unknown
  missingAnchorNames: string[]
  heroineAnchorCovered: boolean
}

export interface ScriptGenerationExecutionPlanDto {
  mode: ScriptGenerationMode
  ready: boolean
  blockedBy: InputContractIssueDto[]
  contract: ScriptGenerationContractDto
  scriptControlPackage?: ScriptGenerationControlPackageDto
  targetEpisodes: number
  existingSceneCount: number
  recommendedPrimaryLane: ModelRouteLane
  recommendedFallbackLane: ModelRouteLane
  runtimeProfile: {
    contextPressureScore: number
    shouldCompactContextFirst: boolean
    maxStoryIntentChars: number
    maxCharacterChars: number
    maxSegmentChars: number
    recommendedBatchSize: number
    profileLabel: string
    reason: string
  }
  episodePlans: ScriptGenerationEpisodePlanDto[]
}

export interface BuildScriptGenerationPlanInputDto {
  mode?: ScriptGenerationMode
  targetEpisodes?: number
  runtimeFailureHistory?: ScriptRuntimeFailureHistoryCode[]
}

export interface StartScriptGenerationInputDto {
  projectId?: string
  plan: ScriptGenerationExecutionPlanDto
  outlineTitle: string
  theme: string
  mainConflict: string
  charactersSummary: string[]
  storyIntent?: StoryIntentPackageDto | null
  scriptControlPackage?: ScriptGenerationControlPackageDto
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  entityStore?: ProjectEntityStoreDto
  activeCharacterBlocks?: CharacterBlockDto[]
  segments?: DetailedOutlineSegmentDto[]
  detailedOutlineBlocks?: DetailedOutlineBlockDto[]
  existingScript: ScriptSegmentDto[]
  marketPlaybookSelection?: MarketPlaybookSelectionDto | null
  customMarketPlaybooks?: MarketPlaybookDto[]
}

export interface StartScriptGenerationResultDto {
  success: boolean
  generatedScenes: ScriptSegmentDto[]
  board: ScriptGenerationProgressBoardDto
  failure: ScriptGenerationFailureResolutionDto | null
  ledger: ScriptStateLedgerDto | null
  postflight: ScriptLedgerPostflightDto | null
}

export interface RewriteScriptEpisodeInputDto {
  episodeNo: number
  plan: ScriptGenerationExecutionPlanDto
  outlineTitle: string
  theme: string
  mainConflict: string
  charactersSummary: string[]
  storyIntent?: StoryIntentPackageDto | null
  scriptControlPackage?: ScriptGenerationControlPackageDto
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  entityStore?: ProjectEntityStoreDto
  activeCharacterBlocks?: CharacterBlockDto[]
  segments?: DetailedOutlineSegmentDto[]
  existingScript: ScriptSegmentDto[]
}

export interface RewriteScriptEpisodeResultDto {
  scene: ScriptSegmentDto
  failures: ScriptEpisodeHardIssueDto[]
}

export interface PersistedScriptRuntimeStateDto {
  scriptProgressBoard: ScriptGenerationProgressBoardDto | null
  scriptFailureResolution: ScriptGenerationFailureResolutionDto | null
  scriptRuntimeFailureHistory: ScriptRuntimeFailureHistoryCode[]
  scriptStateLedger: ScriptStateLedgerDto | null
  scriptPostflight?: ScriptLedgerPostflightDto | null
}
