/**
 * batching-contract.ts — 5/5/5 Batching Governance Contract
 *
 * PURPOSE:
 * Formalizes the current `5集粗纲 / 5集详纲 / 5集写作` batching as explicit,
 * testable, and evidence-backed governance invariants.
 *
 * CONTEXT (AGENTS.md + T14 first slice):
 * - The official unit is `5集粗纲 / 5集详纲 / 5集写作`
 * - These were previously scattered constants without formal contract
 * - This file makes them explicit governance rules, not just implementation defaults
 *
 * BATCHING RULES (Canonical):
 * 1. 5集粗纲 — Outline blocks are built in groups of 5 episodes
 *    - DEFAULT_OUTLINE_BLOCK_EPISODES = 5
 *    - `buildOutlineBlocks()` uses this to chunk outline generation
 *
 * 2. 5集详纲 — Detailed outline planning unit is 5 episodes
 *    - planningUnitEpisodes defaults to 5
 *    - Each detailed outline block covers 5 episodes
 *
 * 3. 5集写作 — Script generation batch is 5 episodes
 *    - DEFAULT_SCRIPT_BATCH_EPISODES = 5
 *    - `buildScriptBatchContexts()` uses this to chunk script generation
 *
 * SCOPE OF THIS CONTRACT:
 * - Formalizes canonical 5/5/5 batching invariants
 * - Defines the batched tier consumed by grouped/layered script governance
 * - Does NOT create second-truth planning data; governance must consume existing truth inputs
 *
 * WAVES:
 * - Current slice: unified 5/5/5 batching governance
 * - grouped/layered/batched governance continues to consume this single batch contract
 */

// =============================================================================
// BATCHING CONSTANTS — Official Governance Values
// =============================================================================

/**
 * 5集粗纲 — Episodes per outline block.
 *
 * Canonical value for chunking outline generation.
 * Each outline block generated together represents 5 episodes.
 */
export const OUTLINE_BLOCK_EPISODES_GOVERNANCE = 5 as const

/**
 * 5集详纲 — Episodes per detailed outline planning unit.
 *
 * Same as OUTLINE_BLOCK_EPISODES — detailed outline planning
 * follows the same 5-episode unit as outline blocks.
 */
export const DETAILED_OUTLINE_UNIT_EPISODES_GOVERNANCE = 5 as const

/**
 * 5集写作 — Episodes per script batch.
 *
 * Canonical value for chunking script generation.
 * Each script batch written together represents 5 episodes.
 */
export const SCRIPT_BATCH_EPISODES_GOVERNANCE = 5 as const

// =============================================================================
// BATCHING INVARIANTS — Formalized as Contract Functions
// =============================================================================

/**
 * Verifies the governance constant matches the implementation default.
 *
 * This ensures the contract value and the actual implementation constant
 * stay in sync. Used by tests to verify enforcement.
 */
export function assertOutlineBlockEpisodesConstant(value: number): void {
  if (value !== OUTLINE_BLOCK_EPISODES_GOVERNANCE) {
    throw new Error(
      `[BatchingContract] OUTLINE_BLOCK_EPISODES governance mismatch: ` +
        `expected ${OUTLINE_BLOCK_EPISODES_GOVERNANCE}, got ${value}`
    )
  }
}

/**
 * Verifies the detailed outline planning unit matches governance constant.
 */
export function assertDetailedOutlineUnitEpisodesConstant(value: number): void {
  if (value !== DETAILED_OUTLINE_UNIT_EPISODES_GOVERNANCE) {
    throw new Error(
      `[BatchingContract] DETAILED_OUTLINE_UNIT_EPISODES governance mismatch: ` +
        `expected ${DETAILED_OUTLINE_UNIT_EPISODES_GOVERNANCE}, got ${value}`
    )
  }
}

/**
 * Verifies the script batch size matches governance constant.
 */
export function assertScriptBatchEpisodesConstant(value: number): void {
  if (value !== SCRIPT_BATCH_EPISODES_GOVERNANCE) {
    throw new Error(
      `[BatchingContract] SCRIPT_BATCH_EPISODES governance mismatch: ` +
        `expected ${SCRIPT_BATCH_EPISODES_GOVERNANCE}, got ${value}`
    )
  }
}

// =============================================================================
// BATCHING SIZE QUERY HELPERS
// =============================================================================

