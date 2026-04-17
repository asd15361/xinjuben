/**
 * planning-blocks.test.ts — Targeted Tests for 5/5/5 Batching Behavior
 *
 * SCOPE:
 * Verifies the current 5/5/5 batching invariants for:
 * - Outline blocks (5集粗纲)
 * - Detailed outline planning unit (5集详纲)
 * - Script batch contexts (5集写作)
 *
 * These tests formalize existing behavior as executable contracts.
 * They do NOT add new grouping/layered models.
 */

import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildOutlineBlocks,
  buildScriptBatchContexts,
  findOutlineBlockByEpisode,
  findScriptBatchContext,
  getPlanningUnitEpisodes
} from './planning-blocks.ts'

import {
  OUTLINE_BLOCK_EPISODES_GOVERNANCE,
  assertOutlineBlockEpisodesConstant,
  assertScriptBatchEpisodesConstant,
  computeExpectedOutlineBlockCount,
  computeExpectedScriptBatchCount,
  assertBlockSpanMatchesGovernance,
  assertBatchSpanMatchesGovernance
} from './batching-contract.ts'

// ---------------------------------------------------------------------------
// Test Fixtures
// ---------------------------------------------------------------------------

function makeEpisodes(count: number, startNo = 1): Array<{ episodeNo: number; summary: string }> {
  return Array.from({ length: count }, (_, i) => ({
    episodeNo: startNo + i,
    summary: `第${startNo + i}集摘要`
  }))
}

// ---------------------------------------------------------------------------
// 5集粗纲 Tests (Outline Blocks)
// ---------------------------------------------------------------------------

test('buildOutlineBlocks: 5 episodes produces exactly 1 block', () => {
  const episodes = makeEpisodes(5)
  const blocks = buildOutlineBlocks(episodes)

  assert.equal(blocks.length, 1, '5 episodes should produce 1 block')
  assert.equal(blocks[0].blockNo, 1)
  assert.equal(blocks[0].startEpisode, 1)
  assert.equal(blocks[0].endEpisode, 5)

  // Verify governance invariant
  assertBlockSpanMatchesGovernance(blocks[0].startEpisode, blocks[0].endEpisode)
})

test('buildOutlineBlocks: 10 episodes produces exactly 2 blocks', () => {
  const episodes = makeEpisodes(10)
  const blocks = buildOutlineBlocks(episodes)

  assert.equal(blocks.length, 2, '10 episodes should produce 2 blocks')

  // Block 1
  assert.equal(blocks[0].blockNo, 1)
  assert.equal(blocks[0].startEpisode, 1)
  assert.equal(blocks[0].endEpisode, 5)

  // Block 2
  assert.equal(blocks[1].blockNo, 2)
  assert.equal(blocks[1].startEpisode, 6)
  assert.equal(blocks[1].endEpisode, 10)

  // Verify governance invariants
  assertBlockSpanMatchesGovernance(blocks[0].startEpisode, blocks[0].endEpisode)
  assertBlockSpanMatchesGovernance(blocks[1].startEpisode, blocks[1].endEpisode)
})

test('buildOutlineBlocks: 12 episodes produces 3 blocks (5 + 5 + 2)', () => {
  const episodes = makeEpisodes(12)
  const blocks = buildOutlineBlocks(episodes)

  assert.equal(blocks.length, 3, '12 episodes should produce 3 blocks')

  assert.equal(blocks[0].startEpisode, 1)
  assert.equal(blocks[0].endEpisode, 5)
  assertBlockSpanMatchesGovernance(blocks[0].startEpisode, blocks[0].endEpisode)

  assert.equal(blocks[1].startEpisode, 6)
  assert.equal(blocks[1].endEpisode, 10)
  assertBlockSpanMatchesGovernance(blocks[1].startEpisode, blocks[1].endEpisode)

  assert.equal(blocks[2].startEpisode, 11)
  assert.equal(blocks[2].endEpisode, 12)
})

test('buildOutlineBlocks: empty episodes returns empty array', () => {
  const blocks = buildOutlineBlocks([])
  assert.equal(blocks.length, 0)
})

test('buildOutlineBlocks: episodes without summary are filtered', () => {
  const episodes = [
    { episodeNo: 1, summary: '第1集' },
    { episodeNo: 2, summary: '' }, // filtered out
    { episodeNo: 3, summary: '第3集' }
  ]
  const blocks = buildOutlineBlocks(episodes as any)

  // After filtering, only 2 episodes remain, which fits in 1 block
  assert.equal(blocks.length, 1)
})

