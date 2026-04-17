import test from 'node:test'
import assert from 'node:assert/strict'

import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import type { CharacterProfileV2Dto } from '../../../shared/contracts/character-profile-v2.ts'
import type { FactionMatrixDto } from '../../../shared/contracts/faction-matrix.ts'
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  SevenQuestionsResultDto
} from '../../../shared/contracts/workflow.ts'
import { generateOutlineAndCharactersFromConfirmedSevenQuestions } from './generate-outline-and-characters-from-confirmed-seven-questions.ts'

function createStoryIntent(): StoryIntentPackageDto {
  return {
    titleHint: '修仙传',
    genre: '玄幻',
    tone: '压迫感',
    audience: '女频',
    sellingPremise: '天才隐忍复仇',
    coreDislocation: '明明能打却要藏',
    emotionalPayoff: '反咬翻盘',
    protagonist: '黎明',
    antagonist: '李科',
    coreConflict: '李科步步紧逼，黎明必须藏锋求活',
    endingDirection: '主角翻盘',
    officialKeyCharacters: ['黎明', '李科'],
    lockedCharacterNames: ['黎明', '李科'],
    themeAnchors: ['藏锋'],
    worldAnchors: ['宗门'],
    relationAnchors: ['师徒裂痕'],
    dramaticMovement: ['被压', '试探', '反咬'],
    generationBriefText: [
      '【项目】修仙传｜3集',
      '【主角】黎明',
      '【对手】李科',
      '【关键角色】黎明、李科、苏婉',
      '【角色卡】',
      '- 黎明：主角。',
      '- 李科：对手。',
      '- 苏婉：情感杠杆。'
    ].join('\n')
  }
}

function createConfirmedOutlineDraft(): OutlineDraftDto {
  return {
    title: '修仙传',
    genre: '玄幻',
    theme: '藏锋',
    protagonist: '黎明',
    mainConflict: '李科步步紧逼，黎明必须藏锋求活',
    summary: '',
    summaryEpisodes: [],
    facts: [],
    outlineBlocks: [
      {
        blockNo: 1,
        label: '第一篇章',
        sectionTitle: '第一篇章',
        startEpisode: 1,
        endEpisode: 3,
        summary: '',
        episodes: [],
        sevenQuestions: {
          goal: '活下来并看清局势',
          obstacle: '李科持续逼压',
          effort: '黎明继续藏锋试探',
          result: '逐步摸清对手路数',
          twist: '意外发现旧账',
          turnaround: '开始反设局',
          ending: '形成第一轮反咬'
        }
      }
    ]
  }
}

function createCharacterProfiles(): { characters: CharacterDraftDto[] } {
  return {
    characters: [
      {
        name: '黎明',
        biography: '一直被压着走，只能继续藏锋。',
        publicMask: '表面示弱拖时间。',
        hiddenPressure: '一旦亮底就会被先下手。',
        fear: '最怕牵连小柔。',
        protectTarget: '守住自己还没暴露的底牌。',
        conflictTrigger: '李科再拿小柔逼他，他就会反咬。',
        advantage: '能把局面拖到自己熟悉的节奏里。',
        weakness: '越想护人越容易露底。',
        goal: '先活下来，再找机会翻盘。',
        arc: '从被压着藏锋，到学会借压反设局。'
      },
      {
        name: '李科',
        biography: '一直想把黎明逼到亮底。',
        publicMask: '表面守规矩，暗里步步施压。',
        hiddenPressure: '怕自己旧账被翻出来。',
        fear: '最怕失去手里的权位。',
        protectTarget: '守住自己在宗门里的位置。',
        conflictTrigger: '只要黎明不肯低头，他就会继续加码。',
        advantage: '能调动规矩和人手一起压人。',
        weakness: '太相信自己的掌控力。',
        goal: '逼出黎明的底牌。',
        arc: '从稳压对手，到被反设局反咬。'
      }
    ]
  }
}

function createOutlineBundleStub() {
  return {
    outline: {
      title: '修仙传',
      genre: '玄幻',
      theme: '藏锋',
      protagonist: '黎明',
      mainConflict: '李科步步紧逼，黎明必须藏锋求活',
      summary: '前三集写黎明被压、试探、第一次反咬。',
      episodes: [
        { episodeNo: 1, summary: '黎明先被压住。' },
        { episodeNo: 2, summary: '李科继续试探。' },
        { episodeNo: 3, summary: '黎明第一次反咬。' }
      ],
      facts: []
    }
  }
}

