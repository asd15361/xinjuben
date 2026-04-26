import test from 'node:test'
import assert from 'node:assert/strict'

import type { CharacterProfileV2Dto } from '@shared/contracts/character-profile-v2'
import type { FactionMatrixDto } from '@shared/contracts/faction-matrix'
import type { CharacterDraftDto } from '@shared/contracts/workflow'
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
  assert.ok(entityStore.characters.some((character) => character.identityMode === 'slot'))
})

test('deduplicates repeated light card goals and pressures', () => {
  const entityStore = buildOutlineCharacterEntityStore({
    projectId: 'project_dedupe',
    factionMatrix: buildFactionMatrix(),
    characterProfilesV2: [
      {
        id: 'char_01',
        name: '守脉长老',
        depthLevel: 'mid',
        factionId: 'faction_01',
        branchId: 'branch_01',
        roleInFaction: 'leader',
        appearance: '黑衣中年人。',
        personality: '谨慎。',
        identity: '暗线头领。',
        values: '护住主角。',
        plotFunction: '递送线索。',
        goal: '护住主角。',
        hiddenPressure: '身份暴露。',
        fear: '身份暴露。'
      }
    ]
  })

  const character = entityStore.characters.find((item) => item.name === '守脉长老')
  assert.ok(character)
  assert.deepEqual(character.goals, ['护住主角。', '守住血脉'])
  assert.deepEqual(character.pressures, ['身份暴露。'])
})

test('seat light cards use role-specific goals instead of one generic faction goal', () => {
  const entityStore = buildOutlineCharacterEntityStore({
    projectId: 'project_slot_goals',
    factionMatrix: {
      ...buildFactionMatrix(),
      totalEpisodes: 20,
      factions: [
        {
          ...buildFactionMatrix().factions[0],
          name: '青云宗',
          positioning: '主角所在宗门',
          branches: [
            {
              ...buildFactionMatrix().factions[0].branches[0],
              characters: []
            }
          ]
        },
        {
          ...buildFactionMatrix().factions[1],
          name: '玄天仙盟',
          branches: [
            {
              ...buildFactionMatrix().factions[1].branches[0],
              characters: []
            }
          ]
        }
      ]
    },
    characterProfilesV2: []
  })

  const slots = entityStore.characters.filter((character) => character.identityMode === 'slot')
  const goals = slots.flatMap((character) => character.goals)
  assert.equal(goals.some((goal) => goal.includes('这条线撑住')), false)
  assert.equal(goals.some((goal) => goal.includes('自己这条线')), false)
  assert.ok(goals.some((goal) => goal.includes('山门')))
  assert.ok(goals.some((goal) => goal.includes('情报') || goal.includes('消息')))
  assert.ok(new Set(goals).size > 3)
})