test('buildOutlineBlocks: custom planningUnitEpisodes works correctly', () => {
  const episodes = makeEpisodes(6)
  const blocks = buildOutlineBlocks(episodes, 3)

  assert.equal(blocks.length, 2, '6 episodes with unit=3 should produce 2 blocks')
  assert.equal(blocks[0].startEpisode, 1)
  assert.equal(blocks[0].endEpisode, 3)
  assert.equal(blocks[1].startEpisode, 4)
  assert.equal(blocks[1].endEpisode, 6)
})

test('findOutlineBlockByEpisode: returns correct block for episode in range', () => {
  const episodes = makeEpisodes(10)
  const blocks = buildOutlineBlocks(episodes)

  const outline = { outlineBlocks: blocks, summaryEpisodes: episodes }

  const found = findOutlineBlockByEpisode(outline, 7)
  assert.ok(found, 'Should find block for episode 7')
  assert.equal(found!.blockNo, 2)
  assert.equal(found!.startEpisode, 6)
  assert.equal(found!.endEpisode, 10)
})

test('findOutlineBlockByEpisode: returns null for episode out of range', () => {
  const episodes = makeEpisodes(10)
  const blocks = buildOutlineBlocks(episodes)
  const outline = { outlineBlocks: blocks, summaryEpisodes: episodes }

  const found = findOutlineBlockByEpisode(outline, 99)
  assert.equal(found, null, 'Should return null for out-of-range episode')
})

test('getPlanningUnitEpisodes: defaults to governance value when not specified', () => {
  const value = getPlanningUnitEpisodes({})
  assert.equal(value, OUTLINE_BLOCK_EPISODES_GOVERNANCE, 'Should match governance constant')
})

test('getPlanningUnitEpisodes: uses custom value when specified', () => {
  const value = getPlanningUnitEpisodes({ planningUnitEpisodes: 5 })
  assert.equal(value, 5)
})

// ---------------------------------------------------------------------------
// 5集写作 Tests (Script Batch Contexts)
// ---------------------------------------------------------------------------

test('buildScriptBatchContexts: 5 episodes produces exactly 1 batch', () => {
  const episodes = makeEpisodes(5)
  const batchContexts = buildScriptBatchContexts({
    outline: { summaryEpisodes: episodes, outlineBlocks: [], planningUnitEpisodes: 5 },
    episodeBeats: [],
    characters: []
  })

  assert.equal(batchContexts.length, 1, '5 episodes should produce 1 batch')
  assert.equal(batchContexts[0].batchNo, 1)
  assert.equal(batchContexts[0].startEpisode, 1)
  assert.equal(batchContexts[0].endEpisode, 5)

  // Verify governance invariant
  assertBatchSpanMatchesGovernance(batchContexts[0].startEpisode, batchContexts[0].endEpisode)
})

test('buildScriptBatchContexts: 10 episodes produces exactly 2 batches', () => {
  const episodes = makeEpisodes(10)
  const batchContexts = buildScriptBatchContexts({
    outline: { summaryEpisodes: episodes, outlineBlocks: [], planningUnitEpisodes: 5 },
    episodeBeats: [],
    characters: []
  })

  assert.equal(batchContexts.length, 2, '10 episodes should produce 2 batches')

  // Batch 1
  assert.equal(batchContexts[0].batchNo, 1)
  assert.equal(batchContexts[0].startEpisode, 1)
  assert.equal(batchContexts[0].endEpisode, 5)

  // Batch 2
  assert.equal(batchContexts[1].batchNo, 2)
  assert.equal(batchContexts[1].startEpisode, 6)
  assert.equal(batchContexts[1].endEpisode, 10)

  // Verify governance invariants
  assertBatchSpanMatchesGovernance(batchContexts[0].startEpisode, batchContexts[0].endEpisode)
  assertBatchSpanMatchesGovernance(batchContexts[1].startEpisode, batchContexts[1].endEpisode)
})

