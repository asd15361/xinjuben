/**
 * visible-release-state.ts — Formal Contract for Visible Result vs Formal Release Separation
 *
 * PURPOSE (T12 First Slice):
 * Establish explicit first-class types for the two-state model so the project
 * no longer relies only on implicit combinations like:
 *   - generationNotice + failurePreview + generationPlan.ready
 *
 * SEMANTIC DISTINCTION:
 * - visibleResult: user can see and analyze current result (success or failure)
 *   regardless of formal gate status
 * - formalRelease: official gate status — requires independent conditions,
 *   NOT automatically granted when visibleResult exists
 *
 * CONTEXT:
 * - Part of "失败结果可见但正式联动受阻的双轨机制" (T12)
 * - Separates "运行草稿 / 可见草稿 / 待确认 / 正式放行" four tiers
 * - Aligns with truth-owner-matrix.ts domains: visibleResult (T1) and formalRelease (T1)
 *
 * USAGE:
 * - Producer (MAIN) produces both states after generation completes
 * - Consumers (RENDERER) read both states independently
 * - visibleResult can be 'visible' or 'failed' while formalRelease is still 'blocked'
 *
 * NOT IN THIS SLICE:
 * - Full UI migration (deferred to later T12 UI adoption work)
 * - Changes to persistence layer
 * - Changes to IPC handlers
 */

import type { ScriptSegmentDto } from './workflow'
import type { ScriptGenerationFailureResolutionDto } from './script-generation'

// =============================================================================
// VISIBLE RESULT STATUS
// =============================================================================

/**
 * Visible result status — whether a result exists and is displayable.
 *
 * - none:        No result generated yet
 * - pending:     Generation in progress, no usable result yet
 * - visible:     Result exists and is displayable (may be success or partial)
 * - failed:       Generation failed but failure is visible/analysable
 *
 * KEY INVARIANT: visible can exist independently of formalRelease status.
 * A failed result can be 'visible' for analysis while formalRelease remains 'blocked'.
 */
export type VisibleResultStatus = 'none' | 'pending' | 'visible' | 'failed'

// =============================================================================
// FORMAL RELEASE STATUS
// =============================================================================

/**
 * Formal release gate status — whether the result has passed official gates.
 *
 * - blocked:     Gate conditions not met; result exists but not officially released
 * - pending:     Gate evaluation in progress
 * - released:    All gate conditions passed; result is officially released
 *
 * KEY INVARIANT: released is NEVER granted solely because visibleResult exists.
 * formalRelease requires independent gate condition checks.
 */
export type FormalReleaseStatus = 'blocked' | 'pending' | 'released'

// =============================================================================
// VISIBLE RESULT STATE
// =============================================================================

/**
 * Visible result state — represents a displayable result regardless of gate status.
 *
 * This type captures the "可见草稿" tier: the user can see and analyze
 * the current result even when formal gates have not passed.
 *
 * Produced by: MAIN (per truth-owner-matrix.ts)
 * Consumed by: RENDERER (display only, per truth-owner-matrix.ts)
 */
export interface VisibleResultState {
  /** Current status of the visible result */
  status: VisibleResultStatus

  /** Human-readable description of current status */
  description: string

  /**
   * The actual result payload when status is 'visible'.
   * Null when status is 'none', 'pending', or 'failed'.
   *
   * NOTE: For script generation, this contains the generated scenes.
   * The failure case is captured in failureResolution instead.
   */
  payload: ScriptSegmentDto[] | null

  /**
   * Failure information when status is 'failed'.
   * Null when status is not 'failed'.
   *
   * This allows users to see WHY generation failed and analyze the failure,
   * even though formalRelease remains 'blocked'.
   */
  failureResolution: ScriptGenerationFailureResolutionDto | null

  /** Timestamp when this visible result was last updated */
  updatedAt: string
}

// =============================================================================
// FORMAL RELEASE STATE
// =============================================================================

/**
 * Formal release gate state — represents official gate status.
 *
 * This type captures the "待确认 / 正式放行" tiers: whether the result
 * has passed all official gate conditions and is ready for downstream use.
 *
 * Produced by: MAIN (per truth-owner-matrix.ts)
 * Consumed by: RENDERER (display only, per truth-owner-matrix.ts)
 */
export interface FormalReleaseState {
  /** Current status of the formal release gate */
  status: FormalReleaseStatus

  /** Human-readable description of current gate status */
  description: string

  /**
   * List of gate conditions that are blocking release.
   * Non-empty only when status is 'blocked'.
   */
  blockedBy: FormalReleaseBlockReason[]

  /** Timestamp when formal release was last evaluated */
  evaluatedAt: string
}

/**
 * Reason why formal release is blocked.
 */
export interface FormalReleaseBlockReason {
  /** Machine-readable reason code */
  code: FormalReleaseBlockCode

  /** Human-readable explanation */
  message: string

  /**
   * Which gate category this belongs to.
   * Used for display grouping and user guidance.
   */
  category: 'contract' | 'quality' | 'process' | 'persistence'
}

