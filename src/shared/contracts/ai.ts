export type ModelRouteLane = 'deepseek' | 'gemini_flash' | 'gemini_pro'

export interface AiProviderSummaryDto {
  configuredLanes: ModelRouteLane[]
  activeLanes: ModelRouteLane[]
  standbyLanes: ModelRouteLane[]
  defaultLane: ModelRouteLane | null
  runtimeFetchTimeoutMs: number
}

export type AiTaskKind =
  | 'decision_assist'
  | 'story_intake'
  | 'rough_outline'
  | 'character_profile'
  | 'detailed_outline'
  | 'episode_script'
  | 'episode_rewrite'
  | 'quality_audit'

export interface AiGenerateRequestDto {
  task: AiTaskKind
  prompt: string
  systemInstruction?: string
  preferredLane?: ModelRouteLane
  allowFallback?: boolean
  temperature?: number
  timeoutMs?: number
  runtimeHints?: {
    episode?: number
    totalEpisodes?: number
    estimatedContextTokens?: number
    strictness?: 'normal' | 'strict'
    hasP0Risk?: boolean
    hasHardAlignerRisk?: boolean
    isRewriteMode?: boolean
    recoveryMode?: 'fresh' | 'retry_parse' | 'retry_coverage' | 'retry_runtime'
  }
}

export interface AiGenerateResponseDto {
  text: string
  lane: ModelRouteLane
  model: string
  usedFallback: boolean
  routeReasonCodes?: string[]
}
