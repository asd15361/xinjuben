import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import type { CharacterProfileV2Dto } from '@shared/contracts/character-profile-v2'
import type { FactionMatrixDto } from '@shared/contracts/faction-matrix'
import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { CharacterDraftDto } from '@shared/contracts/workflow'
import {
  generateOutlineAndCharactersFromConfirmedSevenQuestions,
  generateOutlineCharacterBundleFromConfirmedSevenQuestions,
  resolveReusableFactionMatrix
} from './generate-outline-and-characters-from-confirmed-seven-questions.ts'
import { isCharacterDraftStructurallyComplete } from '@shared/domain/workflow/character-contract'

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
              makePlaceholder(
                'char_lu_yuan',
                '陆渊',
                'branch_guard',
                'core',
                'leader',
                '被封印的废柴男主'
              ),
              makePlaceholder(
                'char_yun_qingyao',
                '云清瑶',
                'branch_guard',
                'core',
                'variable',
                '掌门之女'
              )
            ]
          },
          {
            id: 'branch_law',
            name: '执法堂',
            parentFactionId: 'faction_cangxuan',
            positioning: '宗门规矩压力',
            coreDemand: '维护门规',
            characters: [
              makePlaceholder(
                'char_yun_zhentian',
                '云震天',
                'branch_law',
                'core',
                'leader',
                '苍玄宗掌门'
              ),
              makePlaceholder(
                'char_chen_elder',
                '陈长老',
                'branch_law',
                'mid',
                'enforcer',
                '执法堂长老'
              ),
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
              makePlaceholder(
                'char_liu_wuqing',
                '柳无情',
                'branch_leader',
                'core',
                'leader',
                '正天道盟盟主'
              ),
              makePlaceholder(
                'char_liu_ruyan',
                '柳如烟',
                'branch_leader',
                'core',
                'variable',
                '盟主之女'
              )
            ]
          },
          {
            id: 'branch_elder',
            name: '长老会',
            parentFactionId: 'faction_daomeng',
            positioning: '仙盟议事分支',
            coreDemand: '维护秩序',
            characters: [
              makePlaceholder(
                'char_xu_elder',
                '徐长老',
                'branch_elder',
                'mid',
                'leader',
                '仙盟长老'
              ),
              makePlaceholder(
                'char_zhou_envoy',
                '周特使',
                'branch_elder',
                'extra',
                'functional',
                '盟主亲信'
              ),
              makePlaceholder(
                'char_sun_deacon',
                '孙执事',
                'branch_elder',
                'extra',
                'functional',
                '仙盟执事'
              )
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
            summary:
              '林烬在宗门羞辱中觉醒血脉，收起吊坠碎片追查父母旧仇。女主暗中守护，他却被大小姐伪善利用。最终他识破仙盟阴谋，掌控血脉并守住世界。',
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
  assert.ok(
    diagnostics.some((message) => message.includes('rough_outline_start direct_story_intent'))
  )
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

test('characters-only generation does not call rough outline generation', async () => {
  let outlineCalled = false
  const factionMatrix = buildShortSeriesFactionMatrix()

  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      projectId: 'project_characters_only',
      storyIntent: buildStoryIntent(),
      outlineDraft: null,
      runtimeConfig: buildRuntimeConfig(),
      mode: 'characters_only'
    },
    {
      generateCharacterProfiles: async () => ({
        characters: [buildCharacter('林烬'), buildCharacter('仙盟大小姐')],
        factionMatrix
      }),
      generateOutlineBundle: async () => {
        outlineCalled = true
        throw new Error('outline_should_not_run')
      }
    }
  )

  assert.equal(outlineCalled, false)
  assert.equal(result.outlineGenerationError, undefined)
  assert.equal(result.characterDrafts.length, 2)
  assert.equal(result.outlineDraft.summaryEpisodes.length, 0)
  assert.equal(result.outlineDraft.outlineBlocks?.length, 0)
  assert.equal(result.storyIntent.storyFoundation?.factionMatrix?.title, factionMatrix.title)
  assert.ok(result.storyIntent.worldBible)
  assert.ok(result.storyIntent.characterRoster)
})