test('uses profile faction as authority to prevent copied antagonist names leaking into the sect roster', () => {
  const factionMatrix: FactionMatrixDto = {
    title: '魔尊血脉',
    totalEpisodes: 20,
    landscapeSummary: '青虚宗与正道仙盟争夺魔尊血脉。',
    crossRelations: [],
    factionTimetable: [],
    factions: [
      {
        id: 'faction_qingxu',
        name: '青虚宗',
        positioning: '宗门',
        coreDemand: '保护与压制主角',
        coreValues: '宗门秩序',
        mainMethods: [],
        vulnerabilities: [],
        branches: [
          {
            id: 'branch_qingxu',
            name: '宗门主线',
            parentFactionId: 'faction_qingxu',
            positioning: '宗门内部冲突',
            coreDemand: '处置主角',
            characters: [
              {
                id: 'char_lead',
                name: '沈铮',
                roleInFaction: 'leader',
                branchId: 'branch_qingxu',
                depthLevel: 'core',
                identity: '外门弟子',
                coreMotivation: '查身世',
                plotFunction: '主角'
              },
              {
                id: 'char_wrong_ally',
                name: '盟主',
                roleInFaction: 'enforcer',
                branchId: 'branch_qingxu',
                depthLevel: 'core',
                identity: '误串进宗门的仙盟人物',
                coreMotivation: '夺血脉',
                plotFunction: '错误占位'
              },
              {
                id: 'char_wrong_murong',
                name: '慕容雪',
                roleInFaction: 'variable',
                branchId: 'branch_qingxu',
                depthLevel: 'core',
                identity: '误串进宗门的仙盟人物',
                coreMotivation: '夺血脉',
                plotFunction: '错误占位'
              }
            ]
          }
        ]
      },
      {
        id: 'faction_xianmeng',
        name: '正道仙盟',
        positioning: '组织',
        coreDemand: '夺取魔尊血脉',
        coreValues: '伪善秩序',
        mainMethods: [],
        vulnerabilities: [],
        branches: [
          {
            id: 'branch_xianmeng',
            name: '仙盟暗线',
            parentFactionId: 'faction_xianmeng',
            positioning: '夺血脉',
            coreDemand: '围剿主角',
            characters: [
              {
                id: 'char_ally',
                name: '盟主',
                roleInFaction: 'leader',
                branchId: 'branch_xianmeng',
                depthLevel: 'core',
                identity: '仙盟领袖',
                coreMotivation: '夺血脉',
                plotFunction: '幕后黑手'
              },
              {
                id: 'char_murong',
                name: '慕容雪',
                roleInFaction: 'leader',
                branchId: 'branch_xianmeng',
                depthLevel: 'core',
                identity: '慕容世家嫡女',
                coreMotivation: '夺血脉',
                plotFunction: '情感诱饵'
              }
            ]
          }
        ]
      }
    ]
  }
  const profiles: CharacterProfileV2Dto[] = [
    buildProfile({
      name: '沈铮',
      factionId: 'faction_qingxu',
      branchId: 'branch_qingxu',
      roleInFaction: 'leader'
    }),
    buildProfile({
      name: '青虚真人',
      factionId: 'faction_qingxu',
      branchId: 'branch_qingxu',
      roleInFaction: 'leader'
    }),
    buildProfile({
      name: '盟主',
      factionId: 'faction_xianmeng',
      branchId: 'branch_xianmeng',
      roleInFaction: 'leader'
    }),
    buildProfile({
      name: '慕容雪',
      factionId: 'faction_xianmeng',
      branchId: 'branch_xianmeng',
      roleInFaction: 'leader'
    })
  ]

  const entityStore = buildOutlineCharacterEntityStore({
    projectId: 'project_faction_leak_guard',
    factionMatrix,
    characterProfilesV2: profiles,
    focusedCharacterDrafts: profiles.map(
      (profile): CharacterDraftDto => ({
        name: profile.name,
        biography: profile.biography || `${profile.name}的小传`,
        publicMask: profile.publicMask || '',
        hiddenPressure: profile.hiddenPressure || '',
        fear: profile.fear || '',
        protectTarget: profile.protectTarget || '',
        conflictTrigger: profile.conflictTrigger || '',
        advantage: profile.advantage || '',
        weakness: profile.weakness || '',
        goal: profile.goal || '',
        arc: profile.arc || '',
        appearance: profile.appearance,
        personality: profile.personality,
        identity: profile.identity,
        values: profile.values,
        plotFunction: profile.plotFunction,
        depthLevel: profile.depthLevel,
        roleLayer: 'core'
      })
    )
  })

  const qingxu = entityStore.factions.find((faction) => faction.name === '青虚宗')
  const xianmeng = entityStore.factions.find((faction) => faction.name === '正道仙盟')
  assert.ok(qingxu)
  assert.ok(xianmeng)

  const qingxuMemberNames = entityStore.characters
    .filter((character) => qingxu.memberCharacterIds.includes(character.id))
    .map((character) => character.name)
  const xianmengMemberNames = entityStore.characters
    .filter((character) => xianmeng.memberCharacterIds.includes(character.id))
    .map((character) => character.name)

  assert.ok(qingxuMemberNames.includes('沈铮'))
  assert.ok(qingxuMemberNames.includes('青虚真人'))
  assert.ok(!qingxuMemberNames.includes('盟主'))
  assert.ok(!qingxuMemberNames.includes('慕容雪'))
  assert.ok(xianmengMemberNames.includes('盟主'))
  assert.ok(xianmengMemberNames.includes('慕容雪'))

  const namedNames = entityStore.characters
    .filter((character) => character.identityMode !== 'slot')
    .map((character) => character.name)
  assert.equal(namedNames.filter((name) => name === '盟主').length, 1)
  assert.equal(namedNames.filter((name) => name === '慕容雪').length, 1)
})

