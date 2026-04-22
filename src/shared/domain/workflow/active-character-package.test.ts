import test from 'node:test'
import assert from 'node:assert/strict'

import type { ProjectEntityStoreDto } from '../../contracts/entities.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineEpisodeBeatDto,
  OutlineDraftDto
} from '../../contracts/workflow.ts'
import { deriveActiveCharacterPackage } from './active-character-package.ts'

function makeOutline(): OutlineDraftDto {
  return {
    title: '玄玉宫',
    genre: '修仙',
    theme: '藏锋反咬',
    mainConflict: '沈砚在宗门围杀里争回少主位',
    protagonist: '沈砚',
    summary: '整季围绕玄玉宫内斗展开。',
    planningUnitEpisodes: 5,
    outlineBlocks: [],
    summaryEpisodes: [
      { episodeNo: 1, summary: '沈砚被玄玉宫通缉，外门执事陆青禾奉命封山搜人。' },
      { episodeNo: 2, summary: '沈砚借禁地反咬，陆青禾开始动摇。' },
      { episodeNo: 3, summary: '玄玉宫追兵压到集市，沈砚被迫亮底。' },
      { episodeNo: 4, summary: '陆青禾拿到旧账册，决定先瞒一手。' },
      { episodeNo: 5, summary: '宗门内斗升级，沈砚要抢回入山路。' },
      { episodeNo: 6, summary: '裴长老带刑堂入场，要当众废掉沈砚。' },
      { episodeNo: 7, summary: '沈砚反咬裴长老，陆青禾站队被逼表态。' },
      { episodeNo: 8, summary: '刑堂和玄玉宫长老会撕破脸。' }
    ],
    facts: []
  }
}

function makeCharacterDrafts(): CharacterDraftDto[] {
  return [
    {
      masterEntityId: 'char_lead',
      name: '沈砚',
      biography: '被逐的少主，靠禁地旧账反咬回山。',
      publicMask: '先装成被追到走投无路。',
      hiddenPressure: '一旦抢不回旧账就再无翻盘路。',
      fear: '旧账和师门旧部一起被灭口',
      protectTarget: '玄玉宫旧部',
      conflictTrigger: '有人当众拿少主名分踩他',
      advantage: '熟悉禁地旧路',
      weakness: '太想一次翻盘',
      goal: '抢回少主位',
      arc: '从只想自保到正面夺权',
      roleLayer: 'core'
    },
    {
      masterEntityId: 'char_guard',
      name: '陆青禾',
      biography: '外门执事，负责封山搜人。',
      publicMask: '先按门规行事，不轻易露口风。',
      hiddenPressure: '知道旧账一旦见光会连自己一起出事。',
      fear: '被长老会当弃子',
      protectTarget: '自己手里的旧账册',
      conflictTrigger: '被逼当众站队',
      advantage: '能调动外门人手',
      weakness: '不敢彻底撕破脸',
      goal: '先保命再选边',
      arc: '从奉命搜人到被迫选边',
      roleLayer: 'active',
      activeBlockNos: [1, 2]
    },
    {
      name: '苏挽',
      biography: '集市药铺东家，替沈砚藏过一次伤口。',
      publicMask: '表面只认钱。',
      hiddenPressure: '药铺账本捏在刑堂手里。',
      fear: '药铺被抄',
      protectTarget: '药铺学徒',
      conflictTrigger: '刑堂动她药铺',
      advantage: '消息灵',
      weakness: '地盘太小',
      goal: '保住药铺',
      arc: '从只想躲事到被拉进局',
      roleLayer: 'active',
      activeBlockNos: [2]
    }
  ]
}