test('resolveReusableFactionMatrix prefers story foundation faction matrix over legacy top-level matrix', () => {
  const legacyMatrix = {
    ...buildShortSeriesFactionMatrix(),
    title: '旧顶层阵营'
  }
  const foundationMatrix = {
    ...buildShortSeriesFactionMatrix(),
    title: '世界底账阵营'
  }

  const selected = resolveReusableFactionMatrix({
    ...buildStoryIntent(),
    factionMatrix: legacyMatrix,
    storyFoundation: {
      worldBible: {
        definition: '世界定义',
        worldType: '修仙',
        eraAndSpace: '宗门与仙盟',
        socialOrder: '宗门压迫外门',
        historicalWound: '旧案未平',
        powerOrRuleSystem: '血脉规则',
        coreResources: ['血脉'],
        taboosAndCosts: ['失控反噬'],
        shootableLocations: ['宗门'],
        source: 'user_confirmed'
      },
      factionMatrix: foundationMatrix,
      characterRoster: {
        totalEpisodes: 20,
        minimumRoleSlots: 10,
        standardRoleSlots: 13,
        actualRoleSlots: 2,
        entries: []
      }
    }
  })

  assert.equal(selected?.title, '世界底账阵营')
})

test('resolveReusableFactionMatrix falls back to legacy top-level faction matrix', () => {
  const legacyMatrix = {
    ...buildShortSeriesFactionMatrix(),
    title: '旧顶层阵营'
  }

  const selected = resolveReusableFactionMatrix({
    ...buildStoryIntent(),
    factionMatrix: legacyMatrix
  })

  assert.equal(selected?.title, '旧顶层阵营')
})

