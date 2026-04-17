import test from 'node:test'
import assert from 'node:assert/strict'

import type { ProjectEntityStoreDto } from '../../../../../shared/contracts/entities.ts'
import type { CharacterDraftDto } from '../../../../../shared/contracts/workflow.ts'
import {
  buildCharacterStageSections,
  createCharacterDraftFromEntityStore
} from './derive-character-stage-sections.ts'

function makeEntityStore(): ProjectEntityStoreDto {
  return {
    characters: [
      {
        id: 'char_lead',
        projectId: 'project-1',
        type: 'character',
        name: '沈砚',
        aliases: [],
        summary: '玄玉宫失势少主',
        tags: ['核心人物'],
        roleLayer: 'core',
        goals: ['夺回玄玉宫'],
        pressures: ['被长老会追杀'],
        linkedFactionIds: ['faction_xuanyu'],
        linkedLocationIds: [],
        linkedItemIds: [],
        provenance: {
          provenanceTier: 'plot_inferred',
          originAuthorityType: 'plot_inferred',
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
        aliases: ['青禾'],
        summary: '外门执事，负责盯住沈砚',
        tags: ['活跃人物'],
        roleLayer: 'active',
        goals: ['押回沈砚'],
        pressures: ['不敢违抗长老会'],
        linkedFactionIds: ['faction_xuanyu'],
        linkedLocationIds: [],
        linkedItemIds: [],
        provenance: {
          provenanceTier: 'plot_inferred',
          originAuthorityType: 'plot_inferred',
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
        summary: '掌刑长老，擅长借门规杀人',
        tags: ['功能人物'],
        roleLayer: 'functional',
        goals: ['清掉少主一脉'],
        pressures: ['要尽快给长老会交代'],
        linkedFactionIds: ['faction_xuanyu'],
        linkedLocationIds: [],
        linkedItemIds: [],
        provenance: {
          provenanceTier: 'plot_inferred',
          originAuthorityType: 'plot_inferred',
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
        summary: '内斗激烈的修仙宗门',
        tags: ['势力'],
        factionType: 'sect',
        memberCharacterIds: ['char_lead', 'char_guard', 'char_elder'],
        provenance: {
          provenanceTier: 'plot_inferred',
          originAuthorityType: 'plot_inferred',
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

function makeFullProfiles(): CharacterDraftDto[] {
  return [
    {
      masterEntityId: 'char_lead',
      name: '沈砚',
      biography: '被逐出宗门的少主，准备借禁地翻盘。',
      publicMask: '',
      hiddenPressure: '',
      fear: '',
      protectTarget: '',
      conflictTrigger: '',
      advantage: '',
      weakness: '',
      goal: '',
      arc: '',
      roleLayer: 'core'
    },
    {
      name: '青禾',
      biography: '表面奉命捉人，实际上在找自保出路。',
      publicMask: '',
      hiddenPressure: '',
      fear: '',
      protectTarget: '',
      conflictTrigger: '',
      advantage: '',
      weakness: '',
      goal: '',
      arc: '',
      roleLayer: 'active'
    }
  ]
}

test('buildCharacterStageSections splits full profiles, light cards and faction roster from entityStore', () => {
  const sections = buildCharacterStageSections({
    characterDrafts: makeFullProfiles(),
    entityStore: makeEntityStore()
  })

  assert.equal(sections.fullProfiles.length, 2)
  assert.equal(sections.lightCards.length, 1)
  assert.equal(sections.lightCards[0]?.entityId, 'char_elder')
  assert.equal(sections.lightCards[0]?.name, '裴长老')
  assert.equal(sections.lightCards[0]?.roleLayerLabel, '功能人物')
  assert.deepStrictEqual(sections.lightCards[0]?.factionNames, ['玄玉宫'])

  assert.equal(sections.factionRoster.length, 1)
  assert.equal(sections.factionSeatCount, 5)
  assert.equal(sections.factionRoster[0]?.name, '玄玉宫')
  assert.deepStrictEqual(
    sections.factionRoster[0]?.placeholderSeats.map((seat) => ({
      label: seat.label,
      roleLayer: seat.roleLayer
    })),
    [
      { label: '执事位', roleLayer: 'active' },
      { label: '门下弟子位', roleLayer: 'functional' }
    ]
  )
  assert.deepStrictEqual(
    sections.factionRoster[0]?.members.map((member) => ({
      name: member.name,
      isFullProfile: member.isFullProfile
    })),
    [
      { name: '沈砚', isFullProfile: true },
      { name: '陆青禾', isFullProfile: true },
      { name: '裴长老', isFullProfile: false }
    ]
  )
})

test('buildCharacterStageSections derives read-only faction seats when a faction has not named enough people yet', () => {
  const sections = buildCharacterStageSections({
    characterDrafts: [],
    entityStore: {
      characters: [],
      factions: [
        {
          id: 'faction_tiandi',
          projectId: 'project-1',
          type: 'faction',
          name: '天地会',
          aliases: [],
          summary: '地下反清组织',
          tags: ['势力'],
          factionType: 'organization',
          memberCharacterIds: [],
          provenance: {
            provenanceTier: 'plot_inferred',
            originAuthorityType: 'plot_inferred',
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
  })

  assert.equal(sections.factionSeatCount, 5)
  assert.deepStrictEqual(
    sections.factionRoster[0]?.placeholderSeats.map((seat) => ({
      label: seat.label,
      roleLayer: seat.roleLayer
    })),
    [
      { label: '会主位', roleLayer: 'core' },
      { label: '二把手位', roleLayer: 'active' },
      { label: '骨干位', roleLayer: 'active' },
      { label: '执行位', roleLayer: 'functional' },
      { label: '情报位', roleLayer: 'functional' }
    ]
  )
})

test('buildCharacterStageSections surfaces synthesized slot cards as real light cards instead of keeping them at zero', () => {
  const sections = buildCharacterStageSections({
    characterDrafts: [],
    entityStore: {
      characters: [
        {
          id: 'char_slot_xuanyu_elder',
          projectId: 'project-1',
          type: 'character',
          name: '玄玉宫·长老位',
          aliases: [],
          summary: '玄玉宫里的长老位，负责裁决门内事务。',
          tags: ['轻量人物卡', '势力人物位'],
          roleLayer: 'active',
          goals: ['稳住玄玉宫长老线'],
          pressures: ['必须先保玄玉宫的利益'],
          linkedFactionIds: ['faction_xuanyu'],
          linkedLocationIds: [],
          linkedItemIds: [],
          identityMode: 'slot',
          slotKey: 'faction_xuanyu:elder',
          factionRole: '长老位',
          rankLevel: 'senior',
          publicIdentity: '玄玉宫长老',
          stance: '先保玄玉宫利益',
          currentFunction: '裁决门内事务',
          voiceStyle: '门规压人，口风冷硬',
          upgradeCandidate: true,
          provenance: {
            provenanceTier: 'plot_inferred',
            originAuthorityType: 'plot_inferred',
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
          summary: '内斗激烈的修仙宗门',
          tags: ['势力'],
          factionType: 'sect',
          memberCharacterIds: [],
          provenance: {
            provenanceTier: 'plot_inferred',
            originAuthorityType: 'plot_inferred',
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
  })

  assert.equal(sections.lightCards.length, 1)
  assert.equal(sections.lightCards[0]?.name, '玄玉宫·长老位')
  assert.equal(sections.lightCards[0]?.factionRole, '长老位')
  assert.equal(sections.lightCards[0]?.publicIdentity, '玄玉宫长老')
  assert.equal(sections.lightCards[0]?.currentFunction, '裁决门内事务')
  assert.equal(sections.lightCards[0]?.stance, '先保玄玉宫利益')
  assert.equal(sections.lightCards[0]?.voiceStyle, '门规压人，口风冷硬')
  assert.equal(sections.lightCards[0]?.identityMode, 'slot')
  assert.equal(sections.lightCards[0]?.upgradeCandidate, true)
  assert.equal(sections.factionSeatCount, 1)
  assert.deepStrictEqual(
    sections.factionRoster[0]?.placeholderSeats.map((seat) => seat.label),
    ['长老位']
  )
})

test('createCharacterDraftFromEntityStore upgrades light card into full draft with master entity id', () => {
  const draft = createCharacterDraftFromEntityStore({
    entityStore: makeEntityStore(),
    characterEntityId: 'char_elder'
  })

  assert.ok(draft)
  assert.equal(draft?.masterEntityId, 'char_elder')
  assert.equal(draft?.name, '裴长老')
  assert.equal(draft?.biography, '掌刑长老，擅长借门规杀人')
  assert.equal(draft?.goal, '清掉少主一脉')
  assert.equal(draft?.hiddenPressure, '要尽快给长老会交代')
  assert.equal(draft?.roleLayer, 'active')
})

test('createCharacterDraftFromEntityStore returns null when entity id is missing', () => {
  const draft = createCharacterDraftFromEntityStore({
    entityStore: makeEntityStore(),
    characterEntityId: 'missing'
  })

  assert.equal(draft, null)
})
