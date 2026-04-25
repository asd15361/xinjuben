import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import type { CharacterProfileV2Dto } from '@shared/contracts/character-profile-v2'
import type { FactionMatrixDto } from '@shared/contracts/faction-matrix'
import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { CharacterDraftDto } from '@shared/contracts/workflow'
import { generateOutlineAndCharactersFromConfirmedSevenQuestions } from './generate-outline-and-characters-from-confirmed-seven-questions.ts'

function buildRuntimeConfig(): RuntimeProviderConfig {
  const provider = {
    apiKey: 'test',
    baseUrl: 'https://example.test',
    model: 'test-model',
    systemInstruction: '',
    timeoutMs: 1000
  }
  return {
    deepseek: provider,
    openrouterGeminiFlashLite: provider,
    openrouterQwenFree: provider,
    lanes: {
      deepseek: true,
      openrouterGeminiFlashLite: false,
      openrouterQwenFree: false
    },
    runtimeFetchTimeoutMs: 1000
  }
}

function buildStoryIntent(): StoryIntentPackageDto {
  return {
    titleHint: '魔尊血脉',
    genre: '男频修仙',
    protagonist: '林烬',
    antagonist: '仙盟大小姐',
    coreConflict: '废柴少年被仙盟大小姐利用，查清父母旧仇并掌控魔尊血脉',
    generationBriefText: '【项目】魔尊血脉｜20集\n林烬的母亲吊坠被踩碎后觉醒魔尊血脉。',
    officialKeyCharacters: [],
    lockedCharacterNames: [],
    themeAnchors: [],
    worldAnchors: [],
    relationAnchors: [],
    dramaticMovement: []
  }
}

function buildCharacter(name: string): CharacterDraftDto {
  return {
    name,
    biography: `${name}在当前主线里有明确压力。`,
    publicMask: '表面装弱并避开仙盟试探。',
    hiddenPressure: '怕血脉真相提前暴露。',
    fear: '失去母亲遗物碎片。',
    protectTarget: '吊坠碎片和女主留下的线索。',
    conflictTrigger: '被逼交出吊坠碎片时会反击。',
    advantage: '能借魔尊血脉短暂破局。',
    weakness: '血脉失控会伤到身边人。',
    goal: '查清父母被害真相。',
    arc: '从被动挨压转为主动设局。',
    roleLayer: 'core'
  }
}

function buildProfile(input: {
  id: string
  name: string
  factionId: string
  branchId: string
  depthLevel?: CharacterProfileV2Dto['depthLevel']
  roleInFaction?: CharacterProfileV2Dto['roleInFaction']
  identity?: string
  biography?: string
}): CharacterProfileV2Dto {
  const identity = input.identity || `${input.name}的身份`
  const biography = input.biography || `${input.name}在当前主线里有明确作用。`
  return {
    id: input.id,
    name: input.name,
    depthLevel: input.depthLevel || 'core',
    factionId: input.factionId,
    branchId: input.branchId,
    roleInFaction: input.roleInFaction || 'leader',
    appearance: `${input.name}的外形`,
    personality: `${input.name}的性格`,
    identity,
    values: `${input.name}的立场`,
    plotFunction: `${input.name}的剧情功能`,
    hiddenPressure: `${input.name}现在最大的压力，是一旦跟主角和名门正派大小姐这条冲突线绑死，就很难再退回场外。`,
    fear: '最怕自己被彻底卷进主线以后，再也没有回头余地。',
    protectTarget: '想守住自己还能掌控的那点位置，不愿被人随手当成工具。',
    conflictTrigger: '只要有人逼他在主角和名门正派大小姐之间明确站队，他就必须出动作。',
    advantage: `${input.name}手里握着局中信息。`,
    weakness: `${input.name}一旦被看穿就会失去回旋余地。`,
    goal: `${input.name}的目标`,
    arc: `${input.name}会从被局势裹着走，变成能把局面往前拱一把的关键杠杆。`,
    publicMask: `表面是${identity}`,
    biography
  }
}

function profileToDraft(profile: CharacterProfileV2Dto): CharacterDraftDto {
  return {
    name: profile.name,
    biography: profile.biography || profile.identity,
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
    roleLayer:
      profile.depthLevel === 'core'
        ? 'core'
        : profile.depthLevel === 'mid'
          ? 'active'
          : 'functional'
  }
}

