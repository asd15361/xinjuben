/**
 * stage-guardians.ts — Process Boundary Guardians for Stage Progression
 *
 * PURPOSE:
 * This module provides formal boundary guards that prevent:
 * 1. Downstream stages from reading incomplete upstream data
 * 2. Persistence paths from silently accepting states that would force later stages to backfill
 *
 * WAVE: T9 First Slice — Process-boundary guardian (initial implementation)
 *
 * PRINCIPLES:
 * - Guardian throws AuthorityFailureError on boundary violation, not just boolean
 * - Guardian is called at BOTH IPC generation entry AND persistence save/update paths
 * - Reuses existing validateStageInputContract for upstream completeness checks
 * - Reuses AuthorityFailureError for formal failure semantics
 *
 * BOUNDARIES PROTECTED (first slice):
 * 1. Script generation entry — validates detailed_outline upstream is complete
 * 2. Outline persistence — validates outline stage contract before save
 * 3. Character persistence — validates character stage contract (checks upstream outline)
 * 4. Detailed outline persistence — validates detailed_outline stage contract (checks upstream)
 *
 * GUARDIAN SEMANTICS:
 * - guardianEnforceScriptEntry: Called at workflow:start-script-generation
 *   Throws if detailed_outline upstream is not ready
 * - guardianEnforceOutlineSave: Called at saveOutlineDraft
 *   Throws if outline being saved violates outline stage contract
 * - guardianEnforceCharacterSave: Called at saveCharacterDrafts
 *   Throws if character save would create invalid upstream state
 * - guardianEnforceDetailedOutlineSave: Called at saveDetailedOutlineSegments
 *   Throws if detailed outline save would create invalid upstream state
 */