test('canonical outline-character bundle preserves character ledger when rough outline fails', async () => {
  const factionMatrix = buildShortSeriesFactionMatrix()
  const profiles = [
    buildProfile({
      id: 'char_lin_jin',
      name: '林烬',
      factionId: 'faction_cangxuan',
      branchId: 'branch_guard',
      identity: '被宗门打压的外门弟子'
    }),
    buildProfile({
      id: 'char_xianmeng_lady',
      name: '仙盟大小姐',
      factionId: 'faction_daomeng',
      branchId: 'branch_leader',
      identity: '伪装善意夺取血脉的仙盟贵女'
    })
  ]

  const bundle = await generateOutlineCharacterBundleFromConfirmedSevenQuestions(
    {
      projectId: 'project_bundle_partial_outline',
      storyIntent: buildStoryIntent(),
      outlineDraft: null,
      runtimeConfig: buildRuntimeConfig()
    },
    {
      appendDiagnosticLog: async () => {},
      generateCharacterProfiles: async () => ({
        characters: profiles.map(profileToDraft),
        characterProfilesV2: profiles,
        factionMatrix
      }),
      generateOutlineBundle: async () => {
        throw new Error('rough_outline_batch_retry_exhausted:rough_outline_batch_parse_failed')
      }
    }
  )

  assert.equal(
    bundle.outlineGenerationError,
    'rough_outline_batch_retry_exhausted:rough_outline_batch_parse_failed'
  )
  assert.deepEqual(
    bundle.characterLedger.visibleCharacterDrafts.map((character) => character.name),
    ['林烬', '仙盟大小姐']
  )
  assert.equal(bundle.characterLedger.entityStore.characters.length >= 2, true)
  assert.equal(bundle.warnings[0]?.code, 'rough_outline_generation_failed')
  assert.ok(
    bundle.diagnostics.some((diagnostic) =>
      diagnostic.message.includes('rough_outline_failed_without_temporary_skeleton')
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
  assert.equal(isCharacterDraftStructurallyComplete(result.characterDrafts[0]!), true)
  assert.match(result.characterDrafts[0]?.biography || '', /母亲吊坠/)
  const protagonistText = JSON.stringify(result.characterDrafts[0])
  assert.equal(protagonistText.includes('真女主'), false)
  assert.equal(protagonistText.includes('名门正派大小姐'), false)
  assert.ok(
    diagnostics.some((message) => message.includes('character_bundle_added_missing_protagonist'))
  )
})

test('mandatory protagonist fallback follows female CEO strategy without cultivation leakage', async () => {
  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      projectId: 'project_missing_female_ceo_lead',
      storyIntent: {
        ...buildStoryIntent(),
        titleHint: '契约热搜',
        genre: '都市甜宠',
        protagonist: '主角',
        antagonist: '顾氏集团',
        coreConflict: '许晚被豪门和集团舆论压迫，必须拿回契约和股权主动权',
        marketProfile: {
          audienceLane: 'female',
          subgenre: '女频霸总甜宠'
        },
        generationBriefText:
          '【项目】契约热搜｜20集\n许晚被豪门集团用契约和热搜逼到绝境，必须拿回股权主动权。'
      },
      outlineDraft: null,
      runtimeConfig: buildRuntimeConfig()
    },
    {
      appendDiagnosticLog: async () => {},
      generateCharacterProfiles: async () => ({
        characters: [
          {
            name: '顾承安',
            biography: '顾承安是顾氏集团继承人，夹在家族利益和许晚之间。',
            publicMask: '表面冷静克制，用工作安排掩饰保护。',
            hiddenPressure: '家族董事会逼他牺牲许晚换取集团稳定。',
            fear: '失去许晚和集团控制权。',
            protectTarget: '许晚、契约真相和顾氏集团的底线。',
            conflictTrigger: '董事会拿热搜逼他切割许晚时，他会公开撑腰。',
            advantage: '能调动集团法务、公关和董事会表决资源。',
            weakness: '过度依赖集团身份，容易被家族责任绑架。',
            goal: '稳住集团并让许晚拿回主动权。',
            arc: '起点：只会冷处理；触发：许晚被热搜围攻；中段摇摆：家族逼他切割；代价选择：公开站队；终局变化：学会把权力交给许晚共同使用。',
            roleLayer: 'core'
          }
        ]
      }),
      generateOutlineBundle: async () => ({
        outline: {
          title: '契约热搜',
          genre: '都市甜宠',
          theme: '亲密关系里的选择权',
          protagonist: '许晚',
          mainConflict: '许晚被豪门和集团舆论压迫，必须拿回契约和股权主动权',
          summary: '许晚从被契约和热搜夹击，到拿回股权证据并逼顾氏集团公开改口。',
          episodes: Array.from({ length: 20 }, (_, index) => ({
            episodeNo: index + 1,
            summary: `第${index + 1}集推进许晚围绕契约和股权反击。`
          })),
          facts: []
        }
      })
    }
  )

  assert.equal(result.characterDrafts[0]?.name, '许晚')
  const leadText = JSON.stringify(result.characterDrafts[0])
  assert.match(leadText, /女频霸总甜宠|契约|股权|集团|豪门/)
  assert.equal(/宗门|仙盟|魔尊血脉|灵根|法阵|修为/u.test(leadText), false)
})

