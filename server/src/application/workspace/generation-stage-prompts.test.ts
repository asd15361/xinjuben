import test from 'node:test'
import assert from 'node:assert/strict'

import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { MarketProfileDto } from '@shared/contracts/project'
import type { CharacterDraftDto, OutlineDraftDto } from '@shared/contracts/workflow'
import { buildDetailedOutlineActPrompt } from './generation-stage-prompts.ts'

const cultivationLeakagePattern = /宗门|仙盟|魔尊血脉|长老|法阵|妖兽|山门|修炼|悟道|大道|封印/u

const femaleCeoMarketProfile: MarketProfileDto = {
  audienceLane: 'female',
  subgenre: '女频霸总甜宠'
}

const femaleCeoStoryIntent = {
  titleHint: '契约热搜',
  genre: '女频霸总甜宠',
  protagonist: '许晚',
  antagonist: '顾明修',
  coreConflict: '许晚被豪门集团用契约和热搜逼到绝境，必须拿回股权主动权。',
  generationBriefText: '许晚被豪门集团用契约、热搜和股权协议逼到绝境。',
  marketProfile: femaleCeoMarketProfile,
  officialKeyCharacters: ['许晚', '顾明修', '沈知意']
} as StoryIntentPackageDto

const femaleCeoOutline = {
  title: '契约热搜',
  genre: '女频霸总甜宠',
  theme: '在契约关系里夺回主动权',
  protagonist: '许晚',
  mainConflict: '许晚围绕契约、股权和热搜舆论反击豪门控制。',
  summary: '许晚被集团和豪门舆论压住，逐步拿回股权证据和情感主动权。',
  summaryEpisodes: [
    { episodeNo: 1, summary: '许晚被顾家用契约逼签补充协议，热搜同时爆开。' },
    { episodeNo: 2, summary: '许晚找到账本线索，沈知意替她拖住集团公关。' }
  ],
  facts: []
} as OutlineDraftDto

const femaleCeoCharacters: CharacterDraftDto[] = [
  {
    name: '许晚',
    biography: '许晚被契约和股权协议压住，必须用证据拿回主动权。',
    publicMask: '表面低头配合集团安排，暗里保存录音和股权文件。',
    hiddenPressure: '她一旦失手，母亲留下的股权会被顾家吞掉。',
    fear: '失去母亲股权和最后的自由。',
    protectTarget: '母亲股权文件和沈知意。',
    conflictTrigger: '顾家拿补充协议和热搜逼她公开认错时。',
    advantage: '她熟悉顾家合同漏洞，手里有录音线索。',
    weakness: '她还需要沈知意作证，不能过早撕破脸。',
    goal: '拿回股权主动权并戳穿顾家舆论局。',
    arc: '起点：被契约压住；触发：热搜爆开；摇摆：证人被逼沉默；代价选择：公开录音；终局变化：拿回谈判主动权。'
  } as CharacterDraftDto
]

test('detailed outline prompt uses female CEO strategy without cultivation leakage', () => {
  const prompt = buildDetailedOutlineActPrompt({
    outline: femaleCeoOutline,
    characters: femaleCeoCharacters,
    storyIntent: femaleCeoStoryIntent,
    act: 'opening',
    startEpisode: 1,
    endEpisode: 2,
    episodes: femaleCeoOutline.summaryEpisodes,
    marketProfile: femaleCeoMarketProfile
  })

  assert.match(prompt, /策略：女频霸总甜宠/)
  assert.match(prompt, /集团|豪门|契约|股权|热搜/)
  assert.equal(cultivationLeakagePattern.test(prompt), false)
})