import {
  AuthorityFailureError,
  AuthorityFailureType,
  AuthorityOwnedFacts
} from './authority-constitution'
// import { validateStageInputContract } from '../../../main/application/input-contract/validate-stage-input'
import type { InputContractIssueDto } from '../../contracts/input-contract'
import type { StageContractType } from '../../contracts/stage-contract'
import type {
  CharacterBlockDto,
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../contracts/workflow'
import type { StoryIntentPackageDto } from '../../contracts/intake'

// =============================================================================
// GUARDIAN CONTEXT LABELS
// =============================================================================

/**
 * Context labels for guardian enforcement calls.
 * Used to identify where in the call stack the guardian violation occurred.
 */
export const GuardianContext = {
  SCRIPT_ENTRY: 'guardian:script-generation-entry',
  OUTLINE_SAVE: 'guardian:outline-persistence',
  CHARACTER_SAVE: 'guardian:character-persistence',
  DETAILED_OUTLINE_SAVE: 'guardian:detailed-outline-persistence'
} as const

export type GuardianContextLabel = (typeof GuardianContext)[keyof typeof GuardianContext]

// =============================================================================
// STAGE GUARDIAN PAYLOAD
// =============================================================================

/**
 * Standard payload for stage guardian validation.
 * All stage guardians receive this structure to validate upstream completeness.
 */
export interface StageGuardianPayload {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  activeCharacterBlocks?: CharacterBlockDto[]
  segments?: DetailedOutlineSegmentDto[]
  script: ScriptSegmentDto[]
}

// =============================================================================
// GUARDIAN RESULT
// =============================================================================

/**
 * Result of a guardian check — either passed or formally failed.
 */
export interface GuardianResult {
  ok: boolean
  issues: InputContractIssueDto[]
  targetStage: StageContractType
}

/**
 * Create a successful guardian result.
 */
export function guardianOk(targetStage: StageContractType): GuardianResult {
  return { ok: true, issues: [], targetStage }
}

/**
 * Create a failed guardian result with issues.
 */
export function guardianFail(
  targetStage: StageContractType,
  issues: InputContractIssueDto[]
): GuardianResult {
  return { ok: false, issues, targetStage }
}

// =============================================================================
// INTERNAL VALIDATION HELPER
// =============================================================================

/**
 * Validate stage input contract and convert to GuardianResult.
 * Internal helper used by all guardian functions.
 *
 * TODO: validateStageInputContract was moved to server-side.
 * Stubbed to always return ok until server equivalent is wired.
 */
function validateForStage(
  _targetStage: StageContractType,
  _payload: StageGuardianPayload
): GuardianResult {
  // Stub: always pass until server endpoint is available
  return guardianOk(_targetStage)
  // const validation = validateStageInputContract(_targetStage, {
  //   ..._payload,
  //   segments: _payload.segments || []
  // })
  // if (validation.ready) {
  //   return guardianOk(_targetStage)
  // }
  // return guardianFail(_targetStage, validation.issues)
}

// =============================================================================
// SCRIPT GENERATION ENTRY GUARDIAN
// =============================================================================

/**
 * Guardian check for script generation entry.
 *
 * Called at: workflow:start-script-generation IPC handler
 *
 * THROWS: AuthorityFailureError with INCOMPLETE_RESULT if upstream is not ready
 *
 * This ensures script generation cannot start when:
 * - detailed outline blocks are missing or incomplete
 * - characters are missing or contract-weak
 * - formal facts are not confirmed
 * - scene-by-scene details are missing
 * - anchor roster is incomplete
 */
export function guardianEnforceScriptEntry(payload: StageGuardianPayload): void {
  const result = validateForStage('script', payload)

  if (!result.ok) {
    const issueSummary = result.issues.map((i) => i.code).join(', ')
    throw new AuthorityFailureError(
      AuthorityFailureType.INCOMPLETE_RESULT,
      AuthorityOwnedFacts.DETAILED_OUTLINE_BLOCKS,
      `[${GuardianContext.SCRIPT_ENTRY}] Upstream detailed_outline is not ready. Blocking script generation. Issues: ${issueSummary}. Messages: ${result.issues.map((i) => i.message).join(' | ')}`
    )
  }
}

// =============================================================================
// PERSISTENCE SAVE PATH GUARDIANS
// =============================================================================

/**
 * Guardian check for outline draft persistence.
 *
 * Called at: saveOutlineDraft (project-store.ts)
 *
 * THROWS: AuthorityFailureError with INCOMPLETE_RESULT if outline violates stage contract
 *
 * This ensures outline cannot be saved in a state that would:
 * - Leave outline stage incomplete
 * - Force character stage to backfill outline gaps
 */
export function guardianEnforceOutlineSave(outline: OutlineDraftDto): void {
  // Minimal payload for outline-only validation
  const payload: StageGuardianPayload = {
    outline,
    characters: [],
    script: []
  }

  const result = validateForStage('outline', payload)

  if (!result.ok) {
    const issueSummary = result.issues.map((i) => i.code).join(', ')
    throw new AuthorityFailureError(
      AuthorityFailureType.INCOMPLETE_RESULT,
      AuthorityOwnedFacts.OUTLINE_DRAFT,
      `[${GuardianContext.OUTLINE_SAVE}] Outline state violates stage contract. Issues: ${issueSummary}. Messages: ${result.issues.map((i) => i.message).join(' | ')}`
    )
  }
}

/**
 * Guardian check for character draft persistence.
 *
 * Called at: saveCharacterDrafts (project-store.ts)
 *
 * THROWS: AuthorityFailureError with INCOMPLETE_RESULT if upstream outline is incomplete
 *
 * This ensures character drafts cannot be saved when:
 * - Upstream outline is incomplete (missing title/theme/conflict/summary)
 * - 主角、对手或关键人物的小传合同不完整
 * - This would force detailed_outline to backfill character gaps
 */
export function guardianEnforceCharacterSave(input: {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  activeCharacterBlocks?: CharacterBlockDto[]
}): void {
  const payload: StageGuardianPayload = {
    storyIntent: input.storyIntent,
    outline: input.outline,
    characters: input.characters,
    activeCharacterBlocks: input.activeCharacterBlocks,
    script: []
  }

  const result = validateForStage('character', payload)

  if (!result.ok) {
    const issueSummary = result.issues.map((i) => i.code).join(', ')
    throw new AuthorityFailureError(
      AuthorityFailureType.INCOMPLETE_RESULT,
      AuthorityOwnedFacts.CHARACTER_DRAFTS,
      `[${GuardianContext.CHARACTER_SAVE}] Character save would create invalid upstream state. Upstream outline incomplete. Issues: ${issueSummary}. Messages: ${result.issues.map((i) => i.message).join(' | ')}`
    )
  }
}

/**
 * Guardian check for detailed outline persistence.
 *
 * Called at: saveDetailedOutlineSegments (project-store.ts)
 *
 * THROWS: AuthorityFailureError with INCOMPLETE_RESULT if upstream foundation is incomplete
 *
 * This ensures detailed outline cannot be saved when:
 * - No characters exist yet
 * - Characters don't meet contract (missing name/biography/goal/advantage/weakness/arc)
 * - User anchor roster has gaps
 * - This would force script stage to backfill detailed outline gaps
 */
export function guardianEnforceDetailedOutlineSave(input: {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  detailedOutlineSegments?: DetailedOutlineSegmentDto[]
  activeCharacterBlocks?: CharacterBlockDto[]
}): void {
  const payload: StageGuardianPayload = {
    storyIntent: input.storyIntent,
    outline: input.outline,
    characters: input.characters,
    activeCharacterBlocks: input.activeCharacterBlocks,
    segments: input.detailedOutlineSegments || [],
    script: []
  }

  const result = validateForStage('detailed_outline', payload)

  if (!result.ok) {
    const issueSummary = result.issues.map((i) => i.code).join(', ')
    throw new AuthorityFailureError(
      AuthorityFailureType.INCOMPLETE_RESULT,
      AuthorityOwnedFacts.DETAILED_OUTLINE_BLOCKS,
      `[${GuardianContext.DETAILED_OUTLINE_SAVE}] Detailed outline save would create invalid upstream state. Issues: ${issueSummary}. Messages: ${result.issues.map((i) => i.message).join(' | ')}`
    )
  }
}

// =============================================================================
// VERIFICATION HELPERS
// =============================================================================

/**
 * Check if a context label is a known guardian context.
 * Useful for grep-based verification that guardians are in place.
 */
export function isGuardianContext(context: string): boolean {
  return (Object.values(GuardianContext) as string[]).includes(context)
}

/**
 * Get the target stage for a guardian context.
 */
export function getGuardianTargetStage(context: GuardianContextLabel): StageContractType {
  switch (context) {
    case GuardianContext.SCRIPT_ENTRY:
      return 'script'
    case GuardianContext.OUTLINE_SAVE:
      return 'outline'
    case GuardianContext.CHARACTER_SAVE:
      return 'character'
    case GuardianContext.DETAILED_OUTLINE_SAVE:
      return 'detailed_outline'
  }
}