test('outline-character bundle repairs generated text that contaminates selected strategy', async () => {
  const bundle = await generateOutlineCharacterBundleFromConfirmedSevenQuestions(
    {
      projectId: 'project_female_ceo_contamination',
      storyIntent: {
        ...buildStoryIntent(),
        titleHint: '契约热搜',
        genre: '都市甜宠',
        protagonist: '许晚',
        antagonist: '顾氏集团',
        coreConflict: '许晚被豪门和集团舆论压迫，必须拿回契约和股权主动权',
        marketProfile: {
          audienceLane: 'female',
          subgenre: '女频霸总甜宠'
        },
        generationBriefText:
          '【项目】契约热搜｜20集\n许晚被豪门集团用契约和热搜逼到绝境，必须拿回股权主动权。'
      },
      outlineDraft: null,
      runtimeConfig: buildRuntimeConfig()
    },
    {
      appendDiagnosticLog: async () => {},
      generateCharacterProfiles: async () => ({
        characters: [
          {
            ...buildCharacter('许晚'),
            biography: '许晚被集团合同逼到绝境，但输出里错误混入宗门审判。',
            publicMask: '表面配合集团，暗里保存录音。'
          }
        ]
      }),
      generateOutlineBundle: async () => ({
        outline: {
          title: '契约热搜',
          genre: '都市甜宠',
          theme: '亲密关系里的选择权',
          protagonist: '许晚',
          mainConflict: '许晚被豪门和集团舆论压迫，必须拿回契约和股权主动权',
          summary: '许晚拿回股权证据，却被错误写成仙盟追杀。',
          episodes: Array.from({ length: 20 }, (_, index) => ({
            episodeNo: index + 1,
            summary: `第${index + 1}集推进许晚围绕契约和股权反击。`
          })),
          facts: []
        }
      })
    }
  )

  assert.ok(
    bundle.warnings.some(
      (warning) =>
        warning.code === 'generation_strategy_contamination_repaired' &&
        /宗门|仙盟/u.test(warning.message)
    )
  )
  assert.equal(
    bundle.warnings.some((warning) => warning.code === 'generation_strategy_contamination'),
    false
  )
  assert.equal(/宗门|仙盟/u.test(JSON.stringify(bundle.outlineDraft)), false)
  assert.equal(
    /宗门|仙盟/u.test(JSON.stringify(bundle.characterLedger.visibleCharacterDrafts)),
    false
  )
  assert.equal(/宗门|仙盟/u.test(JSON.stringify(bundle.characterLedger.entityStore)), false)
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
    result.characterDrafts
      .filter((character) => character.name === '林霄')
      .map((item) => item.name),
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
    result.entityStore.characters.some(
      (character) => character.identityMode === 'slot' && character.tags.includes('轻量人物卡')
    )
  )
  assert.ok(
    diagnostics.some((message) =>
      message.includes('character_bundle_protagonist_alias_locked from=陆渊 to=林霄')
    )
  )
})

test('repairs protagonist card when AI uses the protagonist name for the sect leader', async () => {
  const diagnostics: string[] = []
  const suspiciousLeader: CharacterDraftDto = {
    ...buildCharacter('林潜渊'),
    biography:
      '林潜渊是青云宗掌门，面容清癯，道袍飘逸，看似仙风道骨。他维持宗门现状，阻止林潜渊觉醒真相。',
    identity: '青云宗掌门',
    publicMask: '人前对林潜渊关怀备至，以磨砺心性为由解释苛刻。',
    hiddenPressure: '怕林潜渊觉醒后查清真相，揭露自己当年的过失。',
    goal: '维持宗门现状，阻止林潜渊觉醒真相，必要时牺牲林潜渊换取宗门安全。'
  }

  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      projectId: 'project_protagonist_role_collision',
      storyIntent: {
        ...buildStoryIntent(),
        protagonist: '林潜渊',
        antagonist: '陆昭仪',
        generationBriefText:
          '【项目】魔尊血脉｜20集\n男主林潜渊的母亲吊坠被踩碎后觉醒魔尊血脉，青云宗掌门暗中保护他，陆昭仪伪装善意夺血脉。'
      },
      outlineDraft: null,
      runtimeConfig: buildRuntimeConfig()
    },
    {
      appendDiagnosticLog: async (message) => {
        diagnostics.push(message)
      },
      generateCharacterProfiles: async () => ({
        characters: [suspiciousLeader, buildCharacter('苏韵'), buildCharacter('陆昭仪')]
      }),
      generateOutlineBundle: async () => ({
        outline: {
          title: '魔尊血脉',
          genre: '男频修仙',
          theme: '废柴逆袭',
          protagonist: '林潜渊',
          mainConflict: '林潜渊识破陆昭仪夺血脉的阴谋',
          summary: '林潜渊从废柴受辱到吊坠破碎觉醒，再识破陆昭仪夺血脉的阴谋。',
          episodes: Array.from({ length: 20 }, (_, index) => ({
            episodeNo: index + 1,
            summary: `第${index + 1}集推进林潜渊围绕吊坠碎片查清真相。`
          })),
          facts: []
        }
      })
    }
  )

  const lead = result.characterDrafts.find((character) => character.name === '林潜渊')
  assert.ok(lead)
  assert.match(JSON.stringify(lead), /吊坠|血脉|底层弟子|身世/)
  assert.doesNotMatch(JSON.stringify(lead), /青云宗掌门|维持宗门现状|牺牲林潜渊/)
  assert.ok(result.characterDrafts.some((character) => character.name === '沈观澜'))
  assert.ok(
    diagnostics.some((message) =>
      message.includes('character_bundle_repaired_protagonist_role_collision')
    )
  )
})

