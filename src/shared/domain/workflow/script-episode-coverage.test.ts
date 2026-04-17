import test from 'node:test'
import assert from 'node:assert/strict'

import {
  collectOverflowScriptEpisodeNos,
  countCoveredScriptEpisodes,
  mergeScriptByEpisodeNo,
  restrictScriptToTargetEpisodes
} from './script-episode-coverage.ts'

test('countCoveredScriptEpisodes only counts episodes within the target range', () => {
  const script = Array.from({ length: 11 }, (_, index) => ({
    sceneNo: index + 1,
    action: `第${index + 1}集动作`,
    dialogue: '',
    emotion: ''
  }))

  assert.equal(countCoveredScriptEpisodes(script, 10), 10)
  assert.deepEqual(collectOverflowScriptEpisodeNos(script, 10), [11])
})

test('mergeScriptByEpisodeNo overwrites target episodes and trims overflow episodes', () => {
  const merged = mergeScriptByEpisodeNo(
    [
      { sceneNo: 1, action: '旧1', dialogue: '', emotion: '' },
      { sceneNo: 2, action: '旧2', dialogue: '', emotion: '' },
      { sceneNo: 11, action: '旧11', dialogue: '', emotion: '' }
    ],
    [{ sceneNo: 2, action: '新2', dialogue: '', emotion: '' }],
    10
  )

  assert.deepEqual(
    restrictScriptToTargetEpisodes(merged, 10).map((scene) => [scene.sceneNo, scene.action]),
    [
      [1, '旧1'],
      [2, '新2']
    ]
  )
  assert.deepEqual(collectOverflowScriptEpisodeNos(merged, 10), [])
})