test('buildScriptBatchContexts: 12 episodes produces 3 batches (5 + 5 + 2)', () => {
  const episodes = makeEpisodes(12)
  const batchContexts = buildScriptBatchContexts({
    outline: { summaryEpisodes: episodes, outlineBlocks: [], planningUnitEpisodes: 5 },
    episodeBeats: [],
    characters: []
  })

  assert.equal(batchContexts.length, 3, '12 episodes should produce 3 batches')

  assert.equal(batchContexts[0].startEpisode, 1)
  assert.equal(batchContexts[0].endEpisode, 5)
  assertBatchSpanMatchesGovernance(batchContexts[0].startEpisode, batchContexts[0].endEpisode)

  assert.equal(batchContexts[1].startEpisode, 6)
  assert.equal(batchContexts[1].endEpisode, 10)
  assertBatchSpanMatchesGovernance(batchContexts[1].startEpisode, batchContexts[1].endEpisode)

  // Third batch is partial (2 episodes)
  assert.equal(batchContexts[2].startEpisode, 11)
  assert.equal(batchContexts[2].endEpisode, 12)
})

test('buildScriptBatchContexts: empty episodes returns empty array', () => {
  const batchContexts = buildScriptBatchContexts({
    outline: { summaryEpisodes: [], outlineBlocks: [], planningUnitEpisodes: 5 },
    episodeBeats: [],
    characters: []
  })

  assert.equal(batchContexts.length, 0)
})

test('buildScriptBatchContexts: custom batchUnitEpisodes works correctly', () => {
  const episodes = makeEpisodes(6)
  const batchContexts = buildScriptBatchContexts({
    outline: { summaryEpisodes: episodes, outlineBlocks: [], planningUnitEpisodes: 5 },
    episodeBeats: [],
    characters: [],
    batchUnitEpisodes: 3
  })

  assert.equal(batchContexts.length, 2, '6 episodes with unit=3 should produce 2 batches')
  assert.equal(batchContexts[0].startEpisode, 1)
  assert.equal(batchContexts[0].endEpisode, 3)
  assert.equal(batchContexts[1].startEpisode, 4)
  assert.equal(batchContexts[1].endEpisode, 6)
})

test('buildScriptBatchContexts: derives different active character packages per batch from entityStore mentions', () => {
  const episodes = [
    { episodeNo: 1, summary: '沈砚被顾迟堵在山门口。' },
    { episodeNo: 2, summary: '顾迟继续拿天机卷逼沈砚表态。' },
    { episodeNo: 3, summary: '沈砚先忍住不动。' },
    { episodeNo: 4, summary: '顾迟把旧账直接拍到沈砚脸上。' },
    { episodeNo: 5, summary: '沈砚只能先退半步。' },
    { episodeNo: 6, summary: '谢宁带边城军报闯进来找沈砚。' },
    { episodeNo: 7, summary: '谢宁逼沈砚立刻去守边城。' },
    { episodeNo: 8, summary: '沈砚和谢宁在边城门口争下一步。' },
    { episodeNo: 9, summary: '谢宁把军报后果全部压给沈砚。' },
    { episodeNo: 10, summary: '沈砚被谢宁逼到边城墙下。' }
  ]
  const batchContexts = buildScriptBatchContexts({
    outline: {
      summaryEpisodes: episodes,
      outlineBlocks: [],
      planningUnitEpisodes: 5
    },
    episodeBeats: [],
    characters: [
      {
        name: '沈砚',
        biography: '主角',
        publicMask: '',
        hiddenPressure: '守住师门',
        fear: '',
        protectTarget: '',
        conflictTrigger: '天机卷',
        advantage: '',
        weakness: '',
        goal: '追回天机卷',
        arc: '从独行到承担',
        roleLayer: 'core'
      }
    ],
    entityStore: {
      characters: [
        {
          id: 'char-gu-chi',
          projectId: 'project-1',
          type: 'character',
          name: '顾迟',
          aliases: [],
          summary: '第一批次反派',
          tags: ['反派'],
          roleLayer: 'active',
          goals: ['夺下天机卷'],
          pressures: ['逼沈砚亮底'],
          linkedFactionIds: [],
          linkedLocationIds: [],
          linkedItemIds: [],
          provenance: {
            provenanceTier: 'user_declared',
            originAuthorityType: 'user_declared',
            originDeclaredBy: 'user',
            sourceStage: 'outline',
            createdAt: '2026-04-09T00:00:00.000Z',
            updatedAt: '2026-04-09T00:00:00.000Z'
          }
        },
        {
          id: 'char-xie-ning',
          projectId: 'project-1',
          type: 'character',
          name: '谢宁',
          aliases: [],
          summary: '第二批次压场人物',
          tags: ['守将'],
          roleLayer: 'active',
          goals: ['逼沈砚守边城'],
          pressures: ['边城军报压境'],
          linkedFactionIds: [],
          linkedLocationIds: [],
          linkedItemIds: [],
          provenance: {
            provenanceTier: 'user_declared',
            originAuthorityType: 'user_declared',
            originDeclaredBy: 'user',
            sourceStage: 'outline',
            createdAt: '2026-04-09T00:00:00.000Z',
            updatedAt: '2026-04-09T00:00:00.000Z'
          }
        }
      ],
      factions: [],
      locations: [],
      items: [],
      relations: []
    }
  })

  assert.deepEqual(batchContexts[0].activeCharacterPackage?.memberNames, ['沈砚', '顾迟'])
  assert.deepEqual(batchContexts[1].activeCharacterPackage?.memberNames, ['沈砚', '谢宁'])
  assert.deepEqual(batchContexts[1].activeCharacterPackage?.debutCharacterNames, ['谢宁'])
})