test('confirmed seven questions path only calls character profile generator', async () => {
  let characterGeneratorCalls = 0
  let receivedGoal = ''
  let receivedCharacterProfilesV2 = 0
  let receivedFactionCount = 0

  const characterProfilesV2: CharacterProfileV2Dto[] = [
    {
      id: 'char_1',
      name: '黎明',
      depthLevel: 'core',
      appearance: '瘦削冷脸的年轻弟子',
      personality: '外冷内忍',
      identity: '玄玉宫弟子',
      values: '先护人，再亮底',
      plotFunction: '把被动局面反拧回自己手里',
      hiddenPressure: '亮底会牵连小柔',
      fear: '小柔出事',
      protectTarget: '小柔',
      conflictTrigger: '李科拿小柔逼供',
      advantage: '能在压力里藏锋',
      weakness: '越想护人越会露底',
      goal: '守住钥匙',
      arc: '从藏锋到反设局',
      publicMask: '表面示弱'
    }
  ]
  const factionMatrix: FactionMatrixDto = {
    title: '宗门暗战',
    totalEpisodes: 3,
    factions: [
      {
        id: 'f1',
        name: '玄玉宫',
        positioning: '名门正派',
        coreDemand: '守住宗门秩序',
        coreValues: '秩序优先',
        mainMethods: ['规矩压人'],
        vulnerabilities: ['旧账太多'],
        branches: [
          {
            id: 'b1',
            name: '执法堂',
            parentFactionId: 'f1',
            positioning: '强硬执行',
            coreDemand: '稳住权柄',
            characters: [
              {
                id: 'c1',
                name: '李科',
                roleInFaction: 'leader',
                branchId: 'b1',
                depthLevel: 'mid',
                identity: '执法堂头目',
                coreMotivation: '稳住地位',
                plotFunction: '施压',
                isSleeper: false,
                sleeperForFactionId: undefined
              },
              {
                id: 'c2',
                name: '赵武',
                roleInFaction: 'enforcer',
                branchId: 'b1',
                depthLevel: 'extra',
                identity: '打手',
                coreMotivation: '跟着压人',
                plotFunction: '执行',
                isSleeper: false,
                sleeperForFactionId: undefined
              },
              {
                id: 'c3',
                name: '周三',
                roleInFaction: 'variable',
                branchId: 'b1',
                depthLevel: 'extra',
                identity: '摇摆门人',
                coreMotivation: '看风向',
                plotFunction: '变数',
                isSleeper: false,
                sleeperForFactionId: undefined
              }
            ]
          },
          {
            id: 'b2',
            name: '医庐',
            parentFactionId: 'f1',
            positioning: '中立救人',
            coreDemand: '保人',
            characters: [
              {
                id: 'c4',
                name: '苏婉',
                roleInFaction: 'leader',
                branchId: 'b2',
                depthLevel: 'mid',
                identity: '医者',
                coreMotivation: '保住伤者',
                plotFunction: '传信',
                isSleeper: false,
                sleeperForFactionId: undefined
              },
              {
                id: 'c5',
                name: '药童',
                roleInFaction: 'functional',
                branchId: 'b2',
                depthLevel: 'extra',
                identity: '药童',
                coreMotivation: '保命',
                plotFunction: '跑腿',
                isSleeper: false,
                sleeperForFactionId: undefined
              },
              {
                id: 'c6',
                name: '账房',
                roleInFaction: 'variable',
                branchId: 'b2',
                depthLevel: 'extra',
                identity: '账房',
                coreMotivation: '藏账',
                plotFunction: '留钩子',
                isSleeper: false,
                sleeperForFactionId: undefined
              }
            ]
          }
        ]
      },
      {
        id: 'f2',
        name: '暗线残党',
        positioning: '潜伏势力',
        coreDemand: '翻旧账',
        coreValues: '先活下来',
        mainMethods: ['潜伏'],
        vulnerabilities: ['人手少'],
        branches: [
          {
            id: 'b3',
            name: '外线',
            parentFactionId: 'f2',
            positioning: '潜伏外线',
            coreDemand: '拿到钥匙',
            characters: [
              {
                id: 'c7',
                name: '外线一',
                roleInFaction: 'leader',
                branchId: 'b3',
                depthLevel: 'mid',
                identity: '外线头目',
                coreMotivation: '拿钥匙',
                plotFunction: '追压',
                isSleeper: false,
                sleeperForFactionId: undefined
              },
              {
                id: 'c8',
                name: '外线二',
                roleInFaction: 'enforcer',
                branchId: 'b3',
                depthLevel: 'extra',
                identity: '外线打手',
                coreMotivation: '抢钥匙',
                plotFunction: '动手',
                isSleeper: false,
                sleeperForFactionId: undefined
              },
              {
                id: 'c9',
                name: '外线三',
                roleInFaction: 'variable',
                branchId: 'b3',
                depthLevel: 'extra',
                identity: '暗桩',
                coreMotivation: '保命',
                plotFunction: '倒戈',
                isSleeper: false,
                sleeperForFactionId: undefined
              }
            ]
          },
          {
            id: 'b4',
            name: '内线',
            parentFactionId: 'f2',
            positioning: '宗门内线',
            coreDemand: '搅局',
            characters: [
              {
                id: 'c10',
                name: '内线一',
                roleInFaction: 'leader',
                branchId: 'b4',
                depthLevel: 'mid',
                identity: '内线头目',
                coreMotivation: '翻盘',
                plotFunction: '埋雷',
                isSleeper: false,
                sleeperForFactionId: undefined
              },
              {
                id: 'c11',
                name: '内线二',
                roleInFaction: 'enforcer',
                branchId: 'b4',
                depthLevel: 'extra',
                identity: '执行者',
                coreMotivation: '执行命令',
                plotFunction: '执行',
                isSleeper: false,
                sleeperForFactionId: undefined
              },
              {
                id: 'c12',
                name: '内线三',
                roleInFaction: 'variable',
                branchId: 'b4',
                depthLevel: 'extra',
                identity: '双面人',
                coreMotivation: '押宝',
                plotFunction: '反转',
                isSleeper: false,
                sleeperForFactionId: undefined
              }
            ]
          }
        ]
      },
      {
        id: 'f3',
        name: '城中商会',
        positioning: '中立利益方',
        coreDemand: '谁赢帮谁',
        coreValues: '利益优先',
        mainMethods: ['交易'],
        vulnerabilities: ['不敢站死队'],
        branches: [
          {
            id: 'b5',
            name: '钱庄',
            parentFactionId: 'f3',
            positioning: '掌钱',
            coreDemand: '保账',
            characters: [
              { id: 'c13', name: '掌柜', roleInFaction: 'leader', branchId: 'b5', depthLevel: 'mid', identity: '掌柜', coreMotivation: '保账', plotFunction: '给筹码', isSleeper: false, sleeperForFactionId: undefined },
              { id: 'c14', name: '伙计', roleInFaction: 'enforcer', branchId: 'b5', depthLevel: 'extra', identity: '伙计', coreMotivation: '保命', plotFunction: '跑腿', isSleeper: false, sleeperForFactionId: undefined },
              { id: 'c15', name: '门童', roleInFaction: 'variable', branchId: 'b5', depthLevel: 'extra', identity: '门童', coreMotivation: '见风使舵', plotFunction: '漏消息', isSleeper: false, sleeperForFactionId: undefined }
            ]
          },
          {
            id: 'b6',
            name: '赌坊',
            parentFactionId: 'f3',
            positioning: '收风',
            coreDemand: '两头下注',
            characters: [
              { id: 'c16', name: '坊主', roleInFaction: 'leader', branchId: 'b6', depthLevel: 'mid', identity: '坊主', coreMotivation: '压注', plotFunction: '观风向', isSleeper: false, sleeperForFactionId: undefined },
              { id: 'c17', name: '打手', roleInFaction: 'enforcer', branchId: 'b6', depthLevel: 'extra', identity: '打手', coreMotivation: '听命', plotFunction: '施压', isSleeper: false, sleeperForFactionId: undefined },
              { id: 'c18', name: '眼线', roleInFaction: 'variable', branchId: 'b6', depthLevel: 'extra', identity: '眼线', coreMotivation: '卖消息', plotFunction: '通风报信', isSleeper: false, sleeperForFactionId: undefined }
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
        involvedCharacterIds: ['c12'],
        description: '内线三在两边卖消息',
        revealEpisodeRange: { start: 2, end: 3 }
      },
      {
        id: 'r2',
        relationType: 'secret_enemy',
        fromFactionId: 'f3',
        toFactionId: 'f1',
        involvedCharacterIds: ['c16'],
        description: '赌坊表面合作，实际等宗门出血',
        revealEpisodeRange: { start: 1, end: 2 }
      }
    ],
    landscapeSummary: '三方都盯着钥匙和旧账。',
    factionTimetable: [{ factionId: 'f1', entryEpisode: 1, entryDescription: '宗门先压人' }]
  }

  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      storyIntent: createStoryIntent(),
      outlineDraft: createConfirmedOutlineDraft(),
      runtimeConfig: {} as never
    },
    {
      appendDiagnosticLog: async () => {},
      generateCharacterProfiles: async () => {
        characterGeneratorCalls += 1
        return {
          ...createCharacterProfiles(),
          characterProfilesV2,
          factionMatrix
        }
      },
      generateOutlineBundle: async (input) => {
        const sevenQuestions = input.sevenQuestions as SevenQuestionsResultDto
        receivedGoal = sevenQuestions.sections[0]?.sevenQuestions.goal || ''
        receivedCharacterProfilesV2 = input.characterProfilesV2?.length || 0
        receivedFactionCount = input.factionMatrix?.factions.length || 0
        return createOutlineBundleStub()
      }
    }
  )

  assert.equal(characterGeneratorCalls, 1)
  assert.equal(receivedGoal, '活下来并看清局势')
  assert.equal(receivedCharacterProfilesV2, 1)
  assert.equal(receivedFactionCount, 3)
  assert.equal(result.characterDrafts.length, 2)
  assert.equal(result.outlineDraft.outlineBlocks?.[0]?.sevenQuestions?.turnaround, '开始反设局')
  assert.ok(result.outlineDraft.facts.every((fact) => fact.status === 'confirmed'))
  assert.ok(result.outlineDraft.facts.every((fact) => fact.authorityType === 'user_declared'))
  assert.ok(result.outlineDraft.facts.every((fact) => fact.declaredBy === 'user'))
})

test('confirmed seven questions path preserves V2 dimensions on persisted character drafts', async () => {
  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      storyIntent: createStoryIntent(),
      outlineDraft: createConfirmedOutlineDraft(),
      runtimeConfig: {} as never
    },
    {
      appendDiagnosticLog: async () => {},
      generateCharacterProfiles: async () => ({
        characters: [
          {
            name: '黎明',
            biography: '主角。',
            publicMask: '表面示弱',
            hiddenPressure: '',
            fear: '',
            protectTarget: '',
            conflictTrigger: '',
            advantage: '',
            weakness: '',
            goal: '',
            arc: '',
            appearance: '黑衣冷脸的年轻弟子',
            personality: '外冷内忍',
            identity: '玄玉宫弟子',
            values: '先护人，再亮底',
            plotFunction: '把被动局面拧回主控',
            depthLevel: 'core'
          }
        ] as CharacterDraftDto[]
      }),
      generateOutlineBundle: async () => createOutlineBundleStub()
    }
  )

  assert.equal(result.characterDrafts[0]?.appearance, '黑衣冷脸的年轻弟子')
  assert.equal(result.characterDrafts[0]?.plotFunction, '把被动局面拧回主控')
  assert.equal(result.characterDrafts[0]?.depthLevel, 'core')
})