/**
 * Returns the canonical outline block size (5 episodes).
 */
export function getGovernanceOutlineBlockSize(): number {
  return OUTLINE_BLOCK_EPISODES_GOVERNANCE
}

/**
 * Returns the canonical detailed outline planning unit size (5 episodes).
 */
export function getGovernanceDetailedOutlineUnitSize(): number {
  return DETAILED_OUTLINE_UNIT_EPISODES_GOVERNANCE
}

/**
 * Returns the canonical script batch size (5 episodes).
 */
export function getGovernanceScriptBatchSize(): number {
  return SCRIPT_BATCH_EPISODES_GOVERNANCE
}

// =============================================================================
// BATCH COUNT COMPUTATION
// =============================================================================

/**
 * Computes the expected number of outline blocks for a given episode count.
 *
 * @param totalEpisodes - Total number of episodes in the project
 * @returns Number of outline blocks (each covering 5 episodes)
 */
export function computeExpectedOutlineBlockCount(totalEpisodes: number): number {
  if (totalEpisodes <= 0) return 0
  return Math.ceil(totalEpisodes / OUTLINE_BLOCK_EPISODES_GOVERNANCE)
}

/**
 * Computes the expected number of script batches for a given episode count.
 *
 * @param totalEpisodes - Total number of episodes in the project
 * @returns Number of script batches (each covering 5 episodes)
 */
export function computeExpectedScriptBatchCount(totalEpisodes: number): number {
  if (totalEpisodes <= 0) return 0
  return Math.ceil(totalEpisodes / SCRIPT_BATCH_EPISODES_GOVERNANCE)
}

// =============================================================================
// CONTRACT VALIDATION
// =============================================================================

/**
 * Validates that a given episode number falls within the expected block range.
 *
 * @param episodeNo - Episode number to validate
 * @param blockStartEpisode - Start episode of the block
 * @param blockEndEpisode - End episode of the block
 */
export function assertEpisodeInBlockRange(
  episodeNo: number,
  blockStartEpisode: number,
  blockEndEpisode: number
): void {
  if (episodeNo < blockStartEpisode || episodeNo > blockEndEpisode) {
    throw new Error(
      `[BatchingContract] Episode ${episodeNo} not in block range [${blockStartEpisode}, ${blockEndEpisode}]`
    )
  }
}

/**
 * Validates that a block's episode span matches governance expectations.
 *
 * @param blockStartEpisode - Start episode of the block
 * @param blockEndEpisode - End episode of the block
 */
export function assertBlockSpanMatchesGovernance(
  blockStartEpisode: number,
  blockEndEpisode: number
): void {
  const span = blockEndEpisode - blockStartEpisode + 1
  if (span !== OUTLINE_BLOCK_EPISODES_GOVERNANCE) {
    throw new Error(
      `[BatchingContract] Block span ${span} does not match governance size ${OUTLINE_BLOCK_EPISODES_GOVERNANCE}`
    )
  }
}

/**
 * Validates that a script batch's episode span matches governance expectations.
 *
 * @param batchStartEpisode - Start episode of the batch
 * @param batchEndEpisode - End episode of the batch
 */
export function assertBatchSpanMatchesGovernance(
  batchStartEpisode: number,
  batchEndEpisode: number
): void {
  const span = batchEndEpisode - batchStartEpisode + 1
  if (span !== SCRIPT_BATCH_EPISODES_GOVERNANCE) {
    throw new Error(
      `[BatchingContract] Batch span ${span} does not match governance size ${SCRIPT_BATCH_EPISODES_GOVERNANCE}`
    )
  }
}

// =============================================================================
// BATCHING GOVERNANCE LABELS
// =============================================================================

/**
 * Returns the human-readable label for outline block batching.
 */
export function getOutlineBlockBatchingLabel(): string {
  return `${OUTLINE_BLOCK_EPISODES_GOVERNANCE}集粗纲`
}

/**
 * Returns the human-readable label for detailed outline batching.
 */
export function getDetailedOutlineBatchingLabel(): string {
  return `${DETAILED_OUTLINE_UNIT_EPISODES_GOVERNANCE}集详纲`
}

/**
 * Returns the human-readable label for script batch batching.
 */
export function getScriptBatchBatchingLabel(): string {
  return `${SCRIPT_BATCH_EPISODES_GOVERNANCE}集写作`
}
