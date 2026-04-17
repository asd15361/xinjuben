import test from 'node:test'
import assert from 'node:assert/strict'

import { buildEpisodePlans } from './build-episode-plans.ts'

test('resume plan never extends beyond target episodes after the target is already fully covered', () => {
  const episodePlans = buildEpisodePlans({
    mode: 'resume',
    targetEpisodes: 10,
    resumeStartEpisode: 11,
    stageValidation: { targetStage: 'script', ready: true, issues: [] },
    lane: 'deepseek',
    outline: {
      title: '测试',
      genre: '悬疑',
      theme: '代价',
      mainConflict: '冲突',
      protagonist: '主角',
      summary: '',
      summaryEpisodes: Array.from({ length: 10 }, (_, index) => ({
        episodeNo: index + 1,
        summary: `第${index + 1}集`
      })),
      facts: []
    },
    characters: [],
    segments: [],
    script: [],
    hasDenseStructure: false,
    runtimeFailureHistory: []
  })

  assert.equal(episodePlans.length, 10)
  assert.equal(episodePlans.at(-1)?.episodeNo, 10)
  assert.equal(
    episodePlans.every((episode) => episode.episodeNo <= 10),
    true
  )
})