test('moves same-clan steward to the faction of the named clan lead instead of leaking into protagonist sect', () => {
  const factionMatrix: FactionMatrixDto = {
    title: '魔尊血脉',
    totalEpisodes: 20,
    landscapeSummary: '青云宗与天衍仙盟争夺魔尊血脉。',
    crossRelations: [],
    factionTimetable: [],
    factions: [
      {
        id: 'faction_qingyun',
        name: '青云宗',
        positioning: '主角所在宗门',
        coreDemand: '守住宗门秩序',
        coreValues: '门规',
        mainMethods: [],
        vulnerabilities: [],
        branches: [
          {
            id: 'branch_qingyun',
            name: '宗门内线',
            parentFactionId: 'faction_qingyun',
            positioning: '宗门人员',
            coreDemand: '管控主角',
            characters: [
              {
                id: 'char_murong_fu_wrong',
                name: '慕容福',
                roleInFaction: 'variable',
                branchId: 'branch_qingyun',
                depthLevel: 'extra',
                identity: '慕容家管家',
                coreMotivation: '替慕容雪办脏活',
                plotFunction: '执行大小姐密令'
              }
            ]
          }
        ]
      },
      {
        id: 'faction_xianmeng',
        name: '天衍仙盟',
        positioning: '正道最高联盟',
        coreDemand: '夺取魔尊血脉',
        coreValues: '伪善秩序',
        mainMethods: [],
        vulnerabilities: [],
        branches: [
          {
            id: 'branch_xianmeng',
            name: '仙盟嫡系',
            parentFactionId: 'faction_xianmeng',
            positioning: '慕容家所在分支',
            coreDemand: '夺血脉',
            characters: [
              {
                id: 'char_murong_xue',
                name: '慕容雪',
                roleInFaction: 'leader',
                branchId: 'branch_xianmeng',
                depthLevel: 'core',
                identity: '慕容家圣女候选',
                coreMotivation: '夺血脉',
                plotFunction: '伪装善意接近主角'
              }
            ]
          }
        ]
      }
    ]
  }
  const profiles: CharacterProfileV2Dto[] = [
    {
      ...buildProfile({
        name: '慕容雪',
        factionId: 'faction_xianmeng',
        branchId: 'branch_xianmeng',
        roleInFaction: 'leader'
      }),
      identity: '慕容家圣女候选'
    },
    {
      ...buildProfile({
        name: '慕容福',
        factionId: 'faction_qingyun',
        branchId: 'branch_qingyun',
        roleInFaction: 'variable'
      }),
      depthLevel: 'extra',
      identity: '慕容家族的管家，负责执行慕容雪密令',
      plotFunction: '协助慕容雪散布谣言、下毒和灭口'
    }
  ]

  const entityStore = buildOutlineCharacterEntityStore({
    projectId: 'project_family_steward',
    factionMatrix,
    characterProfilesV2: profiles
  })

  const qingyun = entityStore.factions.find((faction) => faction.name === '青云宗')
  const xianmeng = entityStore.factions.find((faction) => faction.name === '天衍仙盟')
  assert.ok(qingyun)
  assert.ok(xianmeng)
  const qingyunMemberNames = entityStore.characters
    .filter((character) => qingyun.memberCharacterIds.includes(character.id))
    .map((character) => character.name)
  const xianmengMemberNames = entityStore.characters
    .filter((character) => xianmeng.memberCharacterIds.includes(character.id))
    .map((character) => character.name)

  assert.equal(qingyunMemberNames.includes('慕容福'), false)
  assert.equal(xianmengMemberNames.includes('慕容福'), true)
  assert.equal(xianmengMemberNames.includes('慕容雪'), true)
})