test('findScriptBatchContext: returns correct batch for episode in range', () => {
  const episodes = makeEpisodes(10)
  const batchContexts = buildScriptBatchContexts({
    outline: { summaryEpisodes: episodes, outlineBlocks: [], planningUnitEpisodes: 5 },
    episodeBeats: [],
    characters: []
  })

  const found = findScriptBatchContext(batchContexts, 7)
  assert.ok(found, 'Should find batch for episode 7')
  assert.equal(found!.batchNo, 2)
  assert.equal(found!.startEpisode, 6)
  assert.equal(found!.endEpisode, 10)
})

test('findScriptBatchContext: returns null for episode out of range', () => {
  const episodes = makeEpisodes(5)
  const batchContexts = buildScriptBatchContexts({
    outline: { summaryEpisodes: episodes, outlineBlocks: [], planningUnitEpisodes: 5 },
    episodeBeats: [],
    characters: []
  })

  const found = findScriptBatchContext(batchContexts, 99)
  assert.equal(found, null, 'Should return null for out-of-range episode')
})

// ---------------------------------------------------------------------------
// Batch Count Computation Tests
// ---------------------------------------------------------------------------

test('computeExpectedOutlineBlockCount: 5 episodes = 1 block', () => {
  assert.equal(computeExpectedOutlineBlockCount(5), 1)
})

test('computeExpectedOutlineBlockCount: 6 episodes = 2 blocks', () => {
  assert.equal(computeExpectedOutlineBlockCount(6), 2)
})

test('computeExpectedOutlineBlockCount: 10 episodes = 2 blocks', () => {
  assert.equal(computeExpectedOutlineBlockCount(10), 2)
})

test('computeExpectedOutlineBlockCount: 0 episodes = 0 blocks', () => {
  assert.equal(computeExpectedOutlineBlockCount(0), 0)
})

test('computeExpectedOutlineBlockCount: negative episodes = 0 blocks', () => {
  assert.equal(computeExpectedOutlineBlockCount(-5), 0)
})

test('computeExpectedScriptBatchCount: 5 episodes = 1 batch', () => {
  assert.equal(computeExpectedScriptBatchCount(5), 1)
})

test('computeExpectedScriptBatchCount: 6 episodes = 2 batches', () => {
  assert.equal(computeExpectedScriptBatchCount(6), 2)
})

test('computeExpectedScriptBatchCount: 10 episodes = 2 batches', () => {
  assert.equal(computeExpectedScriptBatchCount(10), 2)
})

test('computeExpectedScriptBatchCount: 0 episodes = 0 batches', () => {
  assert.equal(computeExpectedScriptBatchCount(0), 0)
})

// ---------------------------------------------------------------------------
// Governance Constant Assertion Tests
// ---------------------------------------------------------------------------

test('assertOutlineBlockEpisodesConstant: passes with correct value', () => {
  assert.doesNotThrow(() => {
    assertOutlineBlockEpisodesConstant(5)
  })
})

test('assertOutlineBlockEpisodesConstant: throws with wrong value', () => {
  assert.throws(() => {
    assertOutlineBlockEpisodesConstant(10)
  }, /governance mismatch/)
})

test('assertScriptBatchEpisodesConstant: passes with correct value', () => {
  assert.doesNotThrow(() => {
    assertScriptBatchEpisodesConstant(5)
  })
})