test('confirmed seven questions path fails explicitly when outlineDraft has no confirmed seven questions', async () => {
  await assert.rejects(
    () =>
      generateOutlineAndCharactersFromConfirmedSevenQuestions(
        {
          storyIntent: createStoryIntent(),
          outlineDraft: {
            ...createConfirmedOutlineDraft(),
            outlineBlocks: []
          },
          runtimeConfig: {} as never
        },
        {
          appendDiagnosticLog: async () => {},
          generateCharacterProfiles: async () => createCharacterProfiles(),
          generateOutlineBundle: async () => createOutlineBundleStub()
        }
      ),
    /rough_outline_requires_confirmed_seven_questions/
  )
})

test('confirmed seven questions path auto-confirms generated outline facts for downstream detailed outline', async () => {
  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      storyIntent: createStoryIntent(),
      outlineDraft: createConfirmedOutlineDraft(),
      runtimeConfig: {} as never
    },
    {
      appendDiagnosticLog: async () => {},
      generateCharacterProfiles: async () => createCharacterProfiles(),
      generateOutlineBundle: async () => ({
        outline: {
          ...createOutlineBundleStub().outline,
          facts: [
            {
              label: '师父托付的钥匙',
              description: '李诚阳交给黎明的钥匙，藏着惊天秘密。',
              level: 'core',
              linkedToPlot: true,
              linkedToTheme: false
            }
          ]
        }
      })
    }
  )

  assert.equal(result.outlineDraft.facts.length, 1)
  assert.equal(result.outlineDraft.facts[0]?.status, 'confirmed')
  assert.equal(result.outlineDraft.facts[0]?.authorityType, 'user_declared')
  assert.equal(result.outlineDraft.facts[0]?.declaredBy, 'user')
  assert.equal(result.outlineDraft.facts[0]?.declaredStage, 'outline')
})

