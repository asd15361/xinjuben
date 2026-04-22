/**
 * derive-active-character-blocks.test.ts
 * Tests for Active Character Blocks Derivation
 *
 * SCOPE:
 * Verifies the pure derivation functions for available blocks and active character blocks.
 * These functions are the single source of truth for character block derivation.
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  deriveAvailableBlocks,
  deriveActiveCharacterBlocks,
  buildActiveCharacterBlocksSnapshot
} from './derive-active-character-blocks.ts'

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

function makeOutline(
  episodeCount: number,
  planningUnit = 10
): {
  summaryEpisodes: Array<{ episodeNo: number; summary: string }>
  planningUnitEpisodes: number
} {
  return {
    summaryEpisodes: Array.from({ length: episodeCount }, (_, i) => ({
      episodeNo: i + 1,
      summary: `第${i + 1}集摘要`
    })),
    planningUnitEpisodes: planningUnit
  }
}

function makeCharacter(
  id: number,
  name: string,
  activeBlockNos: number[]
): { id: string; name: string; activeBlockNos: number[] } {
  return {
    id: `char-${id}`,
    name,
    activeBlockNos
  }
}

// ---------------------------------------------------------------------------
// deriveAvailableBlocks Tests
// ---------------------------------------------------------------------------

test('deriveAvailableBlocks: empty outline returns empty array', () => {
  const outline = { summaryEpisodes: [], planningUnitEpisodes: 10 }
  const result = deriveAvailableBlocks(outline)
  assert.deepStrictEqual(result, [])
})

test('deriveAvailableBlocks: 10 episodes produces 1 block with label', () => {
  const outline = makeOutline(10)
  const result = deriveAvailableBlocks(outline)
  assert.ok(result.length >= 1, 'Should have at least 1 block')
  assert.ok(result[0].label, 'Block should have a label')
})

test('deriveAvailableBlocks: 20 episodes produces 2 blocks', () => {
  const outline = makeOutline(20)
  const result = deriveAvailableBlocks(outline)
  assert.ok(result.length >= 2, 'Should have at least 2 blocks')
})

test('deriveAvailableBlocks: stability - same input returns same output', () => {
  const outline = makeOutline(10)
  const result1 = deriveAvailableBlocks(outline)
  const result2 = deriveAvailableBlocks(outline)
  assert.deepStrictEqual(result1, result2, 'Same input should produce same output')
})

// ---------------------------------------------------------------------------
// deriveActiveCharacterBlocks Tests
// ---------------------------------------------------------------------------

test('deriveActiveCharacterBlocks: empty characters returns empty array', () => {
  const characters: Array<{ id: string; name: string; activeBlockNos: number[] }> = []
  const result = deriveActiveCharacterBlocks(characters)
  assert.deepStrictEqual(result, [])
})

test('deriveActiveCharacterBlocks: single character with blocks returns sorted unique', () => {
  const characters = [makeCharacter(1, '张三', [1, 3, 2])]
  const result = deriveActiveCharacterBlocks(characters)
  assert.deepStrictEqual(result, [1, 2, 3], 'Should be sorted and unique')
})

test('deriveActiveCharacterBlocks: multiple characters merges and sorts', () => {
  const characters = [
    makeCharacter(1, '张三', [1, 2]),
    makeCharacter(2, '李四', [2, 3]),
    makeCharacter(3, '王五', [1, 3])
  ]
  const result = deriveActiveCharacterBlocks(characters)
  assert.deepStrictEqual(result, [1, 2, 3], 'Should merge all blocks and sort')
})

test('deriveActiveCharacterBlocks: duplicate block numbers deduplicated', () => {
  const characters = [makeCharacter(1, '张三', [1, 1, 1]), makeCharacter(2, '李四', [1, 1])]
  const result = deriveActiveCharacterBlocks(characters)
  assert.deepStrictEqual(result, [1], 'Should deduplicate')
})

// ---------------------------------------------------------------------------
// buildActiveCharacterBlocksSnapshot Tests
// ---------------------------------------------------------------------------

test('buildActiveCharacterBlocksSnapshot: combines available and active correctly', () => {
  const outline = makeOutline(10)
  const characters = [makeCharacter(1, '张三', [1, 2])]
  const snapshot = buildActiveCharacterBlocksSnapshot(outline, characters)

  assert.ok(Array.isArray(snapshot.availableBlocks), 'availableBlocks should be array')
  assert.ok(Array.isArray(snapshot.activeCharacterBlocks), 'activeCharacterBlocks should be array')
  assert.deepStrictEqual(snapshot.activeCharacterBlocks, [1, 2])
})

test('buildActiveCharacterBlocksSnapshot: empty outline and characters', () => {
  const outline = { summaryEpisodes: [], planningUnitEpisodes: 10 }
  const characters: Array<{ id: string; name: string; activeBlockNos: number[] }> = []
  const snapshot = buildActiveCharacterBlocksSnapshot(outline, characters)

  assert.deepStrictEqual(snapshot.availableBlocks, [])
  assert.deepStrictEqual(snapshot.activeCharacterBlocks, [])
})