function buildShortSeriesFactionMatrix(): FactionMatrixDto {
  const makePlaceholder = (
    id: string,
    name: string,
    branchId: string,
    depthLevel: 'core' | 'mid' | 'extra',
    roleInFaction: 'leader' | 'enforcer' | 'variable' | 'functional',
    identity: string
  ) => ({
    id,
    name,
    roleInFaction,
    branchId,
    depthLevel,
    identity,
    coreMotivation: `${name}的动机`,
    plotFunction: `${name}的功能`
  })

  return {
    title: '魔尊血脉',
    totalEpisodes: 20,
    factions: [
      {
        id: 'faction_cangxuan',
        name: '苍玄宗',
        positioning: '保护和压制主角的宗门',
        coreDemand: '守住血脉秘密',
        coreValues: '隐忍守护',
        mainMethods: ['暗中保护', '门规压制'],
        vulnerabilities: ['内部被仙盟渗透'],
        branches: [
          {
            id: 'branch_guard',
            name: '掌门守护线',
            parentFactionId: 'faction_cangxuan',
            positioning: '保护主角的核心分支',
            coreDemand: '让主角安全觉醒',
            characters: [
              makePlaceholder('char_lu_yuan', '陆渊', 'branch_guard', 'core', 'leader', '被封印的废柴男主'),
              makePlaceholder('char_yun_qingyao', '云清瑶', 'branch_guard', 'core', 'variable', '掌门之女')
            ]
          },
          {
            id: 'branch_law',
            name: '执法堂',
            parentFactionId: 'faction_cangxuan',
            positioning: '宗门规矩压力',
            coreDemand: '维护门规',
            characters: [
              makePlaceholder('char_yun_zhentian', '云震天', 'branch_law', 'core', 'leader', '苍玄宗掌门'),
              makePlaceholder('char_chen_elder', '陈长老', 'branch_law', 'mid', 'enforcer', '执法堂长老'),
              makePlaceholder('char_zhao_feng', '赵峰', 'branch_law', 'mid', 'variable', '仙盟暗棋')
            ]
          }
        ]
      },
      {
        id: 'faction_daomeng',
        name: '正天道盟',
        positioning: '伪善利用主角的正道联盟',
        coreDemand: '夺取魔尊血脉',
        coreValues: '伪善秩序',
        mainMethods: ['围剿', '伪装接近'],
        vulnerabilities: ['盟主贪婪'],
        branches: [
          {
            id: 'branch_leader',
            name: '盟主嫡系',
            parentFactionId: 'faction_daomeng',
            positioning: '夺血脉的主反分支',
            coreDemand: '夺血脉',
            characters: [
              makePlaceholder('char_liu_wuqing', '柳无情', 'branch_leader', 'core', 'leader', '正天道盟盟主'),
              makePlaceholder('char_liu_ruyan', '柳如烟', 'branch_leader', 'core', 'variable', '盟主之女')
            ]
          },
          {
            id: 'branch_elder',
            name: '长老会',
            parentFactionId: 'faction_daomeng',
            positioning: '仙盟议事分支',
            coreDemand: '维护秩序',
            characters: [
              makePlaceholder('char_xu_elder', '徐长老', 'branch_elder', 'mid', 'leader', '仙盟长老'),
              makePlaceholder('char_zhou_envoy', '周特使', 'branch_elder', 'extra', 'functional', '盟主亲信'),
              makePlaceholder('char_sun_deacon', '孙执事', 'branch_elder', 'extra', 'functional', '仙盟执事')
            ]
          }
        ]
      }
    ],
    crossRelations: [
      {
        id: 'cross_01',
        relationType: 'sleeper_agent',
        fromFactionId: 'faction_daomeng',
        toFactionId: 'faction_cangxuan',
        involvedCharacterIds: ['char_zhao_feng'],
        description: '正天道盟在苍玄宗安插暗棋监控主角。',
        revealEpisodeRange: { start: 8, end: 12 }
      }
    ],
    landscapeSummary: '苍玄宗保护主角，正天道盟伪善夺血脉。',
    factionTimetable: []
  }
}

test('outline and characters can be generated directly from story intent without confirmed seven questions', async () => {
  const diagnostics: string[] = []
  let receivedSevenQuestions: unknown = 'not-called'

  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      projectId: 'project_direct',
      storyIntent: buildStoryIntent(),
      outlineDraft: null,
      runtimeConfig: buildRuntimeConfig()
    },
    {
      appendDiagnosticLog: async (message) => {
        diagnostics.push(message)
      },
      generateCharacterProfiles: async () => ({
        characters: [buildCharacter('林烬'), buildCharacter('仙盟大小姐')]
      }),
      generateOutlineBundle: async (input) => {
        receivedSevenQuestions = input.sevenQuestions
        return {
          outline: {
            title: '魔尊血脉',
            genre: '男频修仙',
            theme: '普通人也能在压迫中发光',
            protagonist: '林烬',
            mainConflict: '仙盟大小姐夺取魔尊血脉',
            summary: '林烬在宗门羞辱中觉醒血脉，收起吊坠碎片追查父母旧仇。女主暗中守护，他却被大小姐伪善利用。最终他识破仙盟阴谋，掌控血脉并守住世界。',
            episodes: Array.from({ length: 20 }, (_, index) => ({
              episodeNo: index + 1,
              summary: `第${index + 1}集推进林烬查清吊坠碎片和仙盟阴谋。`
            })),
            facts: []
          }
        }
      }
    }
  )

  assert.equal(receivedSevenQuestions, undefined)
  assert.equal(result.sevenQuestions, null)
  assert.equal(result.outlineDraft.summaryEpisodes.length, 20)
  assert.equal(result.outlineDraft.outlineBlocks?.length, 4)
  assert.ok(result.outlineDraft.outlineBlocks?.every((block) => !block.sevenQuestions))
  assert.equal(result.characterDrafts.length, 2)
  assert.ok(diagnostics.some((message) => message.includes('rough_outline_start direct_story_intent')))
})