test('confirmed seven questions path keeps rough outline visible after character normalization', async () => {
  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      storyIntent: createStoryIntent(),
      outlineDraft: createConfirmedOutlineDraft(),
      runtimeConfig: {} as never
    },
    {
      appendDiagnosticLog: async () => {},
      generateCharacterProfiles: async () => ({
        characters: [
          {
            name: '黎明',
            biography: '一直被压着走，只能继续藏锋。',
            publicMask: '表面示弱拖时间。',
            hiddenPressure: '一旦亮底就会被先下手。',
            fear: '最怕牵连小柔。',
            protectTarget: '守住自己还没暴露的底牌。',
            conflictTrigger: '李科再拿小柔逼他，他就会反咬。',
            advantage: '能把局面拖到自己熟悉的节奏里。',
            weakness: '越想护人越容易露底。',
            goal: '先活下来，再找机会翻盘。',
            arc: '从被压着藏锋，到学会借压反设局。'
          },
          {
            name: '李科',
            biography: '一直想把黎明逼到亮底。',
            publicMask: '表面守规矩，暗里步步施压。',
            hiddenPressure: '怕自己旧账被翻出来。',
            fear: '最怕失去手里的权位。',
            protectTarget: '守住自己在宗门里的位置。',
            conflictTrigger: '只要黎明不肯低头，他就会继续加码。',
            advantage: '',
            weakness: '太相信自己的掌控力。',
            goal: '逼出黎明的底牌。',
            arc: '从稳压对手，到被反设局反咬。'
          }
        ]
      }),
      generateOutlineBundle: async () => createOutlineBundleStub()
    }
  )

  assert.equal(result.outlineDraft.title, '修仙传')
  assert.equal(result.characterDrafts.length, 2)
})

