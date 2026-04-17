import test from 'node:test'
import assert from 'node:assert/strict'

import {
  generateFactionMatrix,
  parseFactionMatrixResponseWithEpisodeCount
} from './faction-matrix-agent.ts'

test('parseFactionMatrixResponseWithEpisodeCount accepts lighter 20-episode matrix', () => {
  const parsed = parseFactionMatrixResponseWithEpisodeCount(
    JSON.stringify({
      title: '修仙传',
      totalEpisodes: 20,
      factions: [
        {
          id: 'f1',
          name: '玄玉宫',
          positioning: '正统宗门',
          coreDemand: '守住秩序',
          coreValues: '规矩优先',
          mainMethods: ['规矩压人'],
          vulnerabilities: ['旧账太多'],
          branches: [
            {
              id: 'b1',
              name: '执法堂',
              parentFactionId: 'f1',
              positioning: '强压',
              coreDemand: '压住异动',
              characters: [
                { id: 'c1', name: '李科', roleInFaction: 'leader', branchId: 'b1', depthLevel: 'core', identity: '执法头目', coreMotivation: '稳住位置', plotFunction: '施压' },
                { id: 'c2', name: '赵武', roleInFaction: 'enforcer', branchId: 'b1', depthLevel: 'mid', identity: '打手', coreMotivation: '听命', plotFunction: '动手' }
              ]
            },
            {
              id: 'b2',
              name: '医庐',
              parentFactionId: 'f1',
              positioning: '中立保命',
              coreDemand: '保住伤者',
              characters: [
                { id: 'c3', name: '苏婉', roleInFaction: 'leader', branchId: 'b2', depthLevel: 'mid', identity: '医者', coreMotivation: '救人', plotFunction: '换药传信' },
                { id: 'c4', name: '药童', roleInFaction: 'functional', branchId: 'b2', depthLevel: 'extra', identity: '药童', coreMotivation: '保命', plotFunction: '跑腿' }
              ]
            }
          ]
        },
        {
          id: 'f2',
          name: '残党',
          positioning: '暗线势力',
          coreDemand: '夺钥匙',
          coreValues: '活下去',
          mainMethods: ['潜伏', '偷袭'],
          vulnerabilities: ['人数少'],
          branches: [
            {
              id: 'b3',
              name: '外线',
              parentFactionId: 'f2',
              positioning: '外线围猎',
              coreDemand: '盯人',
              characters: [
                { id: 'c5', name: '头目甲', roleInFaction: 'leader', branchId: 'b3', depthLevel: 'mid', identity: '残党头目', coreMotivation: '夺钥匙', plotFunction: '围猎' },
                { id: 'c6', name: '探子乙', roleInFaction: 'variable', branchId: 'b3', depthLevel: 'extra', identity: '探子', coreMotivation: '卖消息', plotFunction: '倒戈' }
              ]
            },
            {
              id: 'b4',
              name: '内线',
              parentFactionId: 'f2',
              positioning: '宗门内鬼',
              coreDemand: '翻旧账',
              characters: [
                { id: 'c7', name: '内鬼甲', roleInFaction: 'leader', branchId: 'b4', depthLevel: 'mid', identity: '内鬼', coreMotivation: '翻盘', plotFunction: '埋雷' },
                { id: 'c8', name: '内鬼乙', roleInFaction: 'variable', branchId: 'b4', depthLevel: 'extra', identity: '眼线', coreMotivation: '押宝', plotFunction: '放风' }
              ]
            }
          ]
        }
      ],
      crossRelations: [
        {
          id: 'r1',
          relationType: 'double_agent',
          fromFactionId: 'f2',
          toFactionId: 'f1',
          involvedCharacterIds: ['c8'],
          description: '内鬼乙给两边卖消息',
          revealEpisodeRange: { start: 8, end: 12 }
        }
      ],
      landscapeSummary: '两股势力围着钥匙和旧账缠斗。',
      factionTimetable: [{ factionId: 'f1', entryEpisode: 1, entryDescription: '宗门先压人' }]
    }),
    20
  )

  assert.ok(parsed)
  assert.equal(parsed?.factions.length, 2)
})

test('generateFactionMatrix retries once before failing', async () => {
  let attempts = 0

  await assert.rejects(
    () =>
      generateFactionMatrix({
        storyIntent: {
          sellingPremise: '修仙反咬',
          coreConflict: '黎明被围逼',
          protagonist: '黎明',
          antagonist: '李科'
        } as never,
        totalEpisodes: 20,
        runtimeConfig: {} as never,
      generateText: async () => {
          attempts += 1
          return {
            text: '{"title":"坏结构","factions":[{"id":"f1","branches":[]}],"crossRelations":[]}',
            lane: 'deepseek',
            model: 'test-model'
          } as never
        },
        diagnosticLogger: async () => {}
      }),
    /faction_matrix_parse_failed/
  )

  assert.equal(attempts, 2)
})

test('generateFactionMatrix surfaces timeout with faction-specific error code', async () => {
  await assert.rejects(
    () =>
      generateFactionMatrix({
        storyIntent: {
          sellingPremise: '修仙反咬',
          coreConflict: '黎明被围逼',
          protagonist: '黎明',
          antagonist: '李科'
        } as never,
        totalEpisodes: 20,
        runtimeConfig: {} as never,
        generateText: async () => {
          throw new Error('ai_request_timeout:300000ms')
        },
        diagnosticLogger: async () => {}
      }),
    /faction_matrix_timeout:300000ms/
  )
})