test('assertScriptBatchEpisodesConstant: throws with wrong value', () => {
  assert.throws(() => {
    assertScriptBatchEpisodesConstant(10)
  }, /governance mismatch/)
})

// ---------------------------------------------------------------------------
// Integration: 5集粗纲 + 5集写作 together
// ---------------------------------------------------------------------------

test('integration: 50 episode project produces 10 outline blocks and 10 script batches', () => {
  const episodes = makeEpisodes(50)

  // Outline blocks: 50 / 5 = 10 blocks
  const outlineBlocks = buildOutlineBlocks(episodes)
  assert.equal(outlineBlocks.length, 10, '50 episodes should produce 10 outline blocks')

  // Script batches: 50 / 5 = 10 batches
  const batchContexts = buildScriptBatchContexts({
    outline: { summaryEpisodes: episodes, outlineBlocks: [], planningUnitEpisodes: 10 },
    episodeBeats: [],
    characters: []
  })
  assert.equal(batchContexts.length, 10, '50 episodes should produce 10 script batches')

  // Cross-check computed counts
  assert.equal(computeExpectedOutlineBlockCount(50), 10)
  assert.equal(computeExpectedScriptBatchCount(50), 10)
})

test('integration: episode 25 belongs to outline block 5 and script batch 5', () => {
  const episodes = makeEpisodes(50)
  const outlineBlocks = buildOutlineBlocks(episodes)

  const outline = { outlineBlocks, summaryEpisodes: episodes }

  // Episode 25 should be in block 5 (episodes 21-25)
  const block = findOutlineBlockByEpisode(outline, 25)
  assert.ok(block)
  assert.equal(block!.blockNo, 5)
  assert.equal(block!.startEpisode, 21)
  assert.equal(block!.endEpisode, 25)

  // Episode 25 should be in batch 5 (episodes 21-25)
  const batchContexts = buildScriptBatchContexts({
    outline: { summaryEpisodes: episodes, outlineBlocks: [], planningUnitEpisodes: 10 },
    episodeBeats: [],
    characters: []
  })
  const batch = findScriptBatchContext(batchContexts, 25)
  assert.ok(batch)
  assert.equal(batch!.batchNo, 5)
  assert.equal(batch!.startEpisode, 21)
  assert.equal(batch!.endEpisode, 25)
})