function makeEntityStore(): ProjectEntityStoreDto {
  return {
    characters: [
      {
        id: 'char_lead',
        projectId: 'project-1',
        type: 'character',
        name: '沈砚',
        aliases: [],
        summary: '被逐少主',
        tags: ['核心人物'],
        roleLayer: 'core',
        goals: ['抢回少主位'],
        pressures: ['被玄玉宫围杀'],
        linkedFactionIds: ['faction_xuanyu'],
        linkedLocationIds: [],
        linkedItemIds: [],
        provenance: {
          provenanceTier: 'system_inferred',
          originAuthorityType: 'system_inferred',
          originDeclaredBy: 'system',
          sourceStage: 'chat',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z'
        }
      },
      {
        id: 'char_guard',
        projectId: 'project-1',
        type: 'character',
        name: '陆青禾',
        aliases: [],
        summary: '外门执事',
        tags: ['活跃人物'],
        roleLayer: 'active',
        goals: ['先保命再选边'],
        pressures: ['被长老会盯着'],
        linkedFactionIds: ['faction_xuanyu'],
        linkedLocationIds: [],
        linkedItemIds: [],
        provenance: {
          provenanceTier: 'system_inferred',
          originAuthorityType: 'system_inferred',
          originDeclaredBy: 'system',
          sourceStage: 'chat',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z'
        }
      },
      {
        id: 'char_elder',
        projectId: 'project-1',
        type: 'character',
        name: '裴长老',
        aliases: [],
        summary: '刑堂掌刑长老',
        tags: ['活跃人物'],
        roleLayer: 'active',
        goals: ['废掉沈砚'],
        pressures: ['要给长老会交差'],
        linkedFactionIds: ['faction_xuanyu'],
        linkedLocationIds: [],
        linkedItemIds: [],
        provenance: {
          provenanceTier: 'system_inferred',
          originAuthorityType: 'system_inferred',
          originDeclaredBy: 'system',
          sourceStage: 'chat',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z'
        }
      },
      {
        id: 'char_shopkeeper',
        projectId: 'project-1',
        type: 'character',
        name: '白掌柜',
        aliases: [],
        summary: '玄玉宫外线商贩',
        tags: ['功能人物'],
        roleLayer: 'functional',
        goals: ['卖消息'],
        pressures: ['怕得罪两头'],
        linkedFactionIds: ['faction_market'],
        linkedLocationIds: [],
        linkedItemIds: [],
        provenance: {
          provenanceTier: 'system_inferred',
          originAuthorityType: 'system_inferred',
          originDeclaredBy: 'system',
          sourceStage: 'chat',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z'
        }
      },
      {
        id: 'char_slot_xuanyu_steward',
        projectId: 'project-1',
        type: 'character',
        name: '玄玉宫·执事位',
        aliases: [],
        summary: '玄玉宫里的执事位，负责执行宗门命令。',
        tags: ['轻量人物卡', '势力人物位'],
        roleLayer: 'active',
        goals: ['稳住玄玉宫这条执行线'],
        pressures: ['必须先保玄玉宫的利益'],
        linkedFactionIds: ['faction_xuanyu'],
        linkedLocationIds: [],
        linkedItemIds: [],
        identityMode: 'slot',
        slotKey: 'faction_xuanyu:steward',
        factionRole: '执事位',
        rankLevel: 'mid',
        publicIdentity: '玄玉宫执事',
        stance: '先保玄玉宫利益',
        currentFunction: '负责执行宗门命令',
        voiceStyle: '门规先行，口风硬',
        upgradeCandidate: true,
        provenance: {
          provenanceTier: 'system_inferred',
          originAuthorityType: 'system_inferred',
          originDeclaredBy: 'system',
          sourceStage: 'chat',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z'
        }
      }
    ],
    factions: [
      {
        id: 'faction_xuanyu',
        projectId: 'project-1',
        type: 'faction',
        name: '玄玉宫',
        aliases: [],
        summary: '内斗中的宗门',
        tags: ['势力'],
        factionType: 'sect',
        memberCharacterIds: ['char_lead', 'char_guard', 'char_elder'],
        provenance: {
          provenanceTier: 'system_inferred',
          originAuthorityType: 'system_inferred',
          originDeclaredBy: 'system',
          sourceStage: 'chat',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z'
        }
      },
      {
        id: 'faction_market',
        projectId: 'project-1',
        type: 'faction',
        name: '黑市',
        aliases: [],
        summary: '卖消息的地盘',
        tags: ['势力'],
        factionType: 'organization',
        memberCharacterIds: ['char_shopkeeper'],
        provenance: {
          provenanceTier: 'system_inferred',
          originAuthorityType: 'system_inferred',
          originDeclaredBy: 'system',
          sourceStage: 'chat',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z'
        }
      }
    ],
    locations: [],
    items: [],
    relations: []
  }
}

function makeEpisodeBeats(): DetailedOutlineEpisodeBeatDto[] {
  return [
    {
      episodeNo: 6,
      summary: '裴长老带刑堂围场。',
      sceneByScene: [
        {
          sceneNo: 1,
          location: '玄玉宫山门',
          timeOfDay: '日',
          setup: '裴长老带刑堂当众围住沈砚。',
          tension: '陆青禾必须立刻表态。',
          hookEnd: '裴长老要当众废人。'
        }
      ]
    }
  ]
}

test('deriveActiveCharacterPackage keeps current batch on active people instead of full roster', () => {
  const result = deriveActiveCharacterPackage({
    outline: makeOutline(),
    characterDrafts: makeCharacterDrafts(),
    entityStore: makeEntityStore(),
    startEpisode: 1,
    endEpisode: 5
  })

  assert.deepStrictEqual(
    result.members.map((member) => ({
      name: member.name,
      source: member.source,
      isNewThisBatch: member.isNewThisBatch,
      needsUpgrade: member.needsUpgrade
    })),
    [
      { name: '沈砚', source: 'full_profile', isNewThisBatch: true, needsUpgrade: false },
      { name: '陆青禾', source: 'full_profile', isNewThisBatch: true, needsUpgrade: false }
    ]
  )
  assert.deepStrictEqual(result.debutCharacterNames, ['沈砚', '陆青禾'])
  assert.deepStrictEqual(result.carryOverCharacterNames, [])
  assert.deepStrictEqual(result.upgradeCandidateNames, [])
})

test('deriveActiveCharacterPackage brings in light cards that become active in the current batch', () => {
  const result = deriveActiveCharacterPackage({
    outline: makeOutline(),
    characterDrafts: makeCharacterDrafts(),
    entityStore: makeEntityStore(),
    startEpisode: 6,
    endEpisode: 8,
    episodeBeats: makeEpisodeBeats()
  })

  assert.deepStrictEqual(result.memberNames, ['沈砚', '陆青禾', '苏挽', '裴长老'])
  assert.deepStrictEqual(result.debutCharacterNames, ['苏挽', '裴长老'])
  assert.deepStrictEqual(result.carryOverCharacterNames, ['沈砚', '陆青禾'])
  assert.deepStrictEqual(result.upgradeCandidateNames, ['裴长老'])

  const elder = result.members.find((member) => member.name === '裴长老')
  assert.ok(elder)
  assert.equal(elder?.source, 'light_card')
  assert.equal(elder?.roleLayer, 'active')
  assert.equal(elder?.masterEntityId, 'char_elder')
  assert.equal(elder?.needsUpgrade, true)
  assert.deepStrictEqual(elder?.factionNames, ['玄玉宫'])
  assert.ok(!result.memberNames.includes('玄玉宫·执事位'))

  const elderDraft = result.characters.find((character) => character.name === '裴长老')
  assert.ok(elderDraft)
  assert.equal(elderDraft?.masterEntityId, 'char_elder')
  assert.equal(elderDraft?.goal, '废掉沈砚')
})
