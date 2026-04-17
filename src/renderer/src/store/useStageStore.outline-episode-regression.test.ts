import test from 'node:test'
import assert from 'node:assert/strict'

import { useStageStore } from './useStageStore.ts'

function resetStore(): void {
  useStageStore.getState().reset()
}

test('setOutline preserves hydrated 30-episode outline when editing metadata fields', () => {
  resetStore()

  useStageStore.getState().hydrateProjectDrafts({
    outline: {
      title: '韦小宝皇宫奇遇记',
      genre: '古装喜剧',
      theme: '夹缝求生',
      mainConflict: '韦小宝同时被皇帝和天地会信任',
      protagonist: '韦小宝',
      summary: '',
      summaryEpisodes: Array.from({ length: 30 }, (_, index) => ({
        episodeNo: index + 1,
        summary: `第${index + 1}集摘要`
      })),
      facts: []
    }
  })

  useStageStore.getState().setOutline({ title: '韦小宝皇宫奇遇记·改' })

  const outline = useStageStore.getState().outline
  assert.equal(outline.title, '韦小宝皇宫奇遇记·改')
  assert.equal(outline.summaryEpisodes.length, 30)
  assert.equal(outline.summaryEpisodes[29]?.episodeNo, 30)
})
