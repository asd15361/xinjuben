import type { InputContractIssueDto } from './input-contract'
import type { ModelRouteLane } from './ai'
import type { StoryIntentPackageDto } from './intake'
import type { ScriptGenerationContractDto } from './script-generation-contract'
import type { ScriptLedgerPostflightDto, ScriptStateLedgerDto } from './script-ledger'
import type { CharacterDraftDto, DetailedOutlineSegmentDto, OutlineDraftDto, ScriptSegmentDto } from './workflow'

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
  board: ScriptGenerationProgressBoardDto
  eventId?: string
  lockRecoveryAttempted: boolean
}

export interface ScriptGenerationExecutionPlanDto {
  mode: ScriptGenerationMode
  ready: boolean
  blockedBy: InputContractIssueDto[]
  contract: ScriptGenerationContractDto
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
  plan: ScriptGenerationExecutionPlanDto
  outlineTitle: string
  theme: string
  mainConflict: string
  charactersSummary: string[]
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
  existingScript: ScriptSegmentDto[]
}

export interface StartScriptGenerationResultDto {
  success: boolean
  generatedScenes: Array<{
    sceneNo: number
    action: string
    dialogue: string
    emotion: string
  }>
  board: ScriptGenerationProgressBoardDto
  failure: ScriptGenerationFailureResolutionDto | null
  ledger: ScriptStateLedgerDto | null
  postflight: ScriptLedgerPostflightDto | null
}
