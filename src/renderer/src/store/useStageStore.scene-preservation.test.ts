import test from 'node:test'
import assert from 'node:assert/strict'

import { useStageStore } from './useStageStore.ts'

test('setSegmentEpisodeBeat preserves sceneByScene when editing episode summary', () => {
  useStageStore.getState().reset()

  useStageStore.getState().replaceSegments([
    {
      act: 'opening',
      content: '开局段',
      hookType: '入局钩子',
      episodeBeats: [
        {
          episodeNo: 1,
          summary: '原始摘要',
          sceneByScene: [{ sceneNo: 1, setup: '原始场次', tension: '原始压强' }]
        }
      ]
    }
  ])

  useStageStore.getState().setSegmentEpisodeBeat('opening', 1, '用户改过的摘要')

  const segment = useStageStore.getState().segments.find((item) => item.act === 'opening')
  assert.ok(segment)
  assert.equal(segment.episodeBeats?.[0]?.summary, '用户改过的摘要')
  assert.deepEqual(segment.episodeBeats?.[0]?.sceneByScene, [
    { sceneNo: 1, location: '', timeOfDay: '', setup: '原始场次', tension: '原始压强', hookEnd: '' }
  ])
})
