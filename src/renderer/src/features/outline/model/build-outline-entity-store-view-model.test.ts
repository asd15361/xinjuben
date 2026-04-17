import test from 'node:test'
import assert from 'node:assert/strict'

import type { ProjectEntityStoreDto } from '../../../../../../shared/contracts/entities.ts'
import { buildOutlineEntityStoreViewModel } from './build-outline-entity-store-view-model.ts'

test('buildOutlineEntityStoreViewModel summarizes entityStore for outline observation panel', () => {
  const entityStore: ProjectEntityStoreDto = {
    characters: [
      {
        id: 'char_1',
        projectId: 'project_1',
        type: 'character',
        name: '少年守钥人',
        aliases: [],
        summary: '玄玉宫看门少年',
        tags: [],
        roleLayer: 'core',
        goals: [],
        pressures: [],
        linkedFactionIds: [],
        linkedLocationIds: [],
        linkedItemIds: [],
        provenance: {
          provenanceTier: 'user_declared',
          originAuthorityType: 'user_declared',
          originDeclaredBy: 'user',
          sourceStage: 'chat',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z'
        }
      },
      {
        id: 'char_2',
        projectId: 'project_1',
        type: 'character',
        name: '恶霸',
        aliases: [],
        summary: '持续施压',
        tags: [],
        roleLayer: 'core',
        goals: [],
        pressures: [],
        linkedFactionIds: [],
        linkedLocationIds: [],
        linkedItemIds: [],
        provenance: {
          provenanceTier: 'user_declared',
          originAuthorityType: 'user_declared',
          originDeclaredBy: 'user',
          sourceStage: 'chat',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z'
        }
      }
    ],
    factions: [
      {
        id: 'faction_1',
        projectId: 'project_1',
        type: 'faction',
        name: '玄玉宫',
        aliases: [],
        summary: '守着旧钥匙的宗门',
        tags: [],
        factionType: 'sect',
        memberCharacterIds: ['char_1'],
        provenance: {
          provenanceTier: 'user_declared',
          originAuthorityType: 'user_declared',
          originDeclaredBy: 'user',
          sourceStage: 'chat',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z'
        }
      }
    ],
    locations: [],
    items: [],
    relations: [
      {
        id: 'rel_1',
        projectId: 'project_1',
        type: 'relation',
        name: '少年守钥人 -> 恶霸',
        aliases: [],
        summary: '持续敌对',
        tags: [],
        relationType: 'hostility',
        fromEntityId: 'char_1',
        toEntityId: 'char_2',
        provenance: {
          provenanceTier: 'ai_suggested',
          originAuthorityType: 'ai_suggested',
          originDeclaredBy: 'system',
          sourceStage: 'chat',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z'
        }
      }
    ]
  }

  const result = buildOutlineEntityStoreViewModel(entityStore)

  assert.equal(result.isEmpty, false)
  assert.equal(result.counts.characters, 2)
  assert.equal(result.counts.factions, 1)
  assert.equal(result.counts.relations, 1)
  assert.deepEqual(result.factions[0], {
    name: '玄玉宫',
    summary: '守着旧钥匙的宗门',
    seatCount: 1
  })
  assert.deepEqual(result.characters[0], {
    name: '少年守钥人',
    roleLayerLabel: '核心人物',
    summary: '玄玉宫看门少年'
  })
})

test('buildOutlineEntityStoreViewModel returns empty summary when entityStore has no entities', () => {
  const result = buildOutlineEntityStoreViewModel({
    characters: [],
    factions: [],
    locations: [],
    items: [],
    relations: []
  })

  assert.equal(result.isEmpty, true)
  assert.equal(result.counts.characters, 0)
  assert.equal(result.characters.length, 0)
  assert.equal(result.factions.length, 0)
})