test('keeps generated characters but does not fabricate a temporary outline when rough outline fails', async () => {
  const diagnostics: string[] = []

  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      projectId: 'project_partial_outline',
      storyIntent: buildStoryIntent(),
      outlineDraft: null,
      runtimeConfig: buildRuntimeConfig()
    },
    {
      appendDiagnosticLog: async (message) => {
        diagnostics.push(message)
      },
      generateCharacterProfiles: async () => ({
        characters: [buildCharacter('林烬'), buildCharacter('仙盟大小姐')]
      }),
      generateOutlineBundle: async () => {
        throw new Error('rough_outline_batch_retry_exhausted:rough_outline_batch_parse_failed')
      }
    }
  )

  assert.equal(result.characterDrafts.length, 2)
  assert.equal(
    result.outlineGenerationError,
    'rough_outline_batch_retry_exhausted:rough_outline_batch_parse_failed'
  )
  assert.equal(result.outlineDraft.title, '魔尊血脉')
  assert.equal(result.outlineDraft.summary, '')
  assert.equal(result.outlineDraft.summaryEpisodes.length, 0)
  assert.equal(result.outlineDraft.outlineBlocks?.length, 0)
  assert.ok(
    diagnostics.some((message) =>
      message.includes('rough_outline_failed_without_temporary_skeleton')
    )
  )
})

test('adds a mandatory protagonist card when generated faction profiles omit the outline lead', async () => {
  const diagnostics: string[] = []

  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      projectId: 'project_missing_lead',
      storyIntent: {
        ...buildStoryIntent(),
        protagonist: '主角',
        antagonist: '名门正派大小姐',
        generationBriefText:
          '【项目】魔尊血脉｜20集\n男主的母亲吊坠被踩碎后觉醒魔尊血脉，名门正派大小姐伪装善意夺血脉。'
      },
      outlineDraft: null,
      runtimeConfig: buildRuntimeConfig()
    },
    {
      appendDiagnosticLog: async (message) => {
        diagnostics.push(message)
      },
      generateCharacterProfiles: async () => ({
        characters: [buildCharacter('陆渊'), buildCharacter('林若雪')]
      }),
      generateOutlineBundle: async () => ({
        outline: {
          title: '魔尊血脉',
          genre: '男频修仙',
          theme: '废柴逆袭',
          protagonist: '林夜',
          mainConflict: '林夜被名门正派大小姐利用，查清父母旧仇并掌控魔尊血脉',
          summary: '林夜从废柴受辱到吊坠破碎觉醒，再识破名门正派大小姐夺血脉的阴谋。',
          episodes: Array.from({ length: 20 }, (_, index) => ({
            episodeNo: index + 1,
            summary: `第${index + 1}集推进林夜围绕吊坠碎片查清真相。`
          })),
          facts: []
        }
      })
    }
  )

  assert.equal(result.characterDrafts[0]?.name, '林夜')
  assert.match(result.characterDrafts[0]?.biography || '', /母亲吊坠/)
  const protagonistText = JSON.stringify(result.characterDrafts[0])
  assert.equal(protagonistText.includes('真女主'), false)
  assert.equal(protagonistText.includes('名门正派大小姐'), false)
  assert.ok(
    diagnostics.some((message) => message.includes('character_bundle_added_missing_protagonist'))
  )
})

