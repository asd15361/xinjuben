import test from 'node:test'
import assert from 'node:assert/strict'

import type { OutlineDraftDto } from '@shared/contracts/workflow'
import { buildEpisodeSceneDirectives } from './build-episode-scene-directives'

function buildOutline(overrides: Partial<OutlineDraftDto> = {}): OutlineDraftDto {
  return {
    title: '测试项目',
    genre: '都市律师判案',
    theme: '',
    protagonist: '许知行',
    mainConflict: '许知行围绕证据链和对方律师庭审交锋',
    summary: '第1集：律师接案并发现证据链缺口。',
    summaryEpisodes: Array.from({ length: 5 }, (_, index) => ({
      episodeNo: index + 1,
      summary: `第${index + 1}集推进案件`
    })),
    facts: [],
    ...overrides
  }
}

test('non-xianxia scene directives use strategy lexicon without cultivation leakage', () => {
  const directives = buildEpisodeSceneDirectives(buildOutline(), 1, {
    genre: '都市律师判案'
  })
  const text = directives.join('\n')

  assert.match(text, /律所|法院|律师|证据链|庭审/)
  assert.equal(/宗门|仙盟|魔尊血脉|长老|法阵|妖兽|运功/u.test(text), false)
})

test('xianxia scene directives keep the existing cultivation-specific pressure rules', () => {
  const directives = buildEpisodeSceneDirectives(
    buildOutline({
      genre: '男频玄幻修仙',
      mainConflict: '凌寒被宗门和仙盟争夺魔尊血脉'
    }),
    5,
    {
      genre: '男频玄幻修仙'
    }
  )
  const text = directives.join('\n')

  assert.match(text, /宗门|长老|法阵|妖兽/)
})