test('buildScriptBatchContexts: emits formal grouped/layered/batched governance per batch', () => {
  const episodes = makeEpisodes(10)
  const batchContexts = buildScriptBatchContexts({
    outline: {
      summaryEpisodes: episodes,
      outlineBlocks: buildOutlineBlocks(episodes),
      planningUnitEpisodes: 5
    },
    episodeBeats: [],
    characters: [
      {
        name: '沈砚',
        biography: '主角',
        publicMask: '',
        hiddenPressure: '守住师门',
        fear: '',
        protectTarget: '',
        conflictTrigger: '天机卷',
        advantage: '',
        weakness: '',
        goal: '追回天机卷',
        arc: '从独行到承担',
        roleLayer: 'core'
      },
      {
        name: '顾迟',
        biography: '对手',
        publicMask: '',
        hiddenPressure: '夺权',
        fear: '',
        protectTarget: '',
        conflictTrigger: '宫门失火',
        advantage: '',
        weakness: '',
        goal: '借天机卷夺权',
        arc: '步步紧逼',
        roleLayer: 'active',
        activeBlockNos: [1]
      }
    ],
    storyContract: {
      characterSlots: {
        protagonist: '沈砚',
        antagonist: '顾迟',
        heroine: '',
        mentor: ''
      },
      eventSlots: {
        finalePayoff: '天机卷归位',
        antagonistPressure: '顾迟逼宫',
        antagonistLoveConflict: '',
        relationshipShift: '',
        healingTechnique: '',
        themeRealization: '承担代价'
      },
      requirements: {
        requireFinalePayoff: true,
        requireHiddenCapabilityForeshadow: false,
        requireAntagonistContinuity: true,
        requireAntagonistLoveConflict: false,
        requireRelationshipShift: false,
        requireHealingTechnique: false,
        requireThemeRealization: true
      },
      hardFacts: ['天机卷牵动师门存亡'],
      softFacts: []
    },
    userAnchorLedger: {
      anchorNames: ['沈砚', '顾迟'],
      protectedFacts: ['天机卷牵动师门存亡'],
      heroineRequired: false,
      heroineHint: ''
    },
    storyIntent: {
      officialKeyCharacters: ['沈砚', '顾迟'],
      lockedCharacterNames: ['沈砚'],
      themeAnchors: ['承担代价'],
      worldAnchors: ['师门'],
      relationAnchors: ['沈砚与顾迟旧日同门反目'],
      dramaticMovement: ['主角扛住对手逼压']
    },
    entityStore: {
      characters: [
        {
          id: 'char-shen-yan',
          projectId: 'project-1',
          type: 'character',
          name: '沈砚',
          aliases: [],
          summary: '主角',
          tags: ['主角'],
          roleLayer: 'core',
          goals: ['追回天机卷'],
          pressures: ['守住师门'],
          linkedFactionIds: ['faction-shimen'],
          linkedLocationIds: ['location-shimen'],
          linkedItemIds: ['item-scroll'],
          provenance: {
            provenanceTier: 'user_declared',
            originAuthorityType: 'user_declared',
            originDeclaredBy: 'user',
            sourceStage: 'character',
            createdAt: '2026-03-23T00:00:00.000Z',
            updatedAt: '2026-03-23T00:00:00.000Z'
          }
        }
      ],
      factions: [
        {
          id: 'faction-shimen',
          projectId: 'project-1',
          type: 'faction',
          name: '师门',
          aliases: [],
          summary: '主角归属势力',
          tags: ['势力'],
          factionType: 'sect',
          memberCharacterIds: ['char-shen-yan'],
          provenance: {
            provenanceTier: 'user_declared',
            originAuthorityType: 'user_declared',
            originDeclaredBy: 'user',
            sourceStage: 'character',
            createdAt: '2026-03-23T00:00:00.000Z',
            updatedAt: '2026-03-23T00:00:00.000Z'
          }
        }
      ],
      locations: [
        {
          id: 'location-shimen',
          projectId: 'project-1',
          type: 'location',
          name: '师门山门',
          aliases: [],
          summary: '主角守护之地',
          tags: ['地点'],
          locationType: 'site',
          controllingFactionId: 'faction-shimen',
          provenance: {
            provenanceTier: 'user_declared',
            originAuthorityType: 'user_declared',
            originDeclaredBy: 'user',
            sourceStage: 'outline',
            createdAt: '2026-03-23T00:00:00.000Z',
            updatedAt: '2026-03-23T00:00:00.000Z'
          }
        }
      ],
      items: [
        {
          id: 'item-scroll',
          projectId: 'project-1',
          type: 'item',
          name: '天机卷',
          aliases: [],
          summary: '关键道具',
          tags: ['道具'],
          itemType: 'artifact',
          ownerCharacterId: 'char-shen-yan',
          provenance: {
            provenanceTier: 'user_declared',
            originAuthorityType: 'user_declared',
            originDeclaredBy: 'user',
            sourceStage: 'outline',
            createdAt: '2026-03-23T00:00:00.000Z',
            updatedAt: '2026-03-23T00:00:00.000Z'
          }
        }
      ],
      relations: []
    }
  })

  const governance = (batchContexts[0] as any).governance

  assert.ok(governance, 'batch should expose formal governance output')
  assert.deepEqual(governance.batched, {
    batchNo: 1,
    startEpisode: 1,
    endEpisode: 5,
    batchUnitEpisodes: 5,
    planningBlockNo: 1,
    planningBlockStartEpisode: 1,
    planningBlockEndEpisode: 5
  })
  assert.ok(Array.isArray(governance.grouped.roleGroups), 'role groups should be formalized')
  assert.ok(Array.isArray(governance.grouped.entityGroups), 'entity groups should be formalized')
  assert.ok(Array.isArray(governance.grouped.threadGroups), 'thread groups should be formalized')
  assert.ok(Array.isArray(governance.layered.roleLayers), 'role layers should be formalized')
  assert.ok(Array.isArray(governance.layered.entityLayers), 'entity layers should be formalized')
  assert.ok(Array.isArray(governance.layered.threadLayers), 'thread layers should be formalized')

  assert.deepEqual(governance.grouped.roleGroups.map((group: any) => group.groupKey).sort(), [
    'batch_active_roles',
    'conflict_roles',
    'core_roles'
  ])
  assert.ok(
    governance.layered.roleLayers.some(
      (layer: any) => layer.layerKey === 'core' && layer.roleNames.includes('沈砚')
    ),
    'core layer should carry core role governance'
  )
  assert.ok(
    governance.layered.threadLayers.some(
      (layer: any) =>
        layer.layerKey === 'critical' &&
        layer.threads.some((thread: any) => thread.thread.includes('顾迟逼宫'))
    ),
    'critical thread layer should carry high-priority narrative threads'
  )
})

