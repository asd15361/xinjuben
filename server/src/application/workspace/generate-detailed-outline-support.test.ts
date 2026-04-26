import test from 'node:test'
import assert from 'node:assert/strict'

import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { MarketProfileDto } from '@shared/contracts/project'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto
} from '@shared/contracts/workflow'
import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { generateDetailedOutlineFromContext } from './generate-detailed-outline-support.ts'

const femaleCeoMarketProfile: MarketProfileDto = {
  audienceLane: 'female',
  subgenre: '女频霸总甜宠'
}

const femaleCeoStoryIntent = {
  titleHint: '契约热搜',
  genre: '女频霸总甜宠',
  protagonist: '许晚',
  antagonist: '顾明修',
  coreConflict: '许晚被豪门集团用契约和热搜逼到绝境。',
  generationBriefText: '【项目】契约热搜｜4集\n许晚围绕契约、股权和热搜反击顾家。',
  marketProfile: femaleCeoMarketProfile,
  officialKeyCharacters: ['许晚', '顾明修']
} as StoryIntentPackageDto

const femaleCeoOutline = {
  title: '契约热搜',
  genre: '女频霸总甜宠',
  theme: '在契约关系里夺回主动权',
  protagonist: '许晚',
  mainConflict: '许晚围绕契约、股权和热搜舆论反击豪门控制。',
  summary: '许晚被集团和豪门舆论压住，逐步拿回股权证据和情感主动权。',
  summaryEpisodes: [
    { episodeNo: 1, summary: '许晚被顾家用契约逼签补充协议。' },
    { episodeNo: 2, summary: '许晚找到账本线索。' },
    { episodeNo: 3, summary: '顾家用热搜反咬她。' },
    { episodeNo: 4, summary: '许晚公开证据反击。' }
  ],
  facts: []
} as OutlineDraftDto

const femaleCeoCharacters: CharacterDraftDto[] = [
  {
    name: '许晚',
    biography: '许晚被契约和股权协议压住，必须用证据拿回主动权。',
    publicMask: '表面低头配合集团安排，暗里保存录音和股权文件。',
    hiddenPressure: '母亲留下的股权会被顾家吞掉。',
    fear: '失去母亲股权和最后的自由。',
    protectTarget: '母亲股权文件。',
    conflictTrigger: '顾家拿补充协议和热搜逼她公开认错时。',
    advantage: '熟悉顾家合同漏洞。',
    weakness: '需要证人作证，不能过早撕破脸。',
    goal: '拿回股权主动权并戳穿顾家舆论局。',
    arc: '起点：被契约压住；触发：热搜爆开；摇摆：证人沉默；代价选择：公开录音；终局变化：拿回谈判主动权。'
  } as CharacterDraftDto
]

test('detailed outline generation repairs strategy contamination before returning segments', async () => {
  const diagnosticMessages: string[] = []
  const result = await generateDetailedOutlineFromContext(
    {
      outline: femaleCeoOutline,
      characters: femaleCeoCharacters,
      storyIntent: femaleCeoStoryIntent,
      runtimeConfig: {} as RuntimeProviderConfig,
      diagnosticLogger: async (message) => {
        diagnosticMessages.push(message)
      }
    },
    {
      invokeAct: async ({ plan }) =>
        ({
          act: plan.act,
          startEpisode: plan.startEpisode,
          endEpisode: plan.endEpisode,
          content: '宗门围绕魔尊血脉逼女主退让，仙盟趁机审判。',
          hookType: '反击钩子',
          episodeBeats: [
            {
              episodeNo: plan.startEpisode,
              summary: '宗门长老用魔尊血脉威胁女主。',
              sceneByScene: [
                {
                  sceneNo: 1,
                  location: '会议室',
                  timeOfDay: '白天',
                  setup: '仙盟拿出灵根报告。',
                  tension: '宗门要求她交出魔尊血脉。',
                  hookEnd: '她反手调出证据。'
                }
              ]
            }
          ]
        }) as DetailedOutlineSegmentDto,
      decorateSegmentWithEpisodeControlCards: async ({ segment }) => segment
    }
  )

  const serialized = JSON.stringify(result.segments)
  assert.equal(/宗门|仙盟|魔尊血脉|灵根|长老/u.test(serialized), false)
  assert.match(serialized, /集团/)
  assert.match(serialized, /契约/)
  assert.match(serialized, /总裁/)
  assert.ok(
    diagnosticMessages.some((message) =>
      message.includes('strategy_contamination_repaired stage=detailed_outline')
    )
  )
})