test('confirmed seven questions path only keeps character drafts that exist in role cards', async () => {
  const diagnostics: string[] = []

  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      storyIntent: createStoryIntent(),
      outlineDraft: createConfirmedOutlineDraft(),
      runtimeConfig: {} as never
    },
    {
      appendDiagnosticLog: async (message) => {
        diagnostics.push(message)
      },
      generateCharacterProfiles: async () => ({
        characters: [
          {
            name: '黎明',
            biography: '主角。',
            publicMask: '',
            hiddenPressure: '',
            fear: '',
            protectTarget: '',
            conflictTrigger: '',
            advantage: '',
            weakness: '',
            goal: '',
            arc: ''
          },
          {
            name: '李科',
            biography: '对手。',
            publicMask: '',
            hiddenPressure: '',
            fear: '',
            protectTarget: '',
            conflictTrigger: '',
            advantage: '',
            weakness: '',
            goal: '',
            arc: ''
          },
          {
            name: '张三',
            biography: '不是角色卡里的人，不应该保留。',
            publicMask: '',
            hiddenPressure: '',
            fear: '',
            protectTarget: '',
            conflictTrigger: '',
            advantage: '',
            weakness: '',
            goal: '',
            arc: ''
          }
        ]
      }),
      generateOutlineBundle: async () => createOutlineBundleStub()
    }
  )

  assert.deepEqual(
    result.characterDrafts.map((character) => character.name),
    ['黎明', '李科']
  )
  assert.ok(
    diagnostics.some((message) => message.includes('character_bundle_filtered_to_role_cards')),
    'should record when non-role-card characters are dropped'
  )
})