test('buildScriptBatchContexts: large projects can express different governance by batch', () => {
  const episodes = makeEpisodes(20)
  const outlineBlocks = buildOutlineBlocks(episodes)
  const batchContexts = buildScriptBatchContexts({
    outline: { summaryEpisodes: episodes, outlineBlocks, planningUnitEpisodes: 5 },
    episodeBeats: [],
    characters: [
      {
        name: '沈砚',
        biography: '主角',
        publicMask: '',
        hiddenPressure: '守住师门',
        fear: '',
        protectTarget: '',
        conflictTrigger: '天机卷',
        advantage: '',
        weakness: '',
        goal: '追回天机卷',
        arc: '从独行到承担',
        roleLayer: 'core'
      },
      {
        name: '顾迟',
        biography: '对手',
        publicMask: '',
        hiddenPressure: '夺权',
        fear: '',
        protectTarget: '',
        conflictTrigger: '宫门失火',
        advantage: '',
        weakness: '',
        goal: '借天机卷夺权',
        arc: '步步紧逼',
        roleLayer: 'active',
        activeBlockNos: [1]
      },
      {
        name: '谢宁',
        biography: '第二规划块主压角色',
        publicMask: '',
        hiddenPressure: '护住边城',
        fear: '',
        protectTarget: '',
        conflictTrigger: '边城军报',
        advantage: '',
        weakness: '',
        goal: '守住边城',
        arc: '从守城到反攻',
        roleLayer: 'active',
        activeBlockNos: [2]
      }
    ],
    activeCharacterBlocks: [
      {
        blockNo: 1,
        startEpisode: 1,
        endEpisode: 10,
        summary: '第一规划块',
        characterNames: ['顾迟'],
        characters: [] as any
      },
      {
        blockNo: 2,
        startEpisode: 11,
        endEpisode: 20,
        summary: '第二规划块',
        characterNames: ['谢宁'],
        characters: [
          {
            name: '谢宁',
            biography: '',
            publicMask: '',
            hiddenPressure: '护住边城',
            fear: '',
            protectTarget: '',
            conflictTrigger: '边城军报',
            advantage: '',
            weakness: '',
            goal: '守住边城',
            arc: '从守城到反攻'
          }
        ]
      }
    ],
    storyContract: {
      characterSlots: {
        protagonist: '沈砚',
        antagonist: '顾迟',
        heroine: '',
        mentor: ''
      },
      eventSlots: {
        finalePayoff: '边城反攻',
        antagonistPressure: '顾迟逼宫',
        antagonistLoveConflict: '',
        relationshipShift: '沈砚与谢宁结盟守城',
        healingTechnique: '',
        themeRealization: '承担代价'
      },
      requirements: {
        requireFinalePayoff: true,
        requireHiddenCapabilityForeshadow: false,
        requireAntagonistContinuity: true,
        requireAntagonistLoveConflict: false,
        requireRelationshipShift: true,
        requireHealingTechnique: false,
        requireThemeRealization: true
      },
      hardFacts: ['边城军报决定第二阶段走向'],
      softFacts: []
    },
    userAnchorLedger: {
      anchorNames: ['沈砚', '顾迟', '谢宁'],
      protectedFacts: ['边城军报决定第二阶段走向'],
      heroineRequired: false,
      heroineHint: ''
    },
    storyIntent: {
      officialKeyCharacters: ['沈砚', '顾迟', '谢宁'],
      lockedCharacterNames: ['沈砚'],
      themeAnchors: ['承担代价'],
      worldAnchors: ['师门', '边城'],
      relationAnchors: ['沈砚与谢宁结盟守城'],
      dramaticMovement: ['第一阶段逼宫', '第二阶段守城反攻']
    },
    entityStore: {
      characters: [
        {
          id: 'char-shen-yan',
          projectId: 'project-1',
          type: 'character',
          name: '沈砚',
          aliases: [],
          summary: '主角',
          tags: ['主角'],
          roleLayer: 'core',
          goals: ['追回天机卷'],
          pressures: ['守住师门'],
          linkedFactionIds: ['faction-shimen'],
          linkedLocationIds: ['location-shimen'],
          linkedItemIds: [],
          provenance: {
            provenanceTier: 'user_declared',
            originAuthorityType: 'user_declared',
            originDeclaredBy: 'user',
            sourceStage: 'character',
            createdAt: '2026-03-23T00:00:00.000Z',
            updatedAt: '2026-03-23T00:00:00.000Z'
          }
        },
        {
          id: 'char-xie-ning',
          projectId: 'project-1',
          type: 'character',
          name: '谢宁',
          aliases: [],
          summary: '边城守将',
          tags: ['守城'],
          roleLayer: 'active',
          goals: ['守住边城'],
          pressures: ['军报压境'],
          linkedFactionIds: ['faction-biancheng'],
          linkedLocationIds: ['location-biancheng'],
          linkedItemIds: [],
          provenance: {
            provenanceTier: 'user_declared',
            originAuthorityType: 'user_declared',
            originDeclaredBy: 'user',
            sourceStage: 'character',
            createdAt: '2026-03-23T00:00:00.000Z',
            updatedAt: '2026-03-23T00:00:00.000Z'
          }
        }
      ],
      factions: [
        {
          id: 'faction-shimen',
          projectId: 'project-1',
          type: 'faction',
          name: '师门',
          aliases: [],
          summary: '主角归属势力',
          tags: ['势力'],
          factionType: 'sect',
          memberCharacterIds: ['char-shen-yan'],
          provenance: {
            provenanceTier: 'user_declared',
            originAuthorityType: 'user_declared',
            originDeclaredBy: 'user',
            sourceStage: 'character',
            createdAt: '2026-03-23T00:00:00.000Z',
            updatedAt: '2026-03-23T00:00:00.000Z'
          }
        },
        {
          id: 'faction-biancheng',
          projectId: 'project-1',
          type: 'faction',
          name: '边城营',
          aliases: [],
          summary: '边城守军',
          tags: ['势力'],
          factionType: 'organization',
          memberCharacterIds: ['char-xie-ning'],
          provenance: {
            provenanceTier: 'user_declared',
            originAuthorityType: 'user_declared',
            originDeclaredBy: 'user',
            sourceStage: 'outline',
            createdAt: '2026-03-23T00:00:00.000Z',
            updatedAt: '2026-03-23T00:00:00.000Z'
          }
        }
      ],
      locations: [
        {
          id: 'location-shimen',
          projectId: 'project-1',
          type: 'location',
          name: '师门山门',
          aliases: [],
          summary: '主角守护之地',
          tags: ['地点'],
          locationType: 'site',
          controllingFactionId: 'faction-shimen',
          provenance: {
            provenanceTier: 'user_declared',
            originAuthorityType: 'user_declared',
            originDeclaredBy: 'user',
            sourceStage: 'outline',
            createdAt: '2026-03-23T00:00:00.000Z',
            updatedAt: '2026-03-23T00:00:00.000Z'
          }
        },
        {
          id: 'location-biancheng',
          projectId: 'project-1',
          type: 'location',
          name: '边城',
          aliases: [],
          summary: '第二阶段主战场',
          tags: ['地点'],
          locationType: 'city',
          controllingFactionId: 'faction-biancheng',
          provenance: {
            provenanceTier: 'user_declared',
            originAuthorityType: 'user_declared',
            originDeclaredBy: 'user',
            sourceStage: 'outline',
            createdAt: '2026-03-23T00:00:00.000Z',
            updatedAt: '2026-03-23T00:00:00.000Z'
          }
        }
      ],
      items: [],
      relations: []
    }
  })

  const firstBatchGovernance = (batchContexts[0] as any).governance
  const thirdBatchGovernance = (batchContexts[2] as any).governance

  assert.equal(firstBatchGovernance.batched.planningBlockNo, 1)
  assert.equal(thirdBatchGovernance.batched.planningBlockNo, 3)
  assert.notDeepEqual(
    firstBatchGovernance.grouped.roleGroups,
    thirdBatchGovernance.grouped.roleGroups,
    'different planning blocks should carry different grouped governance'
  )
  assert.ok(
    thirdBatchGovernance.layered.roleLayers.some(
      (layer: any) => layer.layerKey === 'active' && layer.roleNames.includes('谢宁')
    ),
    'later batches should express different active-layer governance'
  )
})
