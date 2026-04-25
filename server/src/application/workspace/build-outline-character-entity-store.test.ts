import test from 'node:test'
import assert from 'node:assert/strict'

import type { CharacterProfileV2Dto } from '@shared/contracts/character-profile-v2'
import type { FactionMatrixDto } from '@shared/contracts/faction-matrix'
import { buildOutlineCharacterEntityStore } from './build-outline-character-entity-store'

function buildProfile(input: {
  name: string
  factionId: string
  branchId: string
  roleInFaction: CharacterProfileV2Dto['roleInFaction']
}): CharacterProfileV2Dto {
  return {
    id: 'char_01',
    name: input.name,
    depthLevel: 'core',
    factionId: input.factionId,
    branchId: input.branchId,
    roleInFaction: input.roleInFaction,
    appearance: `${input.name}的外形`,
    personality: `${input.name}的性格`,
    identity: `${input.name}的身份`,
    values: `${input.name}的立场`,
    plotFunction: `${input.name}的剧情功能`,
    hiddenPressure: `${input.name}的压力`,
    fear: `${input.name}的恐惧`,
    protectTarget: `${input.name}想守住的人`,
    conflictTrigger: `${input.name}被逼动手的点`,
    advantage: `${input.name}的优势`,
    weakness: `${input.name}的弱点`,
    goal: `${input.name}的目标`,
    arc: `${input.name}的弧光`,
    publicMask: `${input.name}的表面演法`,
    biography: `${input.name}的小传`
  }
}

function buildFactionMatrix(): FactionMatrixDto {
  return {
    title: '测试项目',
    totalEpisodes: 20,
    factions: [
      {
        id: 'faction_01',
        name: '魔尊遗脉',
        positioning: '主角血脉相关势力',
        coreDemand: '守住血脉真相',
        coreValues: '隐忍守护',
        mainMethods: ['暗中保护'],
        vulnerabilities: ['身份不能暴露'],
        branches: [
          {
            id: 'branch_01',
            name: '守脉人',
            parentFactionId: 'faction_01',
            positioning: '保护主角的暗线',
            coreDemand: '护住主角',
            characters: [
              {
                id: 'char_01',
                name: '守脉长老',
                roleInFaction: 'leader',
                branchId: 'branch_01',
                depthLevel: 'core',
                identity: '守脉人首领',
                coreMotivation: '守住血脉',
                plotFunction: '解释封印真相'
              }
            ]
          }
        ]
      },
      {
        id: 'faction_02',
        name: '正道仙盟',
        positioning: '反派压力方',
        coreDemand: '夺取魔尊血脉',
        coreValues: '伪善秩序',
        mainMethods: ['围剿', '利用'],
        vulnerabilities: ['内部伪善'],
        branches: [
          {
            id: 'branch_01',
            name: '仙盟嫡系',
            parentFactionId: 'faction_02',
            positioning: '大小姐所属分支',
            coreDemand: '夺取血脉',
            characters: [
              {
                id: 'char_01',
                name: '仙盟大小姐',
                roleInFaction: 'leader',
                branchId: 'branch_01',
                depthLevel: 'core',
                identity: '仙盟嫡女',
                coreMotivation: '夺取血脉',
                plotFunction: '伪善利用主角'
              }
            ]
          }
        ]
      }
    ],
    crossRelations: [],
    landscapeSummary: '两方围绕魔尊血脉对抗。',
    factionTimetable: []
  }
}

test('matches repeated profile ids by faction and branch instead of leaking names across factions', () => {
  const entityStore = buildOutlineCharacterEntityStore({
    projectId: 'project_character_roster',
    factionMatrix: buildFactionMatrix(),
    characterProfilesV2: [
      buildProfile({
        name: '秦墨',
        factionId: 'faction_01',
        branchId: 'branch_01',
        roleInFaction: 'leader'
      }),
      buildProfile({
        name: '柳清音',
        factionId: 'faction_02',
        branchId: 'branch_01',
        roleInFaction: 'leader'
      })
    ]
  })

  const [firstFaction, secondFaction] = entityStore.factions
  const firstMembers = entityStore.characters.filter((character) =>
    character.linkedFactionIds.includes(firstFaction.id)
  )
  const secondMembers = entityStore.characters.filter((character) =>
    character.linkedFactionIds.includes(secondFaction.id)
  )

  assert.ok(firstMembers.some((character) => character.name === '秦墨'))
  assert.ok(!firstMembers.some((character) => character.name === '柳清音'))
  assert.ok(secondMembers.some((character) => character.name === '柳清音'))
  assert.ok(!secondMembers.some((character) => character.name === '秦墨'))
  assert.equal(
    entityStore.characters.filter((character) => character.identityMode === 'slot').length,
    0
  )
})
