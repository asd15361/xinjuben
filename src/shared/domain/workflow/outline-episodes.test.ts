import test from 'node:test'
import assert from 'node:assert/strict'

import {
  ensureOutlineEpisodeShape,
  normalizeOutlineEpisodes,
  parseSummaryToOutlineEpisodes
} from './outline-episodes.ts'

test('normalizeOutlineEpisodes respects explicit count over larger inferred episode numbers', () => {
  const episodes = normalizeOutlineEpisodes(
    [
      { episodeNo: 1, summary: '第1集' },
      { episodeNo: 30, summary: '旧第30集残留' }
    ],
    10
  )

  assert.equal(episodes.length, 10)
  assert.equal(episodes[9]?.episodeNo, 10)
})

test('parseSummaryToOutlineEpisodes respects requested count instead of larger inferred labels', () => {
  const episodes = parseSummaryToOutlineEpisodes('第1集：开场\n第30集：旧残留', 10)
  assert.equal(episodes.length, 10)
})

test('ensureOutlineEpisodeShape keeps explicit count instead of outline-derived larger count', () => {
  const normalized = ensureOutlineEpisodeShape(
    {
      title: '修仙传',
      genre: '',
      theme: '',
      protagonist: '',
      mainConflict: '',
      summary: '',
      summaryEpisodes: [{ episodeNo: 30, summary: '旧第30集残留' }],
      facts: []
    },
    10
  )

  assert.equal(normalized.summaryEpisodes.length, 10)
  assert.equal(normalized.summaryEpisodes[9]?.episodeNo, 10)
})

test('ensureOutlineEpisodeShape preserves existing episode count when explicit count is omitted', () => {
  const normalized = ensureOutlineEpisodeShape({
    title: '韦小宝皇宫奇遇记',
    genre: '',
    theme: '',
    protagonist: '',
    mainConflict: '',
    summary: '',
    summaryEpisodes: Array.from({ length: 30 }, (_, index) => ({
      episodeNo: index + 1,
      summary: `第${index + 1}集摘要`
    })),
    facts: []
  })

  assert.equal(normalized.summaryEpisodes.length, 30)
  assert.equal(normalized.summaryEpisodes[29]?.episodeNo, 30)
})
