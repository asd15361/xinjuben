import test from 'node:test'
import assert from 'node:assert/strict'
import { summarizeSceneFragment } from './ledger-scene-summary.ts'
import { buildStoryMomentum } from './ledger-momentum.ts'
import { buildKnowledgeBoundaries } from './ledger-knowledge-boundaries.ts'

test('summarizeSceneFragment clips long screenplay into a short recap', () => {
  const scene = {
    sceneNo: 12,
    screenplay: [
      '第12集',
      '1-1 晨雾',
      '人物：黎明，小柔',
      ...Array.from({ length: 12 }, () => '△黎明背起小柔冲向侧殿，反复核对残页与油纸包。')
    ].join('\n'),
    action: '旧 action',
    dialogue: '旧 dialogue',
    emotion: '旧 emotion'
  }

  const summary = summarizeSceneFragment(scene, { maxLength: 100, sentenceLimit: 2 })
  assert.ok(summary.length <= 100)
  assert.match(summary, /黎明背起小柔冲向侧殿/)
})

test('buildStoryMomentum keeps activeConflictLine and pendingCost as recap-level text', () => {
  const scene = {
    sceneNo: 12,
    screenplay: [
      '第12集',
      ...Array.from({ length: 10 }, () => '△黎明背小柔疾走，赶在侧殿验页前交齐账册。')
    ].join('\n'),
    action: '△黎明背小柔疾走。'.repeat(20),
    dialogue: '黎明：得赶在师父验页前，交齐账册。'.repeat(10),
    emotion: '李诚阳：规矩能借，也能反噬。'.repeat(10)
  }

  const momentum = buildStoryMomentum({
    outline: {
      title: '修仙传',
      genre: '权谋',
      theme: '隐忍藏锋',
      protagonist: '黎明',
      mainConflict: '黎明与李科围绕证据和小柔展开周旋',
      summary: '',
      summaryEpisodes: [],
      facts: [],
      outlineBlocks: [],
      planningUnitEpisodes: 20
    },
    script: [scene],
    unresolvedSignals: [],
    latestHook: scene.dialogue
  })

  assert.ok(momentum.activeConflictLine.length <= 120)
  assert.ok(momentum.pendingCost.length <= 80)
  assert.doesNotMatch(
    momentum.activeConflictLine,
    /得赶在师父验页前，交齐账册。.*得赶在师父验页前，交齐账册。/
  )
})

test('buildKnowledgeBoundaries keeps publicFacts compact', () => {
  const scene = {
    sceneNo: 12,
    screenplay: [
      '第12集',
      ...Array.from({ length: 10 }, () => '△黎明背起小柔进侧殿，对质残页真伪。')
    ].join('\n'),
    action: '△黎明背起小柔进侧殿。'.repeat(20),
    dialogue: '黎明：真底页在此。'.repeat(12),
    emotion: '小柔：像能守住东西的人。'.repeat(8)
  }

  const boundaries = buildKnowledgeBoundaries({
    outline: {
      title: '修仙传',
      genre: '权谋',
      theme: '隐忍藏锋',
      protagonist: '黎明',
      mainConflict: '黎明与李科围绕证据和小柔展开周旋',
      summary: '',
      summaryEpisodes: [],
      facts: [],
      outlineBlocks: [],
      planningUnitEpisodes: 20
    },
    script: [scene],
    characters: [{ name: '黎明' } as never]
  })

  assert.equal(boundaries.publicFacts.length, 2)
  assert.ok(boundaries.publicFacts[1]!.length <= 100)
  assert.doesNotMatch(boundaries.publicFacts[1]!, /真底页在此。.*真底页在此。/)
})