test('cleans protagonist name pollution from non-protagonist profiles', async () => {
  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      projectId: 'project_name_pollution_cleanup',
      storyIntent: {
        ...buildStoryIntent(),
        protagonist: '林潜渊',
        antagonist: '陆昭仪',
        generationBriefText:
          '【项目】魔尊血脉｜20集\n林潜渊是青云宗底层弟子，青云宗掌门暗中保护他，陆昭仪伪装接近夺血脉。'
      },
      outlineDraft: null,
      runtimeConfig: buildRuntimeConfig()
    },
    {
      generateCharacterProfiles: async () => ({
        characters: [
          buildCharacter('林潜渊'),
          {
            ...buildCharacter('林清雪'),
            biography:
              '林清雪是掌门之女。父亲林潜渊命她不得接近林潜渊，同时与魔渊左护法林潜渊有秘密联络。',
            protectTarget: '林潜渊林潜渊（因承诺与感情）和母亲的名誉',
            advantage: '掌门之女身份可自由进出藏经阁禁地，林潜渊暗中提供魔渊情报和丹药'
          },
          {
            ...buildCharacter('赵铁'),
            biography: '赵铁是青云宗执法堂长老。',
            conflictTrigger: '林潜渊在林潜渊指点下修为突飞猛进，赵铁断定是魔功反噬。',
            goal: '逼林潜渊让出掌门位，铲除林潜渊这个祸根。',
            hiddenPressure:
              '林潜渊一直用掌门权压制他的行动，他怀疑林潜渊与魔修有染，苦无证据。',
            arc: '起点：表面忠心的二把手，暗中收集林潜渊黑料。触发：查到林潜渊血脉异常，但被林潜渊压下。摇摆：当林潜渊血脉力量明显暴露或林潜渊再次包庇时，他会直接发动执法堂抓捕。'
          }
        ]
      }),
      generateOutlineBundle: async () => ({
        outline: {
          title: '魔尊血脉',
          genre: '男频修仙',
          theme: '废柴逆袭',
          protagonist: '林潜渊',
          mainConflict: '林潜渊识破陆昭仪夺血脉的阴谋',
          summary: '林潜渊从废柴受辱到吊坠破碎觉醒，再识破陆昭仪夺血脉的阴谋。',
          episodes: Array.from({ length: 20 }, (_, index) => ({
            episodeNo: index + 1,
            summary: `第${index + 1}集推进林潜渊围绕吊坠碎片查清真相。`
          })),
          facts: []
        }
      })
    }
  )

  const text = JSON.stringify(result.characterDrafts)
  assert.doesNotMatch(text, /林潜渊林潜渊/)
  assert.doesNotMatch(text, /林潜渊（林潜渊）/)
  assert.doesNotMatch(text, /父亲林潜渊/)
  assert.doesNotMatch(text, /左护法林潜渊/)
  assert.doesNotMatch(text, /林潜渊在林潜渊指点下/)
  assert.doesNotMatch(text, /逼林潜渊让出掌门位/)
  assert.doesNotMatch(text, /林潜渊一直用掌门权/)
  assert.doesNotMatch(text, /收集林潜渊黑料/)
  assert.doesNotMatch(text, /但被林潜渊压下/)
  assert.doesNotMatch(text, /林潜渊再次包庇/)
  assert.match(text, /逼沈观澜让出掌门位/)
  assert.match(text, /沈观澜一直用掌门权/)
  assert.match(text, /收集沈观澜黑料/)
  assert.match(text, /但被沈观澜压下/)
  assert.match(text, /沈观澜再次包庇/)
})

