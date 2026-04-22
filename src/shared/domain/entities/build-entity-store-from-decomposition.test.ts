import test from 'node:test'
import assert from 'node:assert/strict'

import type { DecompositionResult } from '../../contracts/decomposition.ts'
import type { ProjectEntityStoreDto } from '../../contracts/entities.ts'
import { buildEntityStoreFromDecomposition } from './build-entity-store-from-decomposition.ts'

function createDecomposition(): DecompositionResult {
  return {
    characters: [
      {
        name: '少年守钥人',
        aliases: ['守钥人'],
        roleHint: 'protagonist',
        summary: '玄玉宫看门少年',
        source: {
          provenanceTier: 'user_declared',
          originAuthorityType: 'user_declared',
          sourceSection: '角色卡',
          confidence: 1
        }
      },
      {
        name: '恶霸',
        aliases: [],
        roleHint: 'antagonist',
        summary: '一直拿少女和钥匙施压',
        source: {
          provenanceTier: 'user_declared',
          originAuthorityType: 'user_declared',
          sourceSection: '角色卡',
          confidence: 1
        }
      }
    ],
    factions: [
      {
        name: '玄玉宫',
        factionType: 'sect',
        memberNames: ['少年守钥人'],
        summary: '守着旧钥匙的宗门',
        source: {
          provenanceTier: 'user_declared',
          originAuthorityType: 'user_declared',
          sourceSection: '世界观与故事背景',
          confidence: 1
        }
      }
    ],
    locations: [
      {
        name: '王母宫',
        locationType: 'site',
        controllingFactionName: '玄玉宫',
        summary: '旧钥匙相关场域',
        source: {
          provenanceTier: 'ai_suggested',
          originAuthorityType: 'ai_suggested',
          sourceSection: '世界观与故事背景',
          confidence: 0.8
        }
      }
    ],
    items: [
      {
        name: '钥匙',
        itemType: 'key',
        ownerName: '少年守钥人',
        summary: '牵动全剧的关键物件',
        source: {
          provenanceTier: 'ai_suggested',
          originAuthorityType: 'ai_suggested',
          sourceSection: '核心冲突',
          confidence: 0.8
        }
      }
    ],
    relations: [
      {
        fromName: '少年守钥人',
        toName: '恶霸',
        relationType: 'hostility',
        summary: '恶霸持续拿少女和钥匙施压',
        source: {
          provenanceTier: 'ai_suggested',
          originAuthorityType: 'ai_suggested',
          sourceSection: '人物关系总梳理',
          confidence: 0.8
        }
      }
    ],
    immutableFacts: [],
    unresolved: [],
    originalText: 'test',
    sectionMap: {},
    meta: {
      decomposedAt: '2026-04-09T00:00:00.000Z',
      provenanceTier: 'user_declared'
    }
  }
}

test('buildEntityStoreFromDecomposition creates linked world entities from decomposition output', () => {
  const result = buildEntityStoreFromDecomposition({
    projectId: 'project_world_1',
    decomposition: createDecomposition()
  })

  assert.equal(result.characters.length, 6)
  assert.equal(result.factions.length, 1)
  assert.equal(result.locations.length, 1)
  assert.equal(result.items.length, 1)
  assert.equal(result.relations.length, 1)

  const protagonist = result.characters.find((item) => item.name === '少年守钥人')
  const faction = result.factions.find((item) => item.name === '玄玉宫')
  const location = result.locations.find((item) => item.name === '王母宫')
  const item = result.items.find((entry) => entry.name === '钥匙')
  const relation = result.relations[0]

  assert.ok(protagonist)
  assert.equal(protagonist.roleLayer, 'core')
  assert.deepEqual(protagonist.aliases, ['守钥人'])
  assert.equal(protagonist.provenance.sourceStage, 'chat')

  assert.ok(faction)
  assert.deepEqual(faction.memberCharacterIds, [protagonist.id])
  assert.deepEqual(protagonist.linkedFactionIds, [faction.id])

  const slotCharacters = result.characters.filter((item) => item.identityMode === 'slot')
  assert.equal(slotCharacters.length, 4)
  assert.ok(slotCharacters.some((item) => item.factionRole === '长老位'))
  assert.ok(slotCharacters.some((item) => item.factionRole === '执事位'))
  assert.ok(slotCharacters.every((item) => item.linkedFactionIds.includes(faction.id)))

  assert.ok(location)
  assert.equal(location.controllingFactionId, faction.id)

  assert.ok(item)
  assert.equal(item.ownerCharacterId, protagonist.id)

  assert.equal(relation.fromEntityId, protagonist.id)
  assert.equal(relation.toEntityId, result.characters.find((entry) => entry.name === '恶霸')?.id)
})

test('buildEntityStoreFromDecomposition merges into existing store without dropping stable ids or richer fields', () => {
  const existingStore: ProjectEntityStoreDto = {
    characters: [
      {
        id: 'char_existing_keeper',
        projectId: 'project_world_1',
        type: 'character',
        name: '少年守钥人',
        aliases: ['旧名'],
        summary: '旧版摘要',
        tags: ['old'],
        roleLayer: 'active',
        goals: ['守住钥匙'],
        pressures: ['旧仇'],
        linkedFactionIds: ['faction_old'],
        linkedLocationIds: [],
        linkedItemIds: [],
        provenance: {
          provenanceTier: 'user_declared',
          originAuthorityType: 'user_declared',
          originDeclaredBy: 'user',
          sourceStage: 'chat',
          createdAt: '2026-04-08T00:00:00.000Z',
          updatedAt: '2026-04-08T00:00:00.000Z'
        }
      }
    ],
    factions: [],
    locations: [],
    items: [],
    relations: []
  }

  const result = buildEntityStoreFromDecomposition({
    projectId: 'project_world_1',
    decomposition: createDecomposition(),
    existingStore
  })

  const protagonist = result.characters.find((item) => item.name === '少年守钥人')

  assert.ok(protagonist)
  assert.equal(protagonist.id, 'char_existing_keeper')
  assert.equal(protagonist.roleLayer, 'core')
  assert.deepEqual(protagonist.goals, ['守住钥匙'])
  assert.deepEqual(protagonist.pressures, ['旧仇'])
  assert.ok(protagonist.aliases.includes('旧名'))
  assert.ok(protagonist.aliases.includes('守钥人'))
  assert.ok(protagonist.linkedFactionIds.some((item) => item.startsWith('faction_')))
  assert.ok(result.characters.some((item) => item.identityMode === 'slot'))
})
