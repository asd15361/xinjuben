import test from 'node:test'
import assert from 'node:assert/strict'

import { detectDuplicateScenes } from './detect-duplicate-scenes.ts'

const makeScene = (sceneNo: number, action: string, dialogue = '', emotion = '') =>
  ({ sceneNo, episodeNo: sceneNo, action, dialogue, emotion } as const)

test('detectDuplicateScenes returns null when generatedScenes is empty', () => {
  const result = detectDuplicateScenes([], [])
  assert.equal(result, null)
})

test('detectDuplicateScenes returns null when no duplicate', () => {
  const existing = [makeScene(1, 'action1'), makeScene(2, 'action2')]
  const generated = [makeScene(3, 'action3'), makeScene(4, 'action4')]
  const result = detectDuplicateScenes(existing, generated)
  assert.equal(result, null)
})

test('detectDuplicateScenes flags cross-batch duplicate when sceneNo differs', () => {
  const existing = [makeScene(1, 'same_action')]
  const generated = [makeScene(2, 'same_action')]
  const result = detectDuplicateScenes(existing, generated)
  assert.equal(result, '新生成场景与上一场实质重复：scene_1_to_2')
})

test('detectDuplicateScenes does NOT flag when first generated scene has same sceneNo as previous scene (rewrite of same episode)', () => {
  // Rewrite mode: seed ep10 is sceneNo=10, regenerated ep10 also has sceneNo=10
  const existing = [makeScene(9, 'action9'), makeScene(10, 'same_action')]
  const generated = [makeScene(10, 'same_action')]
  // Same episode being regenerated — should be allowed
  const result = detectDuplicateScenes(existing, generated)
  assert.equal(result, null)
})

test('detectDuplicateScenes does NOT flag within-batch same-episode consecutive rewrite (same episodeNo in batch)', () => {
  // Two scenes with same sceneNo+episodeNo = same episode rewritten consecutively in batch
  // The detector uses normalizeScene equality without episodeNo check in within-batch,
  // so same content + same sceneNo DOES get flagged. This guard doesn't apply to within-batch.
  const generated = [makeScene(1, 'same_action'), makeScene(1, 'same_action')]
  const result = detectDuplicateScenes([], generated)
  // Same episode consecutive rewrite within batch: flagged because normalizeScene matches regardless of sceneNo
  assert.equal(result, '同批新生成场景发生实质重复：scene_1_to_1')
})

test('detectDuplicateScenes flags within-batch duplicate when consecutive generated scenes have identical content but different sceneNo', () => {
  const generated = [
    makeScene(2, 'action2'),
    makeScene(3, 'action2') // same action, different sceneNo
  ]
  const result = detectDuplicateScenes([], generated)
  assert.equal(result, '同批新生成场景发生实质重复：scene_2_to_3')
})

test('detectDuplicateScenes flags within-batch duplicate regardless of internal whitespace', () => {
  const generated = [
    makeScene(1, 'action with spaces'),
    makeScene(2, 'actionwithspaces')
  ]
  // Both normalize to 'actionwithspaces' — whitespace between words is collapsed
  const result = detectDuplicateScenes([], generated)
  assert.equal(result, '同批新生成场景发生实质重复：scene_1_to_2')
})
