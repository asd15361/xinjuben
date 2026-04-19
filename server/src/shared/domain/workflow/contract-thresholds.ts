/**
 * contract-thresholds.ts
 *
 * Single authoritative source for all threshold constants used across the codebase.
 * All threshold values should be imported from this file - no hardcoding allowed.
 *
 * Threshold categories:
 * - Scene count: number of scenes per episode
 * - Word count: character/word count ranges for episodes and scenes
 * - Dialogue: dialogue line and round requirements
 * - Action: action line requirements
 * - Hook: hook window configuration
 * - Runtime: context and token limits for AI generation
 */

// =============================================================================
// SCENE COUNT THRESHOLDS
// =============================================================================

/** Number of scenes per episode - used for quality checks */
export const SCENE_COUNT_QUALITY = {
  min: 2,
  max: 4,
  label: '2-4场'
} as const

/** Number of scenes per episode - used for audit checks (stricter) */
export const SCENE_COUNT_AUDIT = {
  min: 1,
  max: 3,
  label: '1-3场'
} as const

/** Minimum scenes required for a valid episode */
export const SCENE_COUNT_MINIMUM = 2

// =============================================================================
// EPISODE WORD COUNT THRESHOLDS (character count)
// =============================================================================

/**
 * Episode character count contract — sceneCount-aware.
 *
 * 设计原则（2026-04-01 收口）：
 * - 正式合同固定为 800-1800
 * - 不再放宽合同去"适配现状"
 * - 当前集字数不达标时，必须重写当前集；当前集不过线，不继续往下写
 */
export const EPISODE_CHAR_COUNT = {
  min: (_sceneCount: number): number => {
    return 800
  },
  max: 1800
} as const

/** Minimum episode character count (正式下限 800) */
export const EPISODE_CHAR_COUNT_MIN = 800

/** Maximum episode character count (正式上限 1800) */
export const EPISODE_CHAR_COUNT_MAX = 1800

// =============================================================================
// SCENE LENGTH THRESHOLDS (for audit - short/long detection)
// =============================================================================

/** Scene length thresholds for audit - short scene detection */
export const SCENE_LENGTH_SHORT_THRESHOLD = 300

/** Scene length thresholds for audit - long scene detection */
export const SCENE_LENGTH_LONG_THRESHOLD = 900

// =============================================================================
// PER-SCENE REQUIREMENTS
// =============================================================================

/** Minimum dialogue lines per scene */
export const SCENE_DIALOGUE_LINE_MIN = 2

/** Minimum action lines per scene */
export const SCENE_ACTION_LINE_MIN = 2

/** Minimum meaningful content lines per scene */
export const SCENE_MEANINGFUL_LINE_MIN = 4

/** Minimum dialogue rounds per scene (for generation prompts) */
export const SCENE_DIALOGUE_ROUND_MIN = 3

// =============================================================================
// HOOK CONFIGURATION
// =============================================================================

/** Number of lines to inspect for hook detection at end of episode */
export const HOOK_WINDOW_SIZE = 5

// =============================================================================
// RUNTIME / CONTEXT THRESHOLDS
// =============================================================================

/** Maximum characters for story intent field */
export const MAX_STORY_INTENT_CHARS = 1200

/** Maximum characters per segment (normal mode) */
export const MAX_SEGMENT_CHARS = 900

/** Maximum characters per segment (when not compacting context) */
export const MAX_SEGMENT_CHARS_EXPANDED = 1500

/** Maximum characters per segment (after runtime failure) */
export const MAX_SEGMENT_CHARS_COMPACTED = 760

/** Outline length threshold for context pressure scoring */
export const OUTLINE_LENGTH_PRESSURE_THRESHOLD = 500

/** Maximum characters for distant history in prompts */
export const DISTANT_HISTORY_MAX_CHARS = 300

// =============================================================================
// AUDIT / REPAIR PENALTIES
// =============================================================================

/** Penalty applied when scene count is out of range (in repair guard) */
export const PENALTY_SCENE_COUNT_OUT_OF_RANGE = 1500

/** Penalty for missing character roster per scene */
export const PENALTY_ROSTER_MISSING = 600

/** Penalty for insufficient action lines per scene */
export const PENALTY_ACTION_INSUFFICIENT = 600

/** Penalty for insufficient dialogue lines per scene */
export const PENALTY_DIALOGUE_INSUFFICIENT = 600

// =============================================================================
// STATUS CHECK THRESHOLDS
// =============================================================================

/** Stale generation threshold in seconds (3x estimated, min 300) */
export const GENERATION_STALE_THRESHOLD_SECONDS = 300