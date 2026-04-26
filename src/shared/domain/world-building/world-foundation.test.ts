import test from 'node:test'
import assert from 'node:assert/strict'

import type { ProjectEntityStoreDto } from '../../contracts/entities.ts'
import type { FactionMatrixDto } from '../../contracts/faction-matrix.ts'
import type { StoryIntentPackageDto } from '../../contracts/intake.ts'
import {
  attachStoryFoundationToIntent,
  deriveCharacterRoster,
  deriveWorldBibleFromStoryIntent
} from './world-foundation.ts'

function buildStoryIntent(): StoryIntentPackageDto {
  return {
    titleHint: '玄玉宗风云',
    genre: '男频玄幻修仙',
    tone: '',
    audience: '',
    sellingPremise: '废灵根少年在宗门审判中觉醒旧神血脉',
    coreDislocation: '人人看不起的外门废柴，其实背着旧神血脉',
    emotionalPayoff: '当众翻盘',
    protagonist: '林夜',
    antagonist: '玄玉长老',
    coreConflict: '林夜查清玄玉宗和黑市刺客组织的血脉交易',
    endingDirection: '清算宗门黑幕',
    officialKeyCharacters: ['林夜', '玄玉长老'],
    lockedCharacterNames: ['林夜', '玄玉长老'],
    themeAnchors: [],
    worldAnchors: ['玄玉宗掌控边城修行资源', '黑市刺客组织盘踞地下场域'],
    relationAnchors: ['宗门审判场', '边城黑市'],
    dramaticMovement: [],
    generationBriefText: [
      '【项目】玄玉宗风云｜60集',
      '【世界观与故事背景】玄玉宗、边城黑市和刺客组织共同控制修行资源，普通弟子被宗门规则压榨。'
    ].join('\n'),
    storySynopsis: {
      logline: '废灵根少年觉醒旧神血脉',
      openingPressureEvent: '测灵台判废体',
      protagonistCurrentDilemma: '功劳被夺，婚约被撕',
      firstFaceSlapEvent: '测灵石炸裂',
      antagonistForce: '玄玉长老',
      antagonistPressureMethod: '用宗门规矩废他灵脉',
      corePayoff: '逆袭翻盘',
      stageGoal: '查清血脉交易',
      finaleDirection: '登顶清算'
    }
  }
}

function buildEntityStore(): ProjectEntityStoreDto {
  const now = '2026-04-27T00:00:00.000Z'
  const provenance = {
    provenanceTier: 'user_declared' as const,
    originAuthorityType: 'user_declared' as const,
    originDeclaredBy: 'user' as const,
    sourceStage: 'chat' as const,
    createdAt: now,
    updatedAt: now
  }
  return {
    characters: [
      {
        id: 'char_linye',
        projectId: 'p1',
        type: 'character',
        name: '林夜',
        aliases: [],
        summary: '主角',
        tags: [],
        provenance,
        roleLayer: 'core',
        goals: [],
        pressures: [],
        linkedFactionIds: ['faction_xuanyu'],
        linkedLocationIds: [],
        linkedItemIds: []
      },
      {
        id: 'char_guard_a',
        projectId: 'p1',
        type: 'character',
        name: '山门守卫甲',
        aliases: [],
        summary: '负责拦路、传话和引出宗门审判',
        tags: [],
        provenance,
        roleLayer: 'functional',
        goals: [],
        pressures: [],
        linkedFactionIds: ['faction_xuanyu'],
        linkedLocationIds: [],
        linkedItemIds: [],
        identityMode: 'slot'
      }
    ],
    factions: [
      {
        id: 'faction_xuanyu',
        projectId: 'p1',
        type: 'faction',
        name: '玄玉宗',
        aliases: [],
        summary: '控制边城修行资源',
        tags: [],
        provenance,
        factionType: 'sect',
        memberCharacterIds: ['char_linye', 'char_guard_a']
      }
    ],
    locations: [],
    items: [],
    relations: []
  }
}

function buildFactionMatrix(): FactionMatrixDto {
  return {
    title: '玄玉宗风云',
    totalEpisodes: 60,
    landscapeSummary: '玄玉宗、边城黑市和刺客组织互相利用。',
    factions: [],
    crossRelations: [],
    factionTimetable: []
  }
}

test('deriveWorldBibleFromStoryIntent promotes world background into a formal world bible', () => {
  const worldBible = deriveWorldBibleFromStoryIntent(buildStoryIntent())

  assert.match(worldBible.definition, /玄玉宗/)
  assert.equal(worldBible.worldType, '男频玄幻修仙')
  assert.ok(worldBible.coreResources.some((item) => item.includes('血脉交易')))
})

test('deriveCharacterRoster keeps functional and crowd slots in the formal roster', () => {
  const roster = deriveCharacterRoster({
    entityStore: buildEntityStore(),
    factionMatrix: buildFactionMatrix(),
    totalEpisodes: 60
  })

  assert.equal(roster.minimumRoleSlots, 30)
  assert.equal(roster.standardRoleSlots, 39)
  assert.ok(roster.entries.some((entry) => entry.name === '林夜' && entry.layer === 'core'))
  assert.ok(
    roster.entries.some(
      (entry) =>
        entry.name === '山门守卫甲' &&
        entry.layer === 'crowd' &&
        entry.dialoguePotential === 'one_line'
    )
  )
})

test('attachStoryFoundationToIntent persists world, faction and roster assets on storyIntent', () => {
  const storyIntent = attachStoryFoundationToIntent({
    storyIntent: buildStoryIntent(),
    entityStore: buildEntityStore(),
    factionMatrix: buildFactionMatrix(),
    totalEpisodes: 60
  })

  assert.ok(storyIntent.worldBible)
  assert.ok(storyIntent.factionMatrix)
  assert.ok(storyIntent.characterRoster)
  assert.ok(storyIntent.storyFoundation)
  assert.equal(storyIntent.storyFoundation?.characterRoster.totalEpisodes, 60)
})