test('locks concrete protagonist name and keeps short series functional roles as light cards', async () => {
  const diagnostics: string[] = []
  const factionMatrix = buildShortSeriesFactionMatrix()
  const profiles = [
    buildProfile({
      id: 'char_lu_yuan',
      name: '陆渊',
      factionId: 'faction_cangxuan',
      branchId: 'branch_guard',
      identity: '资质平庸、人尽可欺的外门杂役，体内封着魔尊血脉',
      biography: '苍玄宗外门弟子，因血脉封印沦为废物，备受欺凌，只求证明自己。'
    }),
    buildProfile({
      id: 'char_yun_qingyao',
      name: '云清瑶',
      factionId: 'faction_cangxuan',
      branchId: 'branch_guard',
      roleInFaction: 'variable',
      identity: '掌门之女',
      biography: '苍玄宗掌门之女，奉父命暗中保护陆渊。'
    }),
    buildProfile({
      id: 'char_yun_zhentian',
      name: '云震天',
      factionId: 'faction_cangxuan',
      branchId: 'branch_law',
      identity: '苍玄宗掌门',
      biography: '苍玄宗掌门，陆渊父母故交，暗中守护其血脉多年。'
    }),
    buildProfile({
      id: 'char_chen_elder',
      name: '陈长老',
      factionId: 'faction_cangxuan',
      branchId: 'branch_law',
      depthLevel: 'mid',
      roleInFaction: 'enforcer',
      identity: '苍玄宗执法堂长老'
    }),
    buildProfile({
      id: 'char_zhao_feng',
      name: '赵峰',
      factionId: 'faction_cangxuan',
      branchId: 'branch_law',
      depthLevel: 'mid',
      roleInFaction: 'variable',
      identity: '执法堂天才弟子，正天道盟暗棋'
    }),
    buildProfile({
      id: 'char_liu_wuqing',
      name: '柳无情',
      factionId: 'faction_daomeng',
      branchId: 'branch_leader',
      identity: '正天道盟盟主'
    }),
    buildProfile({
      id: 'char_liu_ruyan',
      name: '柳如烟',
      factionId: 'faction_daomeng',
      branchId: 'branch_leader',
      roleInFaction: 'variable',
      identity: '盟主之女'
    }),
    buildProfile({
      id: 'char_xu_elder',
      name: '徐长老',
      factionId: 'faction_daomeng',
      branchId: 'branch_elder',
      depthLevel: 'mid',
      identity: '仙盟长老会大长老'
    }),
    buildProfile({
      id: 'char_zhou_envoy',
      name: '周特使',
      factionId: 'faction_daomeng',
      branchId: 'branch_elder',
      depthLevel: 'extra',
      roleInFaction: 'functional',
      identity: '盟主亲信'
    }),
    buildProfile({
      id: 'char_sun_deacon',
      name: '孙执事',
      factionId: 'faction_daomeng',
      branchId: 'branch_elder',
      depthLevel: 'extra',
      roleInFaction: 'functional',
      identity: '仙盟执事'
    })
  ]

  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      projectId: 'project_protagonist_lock',
      storyIntent: {
        ...buildStoryIntent(),
        protagonist: '林霄',
        antagonist: '名门正派大小姐',
        generationBriefText:
          '【项目】魔尊血脉｜20集\n林霄的母亲吊坠被踩碎后觉醒魔尊血脉，名门正派大小姐伪装善意夺血脉。'
      },
      outlineDraft: null,
      runtimeConfig: buildRuntimeConfig()
    },
    {
      appendDiagnosticLog: async (message) => {
        diagnostics.push(message)
      },
      generateCharacterProfiles: async () => ({
        characters: profiles.map(profileToDraft),
        characterProfilesV2: profiles,
        factionMatrix
      }),
      generateOutlineBundle: async (input) => {
        const characterText = JSON.stringify(input.characterProfiles.characters)
        assert.equal(characterText.includes('陆渊'), false)
        assert.ok(characterText.includes('林霄'))
        return {
          outline: {
            title: '魔尊血脉',
            genre: '男频修仙',
            theme: '废柴逆袭',
            protagonist: '林霄',
            mainConflict: '林霄识破伪善大小姐夺血脉的阴谋',
            summary: '林霄从废柴受辱到吊坠破碎觉醒，再识破正天道盟夺血脉的阴谋。',
            episodes: Array.from({ length: 20 }, (_, index) => ({
              episodeNo: index + 1,
              summary: `第${index + 1}集推进林霄围绕吊坠碎片查清真相。`
            })),
            facts: []
          }
        }
      }
    }
  )

  const characterText = JSON.stringify(result.characterDrafts)
  assert.deepEqual(
    result.characterDrafts.filter((character) => character.name === '林霄').map((item) => item.name),
    ['林霄']
  )
  assert.equal(characterText.includes('陆渊'), false)
  assert.equal(characterText.includes('想守住自己还能掌控'), false)
  assert.equal(characterText.includes('退回场外'), false)
  assert.equal(characterText.includes('关键杠杆'), false)
  assert.equal(characterText.includes('名门正派大小姐'), false)
  assert.ok(result.characterDrafts.length <= 8)
  assert.ok(result.entityStore.characters.length > result.characterDrafts.length)
  assert.ok(
    diagnostics.some((message) =>
      message.includes('character_bundle_protagonist_alias_locked from=陆渊 to=林霄')
    )
  )
})