/**
 * Machine-readable formal release block codes.
 *
 * These represent the independent gate conditions that must ALL pass
 * before formalRelease can transition to 'released'.
 *
 * IMPORTANT: These are INDEPENDENT of visibleResult status.
 * A visible result can exist while these gates are still being evaluated.
 */
export type FormalReleaseBlockCode =
  /** Contract validation has not passed */
  | 'CONTRACT_NOT_VALIDATED'
  /** Quality gates have not passed */
  | 'QUALITY_NOT_PASSED'
  /** Required upstream stage not complete */
  | 'UPSTREAM_INCOMPLETE'
  /** Process boundary guardian blocked the release */
  | 'BOUNDARY_GUARDIAN_BLOCKED'
  /** Ledger state not confirmed */
  | 'LEDGER_NOT_CONFIRMED'
  /** Formal facts not confirmed */
  | 'FACTS_NOT_CONFIRMED'
  /** Persistence layer not synchronized */
  | 'PERSISTENCE_NOT_SYNCED'
  /** Generation still in progress */
  | 'GENERATION_IN_PROGRESS'
  /** Manual hold by user */
  | 'MANUAL_HOLD'
  /** Unknown/blocked for unspecified reason */
  | 'UNKNOWN_BLOCKED'

// =============================================================================
// COMBINED GENERATION RESULT STATE
// =============================================================================

/**
 * Combined generation result state — exposes both visibleResult and formalRelease.
 *
 * This is the canonical shape returned by generation operations that support
 * the dual-state model. It allows consumers to understand:
 *   1. What the user can see (visibleResult)
 *   2. What the official gate status is (formalRelease)
 *
 * The two states are INDEPENDENT — visibleResult existing does NOT imply
 * formalRelease passing, and vice versa.
 */
export interface GenerationResultState {
  /**
   * The visible result — what the user can see and analyze.
   * Can exist independently of formalRelease status.
   */
  visibleResult: VisibleResultState

  /**
   * The formal release status — official gate status.
   * Requires independent conditions, NOT automatic when visibleResult exists.
   */
  formalRelease: FormalReleaseState

  /**
   * Convenience flag: true when visible result is ready for display.
   * This does NOT imply formal release has passed.
   *
   * Use this for UI decisions about whether to show result viewer.
   * For formal progression decisions, check formalRelease.status === 'released'.
   */
  isVisible: boolean

  /**
   * Convenience flag: true when formal release has passed.
   * This is the gate for downstream operations (e.g., next stage progression).
   *
   * IMPORTANT: A failed visibleResult can still have formalRelease.status === 'released'
   * if the failure was expected/acceptable per gate policy.
   */
  isReleased: boolean
}

// =============================================================================
// FACTORY HELPERS (for runtime use by MAIN producer)
// =============================================================================

/**
 * Creates an initial VisibleResultState with 'none' status.
 * Used when no generation has started yet.
 */
export function createInitialVisibleResult(): VisibleResultState {
  return {
    status: 'none',
    description: 'No generation result yet',
    payload: null,
    failureResolution: null,
    updatedAt: new Date().toISOString()
  }
}

/**
 * Creates a VisibleResultState with 'visible' status from generated segments.
 */
export function createVisibleSuccessState(
  payload: ScriptSegmentDto[],
  description = 'Generation completed successfully'
): VisibleResultState {
  return {
    status: 'visible',
    description,
    payload,
    failureResolution: null,
    updatedAt: new Date().toISOString()
  }
}

/**
 * Creates a VisibleResultState with 'failed' status from failure resolution.
 * The failure is VISIBLE for analysis even though formalRelease will be blocked.
 */
export function createVisibleFailureState(
  failureResolution: ScriptGenerationFailureResolutionDto,
  description = 'Generation failed'
): VisibleResultState {
  return {
    status: 'failed',
    description,
    payload: null,
    failureResolution,
    updatedAt: new Date().toISOString()
  }
}

/**
 * Creates a FormalReleaseState with 'blocked' status and given reasons.
 */
export function createFormalBlockedState(
  blockedBy: FormalReleaseBlockReason[],
  description = 'Formal release is blocked'
): FormalReleaseState {
  return {
    status: 'blocked',
    description,
    blockedBy,
    evaluatedAt: new Date().toISOString()
  }
}

/**
 * Creates a FormalReleaseState with 'released' status.
 */
export function createFormalReleasedState(
  description = 'Formal release approved'
): FormalReleaseState {
  return {
    status: 'released',
    description,
    blockedBy: [],
    evaluatedAt: new Date().toISOString()
  }
}

/**
 * Creates a GenerationResultState combining visibleResult and formalRelease.
 * This is the canonical shape for generation result returns.
 */
export function createGenerationResultState(
  visibleResult: VisibleResultState,
  formalRelease: FormalReleaseState
): GenerationResultState {
  return {
    visibleResult,
    formalRelease,
    isVisible: visibleResult.status === 'visible' || visibleResult.status === 'failed',
    isReleased: formalRelease.status === 'released'
  }
}
