import test from 'node:test'
import assert from 'node:assert/strict'

import type { MarketProfileDto } from '@shared/contracts/project'
import type { PromptVariables } from '@shared/contracts/prompt-variables'
import {
  buildOutlineEpisodeBatchPrompt,
  buildOutlineOverviewPrompt
} from './rough-outline-stage-prompts.ts'

const femaleCeoMarketProfile: MarketProfileDto = {
  audienceLane: 'female',
  subgenre: '女频霸总甜宠'
}

const urbanLegalPromptVars: PromptVariables = {
  protagonist: '许知行',
  antagonist: '周明远',
  leverageCharacter: '委托人林夏',
  coreItem: '监控录像',
  organization: '明衡律所',
  worldElement: '舆论压力',
  ruleLeverCharacter: '律所合伙人',
  extraCharacters: ['对方律师', '关键证人'],
  genre: '都市律师判案',
  genreArchetype: 'modern_revenge'
}

const cultivationLeakagePattern = /宗门|仙盟|魔尊血脉|长老|法阵|妖兽|山门|修炼|悟道|大道|封印/u

test('rough outline overview prompt uses female CEO strategy without cultivation leakage', () => {
  const prompt = buildOutlineOverviewPrompt({
    generationBriefText:
      '【项目】契约热搜｜20集\n许晚被豪门集团用契约和热搜逼到绝境，必须拿回股权主动权。',
    totalEpisodes: 20,
    actPlans: [
      { act: 'opening', startEpisode: 1, endEpisode: 5 },
      { act: 'midpoint', startEpisode: 6, endEpisode: 10 },
      { act: 'climax', startEpisode: 11, endEpisode: 15 },
      { act: 'ending', startEpisode: 16, endEpisode: 20 }
    ],
    marketProfile: femaleCeoMarketProfile
  })

  assert.match(prompt, /策略：女频霸总甜宠/)
  assert.match(prompt, /集团|豪门|契约|股权/)
  assert.equal(cultivationLeakagePattern.test(prompt), false)
})

test('rough outline episode batch prompt uses urban legal strategy without cultivation leakage', () => {
  const prompt = buildOutlineEpisodeBatchPrompt({
    generationBriefText:
      '【项目】证据边界｜20集\n许知行接手企业侵权案，围绕监控录像和证据链在庭审中反转。',
    totalEpisodes: 20,
    startEpisode: 1,
    endEpisode: 5,
    overviewSummary: '许知行围绕证据链查明真相，逼对方律师在庭审中露出破绽。',
    actPlans: [
      { act: 'opening', startEpisode: 1, endEpisode: 5 },
      { act: 'midpoint', startEpisode: 6, endEpisode: 10 },
      { act: 'climax', startEpisode: 11, endEpisode: 15 },
      { act: 'ending', startEpisode: 16, endEpisode: 20 }
    ],
    previousEpisodes: [],
    promptVars: urbanLegalPromptVars
  })

  assert.match(prompt, /题材策略/)
  assert.match(prompt, /都市律政|律所|法院|证据链|庭审/)
  assert.equal(cultivationLeakagePattern.test(prompt), false)
})