test('moves profiles to faction named by identity and biography when generated faction id is wrong', () => {
  const factionMatrix: FactionMatrixDto = {
    title: '魔尊血脉',
    totalEpisodes: 20,
    landscapeSummary: '玄天宗与正道仙盟争夺魔尊血脉。',
    crossRelations: [],
    factionTimetable: [],
    factions: [
      {
        id: 'faction_xuantian',
        name: '玄天宗',
        positioning: '主角所在宗门',
        coreDemand: '保护与压制主角',
        coreValues: '宗门秩序',
        mainMethods: [],
        vulnerabilities: [],
        branches: [
          {
            id: 'branch_xuantian',
            name: '掌门派',
            parentFactionId: 'faction_xuantian',
            positioning: '宗门内部冲突',
            coreDemand: '护住主角',
            characters: [
              {
                id: 'char_linghan',
                name: '凌寒',
                roleInFaction: 'leader',
                branchId: 'branch_xuantian',
                depthLevel: 'core',
                identity: '玄天宗外门弟子',
                coreMotivation: '查明身世',
                plotFunction: '主角'
              },
              {
                id: 'char_wrong_yun',
                name: '云天鹤',
                roleInFaction: 'leader',
                branchId: 'branch_xuantian',
                depthLevel: 'core',
                identity: '错误串入宗门的仙盟人物',
                coreMotivation: '夺取血脉',
                plotFunction: '错误占位'
              },
              {
                id: 'char_wrong_liu',
                name: '柳长老',
                roleInFaction: 'enforcer',
                branchId: 'branch_xuantian',
                depthLevel: 'mid',
                identity: '错误串入宗门的仙盟人物',
                coreMotivation: '执行盟主命令',
                plotFunction: '错误占位'
              }
            ]
          }
        ]
      },
      {
        id: 'faction_xianmeng',
        name: '正道仙盟',
        positioning: '伪善的正道联盟',
        coreDemand: '夺取魔尊血脉',
        coreValues: '正义外衣',
        mainMethods: [],
        vulnerabilities: [],
        branches: [
          {
            id: 'branch_xianmeng',
            name: '仙盟嫡系',
            parentFactionId: 'faction_xianmeng',
            positioning: '盟主直属',
            coreDemand: '围猎主角',
            characters: [
              {
                id: 'char_yun',
                name: '云天鹤',
                roleInFaction: 'leader',
                branchId: 'branch_xianmeng',
                depthLevel: 'core',
                identity: '正道仙盟盟主',
                coreMotivation: '夺取血脉',
                plotFunction: '幕后黑手'
              },
              {
                id: 'char_liu',
                name: '柳长老',
                roleInFaction: 'enforcer',
                branchId: 'branch_xianmeng',
                depthLevel: 'mid',
                identity: '仙盟长老',
                coreMotivation: '效忠盟主',
                plotFunction: '执行暗线任务'
              }
            ]
          }
        ]
      }
    ]
  }
  const profiles: CharacterProfileV2Dto[] = [
    {
      ...buildProfile({
        name: '凌寒',
        factionId: 'faction_xuantian',
        branchId: 'branch_xuantian',
        roleInFaction: 'leader'
      }),
      identity: '玄天宗外门弟子'
    },
    {
      ...buildProfile({
        name: '云天鹤',
        factionId: 'faction_xuantian',
        branchId: 'branch_xuantian',
        roleInFaction: 'leader'
      }),
      identity: '正道仙盟盟主',
      biography: '云天鹤身为正道仙盟盟主，表面正气凛然，实则觊觎魔尊血脉。'
    },
    {
      ...buildProfile({
        name: '柳长老',
        factionId: 'faction_xuantian',
        branchId: 'branch_xuantian',
        roleInFaction: 'enforcer'
      }),
      depthLevel: 'mid',
      identity: '仙盟长老，云天鹤最信任的爪牙',
      biography: '柳长老作为仙盟长老，是云天鹤最信任的爪牙，专为盟主处理暗中事务。'
    }
  ]

  const entityStore = buildOutlineCharacterEntityStore({
    projectId: 'project_text_faction_authority',
    factionMatrix,
    characterProfilesV2: profiles
  })

  const xuantian = entityStore.factions.find((faction) => faction.name === '玄天宗')
  const xianmeng = entityStore.factions.find((faction) => faction.name === '正道仙盟')
  assert.ok(xuantian)
  assert.ok(xianmeng)

  const xuantianMemberNames = entityStore.characters
    .filter((character) => xuantian.memberCharacterIds.includes(character.id))
    .map((character) => character.name)
  const xianmengMemberNames = entityStore.characters
    .filter((character) => xianmeng.memberCharacterIds.includes(character.id))
    .map((character) => character.name)

  assert.ok(xuantianMemberNames.includes('凌寒'))
  assert.equal(xuantianMemberNames.includes('云天鹤'), false)
  assert.equal(xuantianMemberNames.includes('柳长老'), false)
  assert.ok(xianmengMemberNames.includes('云天鹤'))
  assert.ok(xianmengMemberNames.includes('柳长老'))
})
