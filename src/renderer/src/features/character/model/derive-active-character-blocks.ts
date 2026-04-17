/**
 * Active Character Blocks Derivation
 *
 * Pure function builder for deriving the renderer-side active block number snapshot.
 * The source is always outline + characterDrafts; this file does not own persisted truth.
 *
 * Input: outline + characters
 * Output: availableBlocks + activeCharacterBlocks snapshot
 *
 * NO render/effect writes allowed. This is a pure derivation.
 */

import type {
  OutlineDraftDto,
  CharacterDraftDto
} from '../../../../../shared/contracts/workflow.ts'
import { buildOutlineBlocks } from '../../../../../shared/domain/workflow/planning-blocks.ts'

export interface AvailableBlock {
  blockNo: number
  label: string
}

export interface ActiveCharacterBlocksSnapshot {
  availableBlocks: AvailableBlock[]
  activeCharacterBlocks: number[]
}

/**
 * Derive available blocks from outline.
 * Returns empty array if outline has no episodes.
 */
export function deriveAvailableBlocks(outline: OutlineDraftDto): AvailableBlock[] {
  const episodes = outline.summaryEpisodes ?? []
  const planningUnit = outline.planningUnitEpisodes ?? 10

  if (episodes.length === 0) {
    return []
  }

  const outlineBlocks = buildOutlineBlocks(episodes, planningUnit)
  return outlineBlocks
    .map((b) => ({ blockNo: b.blockNo, label: b.label }))
    .filter((b): b is AvailableBlock => Boolean(b.label))
}

/**
 * Derive active character blocks from all characters.
 * Collects unique block numbers from all characters' activeBlockNos.
 */
export function deriveActiveCharacterBlocks(characters: CharacterDraftDto[]): number[] {
  const allBlockNos = characters.flatMap((char) => char.activeBlockNos ?? [])
  return Array.from(new Set(allBlockNos)).sort((a, b) => a - b)
}

/**
 * Build complete renderer snapshot for available blocks and active block numbers.
 */
export function buildActiveCharacterBlocksSnapshot(
  outline: OutlineDraftDto,
  characters: CharacterDraftDto[]
): ActiveCharacterBlocksSnapshot {
  return {
    availableBlocks: deriveAvailableBlocks(outline),
    activeCharacterBlocks: deriveActiveCharacterBlocks(characters)
  }
}
