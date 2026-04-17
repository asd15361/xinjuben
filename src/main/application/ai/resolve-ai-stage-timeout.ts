import type { AiGenerateRequestDto } from '../../../shared/contracts/ai'

function readTimeoutOverride(key: string, fallback: number): number {
  const raw = process.env[key]
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const DEFAULT_AI_TIMEOUT_MS = 45_000
const STORY_INTAKE_TIMEOUT_MS = readTimeoutOverride('AI_TIMEOUT_STORY_INTAKE_MS', 60_000)
const SHORT_DRAMA_SHOWRUNNER_TIMEOUT_MS = readTimeoutOverride(
  'AI_TIMEOUT_SHORT_DRAMA_SHOWRUNNER_MS',
  60_000
)
const FACTION_MATRIX_TIMEOUT_MS = readTimeoutOverride('AI_TIMEOUT_FACTION_MATRIX_MS', 300_000)
const ROUGH_OUTLINE_TIMEOUT_MS = readTimeoutOverride('AI_TIMEOUT_ROUGH_OUTLINE_MS', 90_000)
const CHARACTER_PROFILE_TIMEOUT_MS = readTimeoutOverride('AI_TIMEOUT_CHARACTER_PROFILE_MS', 90_000)
const DETAILED_OUTLINE_TIMEOUT_MS = readTimeoutOverride('AI_TIMEOUT_DETAILED_OUTLINE_MS', 300_000)
const EPISODE_CONTROL_TIMEOUT_MS = readTimeoutOverride('AI_TIMEOUT_EPISODE_CONTROL_MS', 90_000)
const EPISODE_SCRIPT_TIMEOUT_MS = readTimeoutOverride('AI_TIMEOUT_EPISODE_SCRIPT_MS', 120_000)
const EPISODE_REWRITE_TIMEOUT_MS = readTimeoutOverride('AI_TIMEOUT_EPISODE_REWRITE_MS', 120_000)

export function resolveAiStageTimeoutMs(
  task: AiGenerateRequestDto['task'],
  runtimeHints?: AiGenerateRequestDto['runtimeHints']
): number {
  if (task === 'story_intake') {
    return STORY_INTAKE_TIMEOUT_MS
  }

  if (task === 'short_drama_showrunner') {
    return SHORT_DRAMA_SHOWRUNNER_TIMEOUT_MS
  }

  if (task === 'faction_matrix') {
    return FACTION_MATRIX_TIMEOUT_MS
  }

  if (task === 'rough_outline') {
    return ROUGH_OUTLINE_TIMEOUT_MS
  }

  if (task === 'character_profile') {
    return CHARACTER_PROFILE_TIMEOUT_MS
  }

  if (task === 'episode_script') {
    if (runtimeHints?.recoveryMode === 'retry_runtime') return 150_000
    return EPISODE_SCRIPT_TIMEOUT_MS
  }

  if (task === 'episode_rewrite') {
    return EPISODE_REWRITE_TIMEOUT_MS
  }

  if (task === 'detailed_outline') {
    return DETAILED_OUTLINE_TIMEOUT_MS
  }

  if (task === 'episode_control') {
    return EPISODE_CONTROL_TIMEOUT_MS
  }

  return DEFAULT_AI_TIMEOUT_MS
}