test('keeps protagonist primary faction on home sect instead of demon remnant faction', async () => {
  const factionMatrix: FactionMatrixDto = {
    ...buildShortSeriesFactionMatrix(),
    factions: [
      {
        ...buildShortSeriesFactionMatrix().factions[0]!,
        id: 'faction_qingyun',
        name: '青云宗',
        positioning: '主角所在宗门，暗中保护并压制主角血脉'
      },
      buildShortSeriesFactionMatrix().factions[1]!,
      {
        id: 'faction_moyuan',
        name: '魔渊旧部',
        positioning: '昔日魔尊残余势力，寻找血脉复辟',
        coreDemand: '找回魔尊血脉',
        coreValues: '力量复仇',
        mainMethods: ['试探', '救援'],
        vulnerabilities: ['内部分裂'],
        branches: [
          {
            id: 'branch_moyuan_core',
            name: '旧部核心',
            parentFactionId: 'faction_moyuan',
            positioning: '魔渊旧部主线',
            coreDemand: '认主或夺权',
            characters: [
              {
                id: 'char_lin_qianyuan_moyuan',
                name: '林潜渊',
                roleInFaction: 'leader',
                branchId: 'branch_moyuan_core',
                depthLevel: 'core',
                identity: '魔尊血脉继承者',
                coreMotivation: '掌控血脉',
                plotFunction: '牵动旧部复辟'
              },
              {
                id: 'char_chilian',
                name: '赤炼',
                roleInFaction: 'enforcer',
                branchId: 'branch_moyuan_core',
                depthLevel: 'core',
                identity: '魔渊战将',
                coreMotivation: '验证新主',
                plotFunction: '逼主角成长'
              }
            ]
          },
          {
            id: 'branch_moyuan_spy',
            name: '暗影堂',
            parentFactionId: 'faction_moyuan',
            positioning: '情报刺杀',
            coreDemand: '制造信息差',
            characters: [
              {
                id: 'char_yingxiao',
                name: '影枭',
                roleInFaction: 'leader',
                branchId: 'branch_moyuan_spy',
                depthLevel: 'mid',
                identity: '暗影堂首领',
                coreMotivation: '执行任务',
                plotFunction: '提供情报'
              },
              {
                id: 'char_liuniang',
                name: '柳娘',
                roleInFaction: 'functional',
                branchId: 'branch_moyuan_spy',
                depthLevel: 'extra',
                identity: '散修密探',
                coreMotivation: '拿钱办事',
                plotFunction: '递送线索'
              }
            ]
          }
        ]
      }
    ],
    crossRelations: [
      ...buildShortSeriesFactionMatrix().crossRelations,
      {
        id: 'cross_moyuan_qingyun',
        relationType: 'secret_ally',
        fromFactionId: 'faction_moyuan',
        toFactionId: 'faction_qingyun',
        involvedCharacterIds: ['char_lin_qianyuan_moyuan'],
        description: '魔渊旧部试图接回林潜渊，但青云宗掌门暂时压住真相。',
        revealEpisodeRange: { start: 10, end: 14 }
      }
    ]
  }

  const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(
    {
      projectId: 'project_home_faction',
      storyIntent: {
        ...buildStoryIntent(),
        protagonist: '林潜渊',
        antagonist: '陆昭仪',
        generationBriefText:
          '【项目】魔尊血脉｜20集\n林潜渊是青云宗底层弟子，后被魔渊旧部试探是否继承魔尊血脉。'
      },
      outlineDraft: null,
      runtimeConfig: buildRuntimeConfig(),
      mode: 'characters_only'
    },
    {
      generateCharacterProfiles: async () => ({
        characters: [buildCharacter('林潜渊'), buildCharacter('陆昭仪'), buildCharacter('赤炼')],
        factionMatrix
      })
    }
  )

  const protagonist = result.entityStore.characters.find((character) => character.name === '林潜渊')
  assert.ok(protagonist)
  const linkedFaction = result.entityStore.factions.find(
    (faction) => faction.id === protagonist?.linkedFactionIds[0]
  )
  assert.equal(linkedFaction?.name, '青云宗')
})
