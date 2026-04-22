export type ModelRouteLane =
  | 'deepseek'
  | 'openrouter_gemini_flash_lite'
  | 'openrouter_qwen_free'
  | 'openrouter'

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
  | 'short_drama_showrunner'
  | 'faction_matrix'
  | 'rough_outline'
  | 'character_profile'
  | 'character_profile_simple'
  | 'episode_summary'
  | 'detailed_outline'
  | 'episode_control'
  | 'seven_questions'
  | 'episode_script'
  | 'episode_rewrite'
  | 'quality_audit'
  | 'general'

export interface AiGenerateRequestDto {
  task: AiTaskKind
  prompt: string
  systemInstruction?: string
  preferredLane?: ModelRouteLane
  allowFallback?: boolean
  responseFormat?: 'text' | 'json_object'
  temperature?: number
  timeoutMs?: number
  maxOutputTokens?: number
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
  finishReason?: string
  routeReasonCodes?: string[]
  inputTokens?: number
  outputTokens?: number
  durationMs?: number
}
