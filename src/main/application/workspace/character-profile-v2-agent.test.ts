import test from 'node:test'
import assert from 'node:assert/strict'

import type { AiGenerateRequestDto, AiGenerateResponseDto } from '../../../shared/contracts/ai.ts'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import type { FactionMatrixDto } from '../../../shared/contracts/faction-matrix.ts'
import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config.ts'
import {
  generateCharacterProfileV2,
  parseCharacterProfileV2Response
} from './character-profile-v2-agent.ts'

function createStoryIntent(): StoryIntentPackageDto {
  return {
    titleHint: '修仙传',
    genre: '玄幻',
    protagonist: '黎明',
    antagonist: '李科',
    sellingPremise: '天才隐忍复仇',
    coreConflict: '黎明被压着走，但一直在暗里布棋',
    officialKeyCharacters: ['黎明', '李科', '苏婉'],
    lockedCharacterNames: ['黎明', '李科'],
    themeAnchors: ['藏锋'],
    worldAnchors: ['宗门高压'],
    relationAnchors: ['压迫与反咬'],
    dramaticMovement: ['被压', '试探', '反咬'],
    shortDramaConstitution: {
      corePrinciple: '先压后翻',
      coreEmotion: '窒息感后反咬快感',
      episodeTotal: 20,
      worldViewBrief: '宗门高压，阶序森严，暗线交错',
      incitingIncident: {
        timingRequirement: '第1集立刻压上来',
        disruption: '执法堂当众拿人',
        mainLine: '逼主角暴露底牌'
      },
      protagonistArc: {
        flawBelief: '只要一直忍就能活',
        growthMode: '学会借压力设局',
        payoff: '当众反咬掌局'
      },
      povPolicy: {
        mode: 'single_protagonist',
        allowedAuxiliaryViewpoints: [],
        restriction: '只在必要处短切他人视角'
      },
      climaxPolicy: {
        episodeHookRule: '每集末尾必须有结果落地',
        finalePayoffRule: '终局必须翻盘',
        callbackRequirement: '前期压迫物件后期反用'
      }
    }
  }
}

function createRuntimeConfig(): RuntimeProviderConfig {
  return {
    deepseek: {
      apiKey: '',
      baseUrl: 'https://example.com/deepseek',
      model: 'deepseek-test',
      systemInstruction: '',
      timeoutMs: 45000
    },
    openrouterGeminiFlashLite: {
      apiKey: '',
      baseUrl: 'https://example.com/gemini',
      model: 'gemini-test',
      systemInstruction: '',
      timeoutMs: 45000
    },
    openrouterQwenFree: {
      apiKey: '',
      baseUrl: 'https://example.com/qwen',
      model: 'qwen-test',
      systemInstruction: '',
      timeoutMs: 45000
    },
    lanes: {
      deepseek: true,
      openrouterGeminiFlashLite: true,
      openrouterQwenFree: false
    },
    runtimeFetchTimeoutMs: 15000
  }
}

function createFactionMatrix(): FactionMatrixDto {
  return {
    title: '玄玉宫暗战',
    totalEpisodes: 20,
    factions: [
      {
        id: 'faction_01',
        name: '玄玉宫',
        positioning: '表面正统宗门',
        coreDemand: '守住秩序和统治',
        coreValues: '秩序高于人命',
        mainMethods: ['规矩压人'],
        vulnerabilities: ['旧账太多'],
        branches: [
          {
            id: 'branch_01',
            name: '执法堂',
            parentFactionId: 'faction_01',
            positioning: '强力镇压',
            coreDemand: '稳住权力',
            characters: [
              {
                id: 'char_01',
                name: '李科',
                roleInFaction: 'leader',
                branchId: 'branch_01',
                depthLevel: 'core',
                identity: '执法堂主事',
                coreMotivation: '稳住手中权柄',
                plotFunction: '持续施压',
                isSleeper: false,
                sleeperForFactionId: undefined
              },
              {
                id: 'char_02',
                name: '赵武',
                roleInFaction: 'enforcer',
                branchId: 'branch_01',
                depthLevel: 'mid',
                identity: '执法堂打手',
                coreMotivation: '靠站队上位',
                plotFunction: '执行暴力',
                isSleeper: false,
                sleeperForFactionId: undefined
              }
            ]
          },
          {
            id: 'branch_02',
            name: '医庐',
            parentFactionId: 'faction_01',
            positioning: '看似中立',
            coreDemand: '保住人和秘密',
            characters: [
              {
                id: 'char_03',
                name: '苏婉',
                roleInFaction: 'leader',
                branchId: 'branch_02',
                depthLevel: 'mid',
                identity: '医庐掌药',
                coreMotivation: '保人不保规矩',
                plotFunction: '递送信息',
                isSleeper: false,
                sleeperForFactionId: undefined
              },
              {
                id: 'char_04',
                name: '药童',
                roleInFaction: 'functional',
                branchId: 'branch_02',
                depthLevel: 'extra',
                identity: '跑腿药童',
                coreMotivation: '先活命',
                plotFunction: '递药递话',
                isSleeper: false,
                sleeperForFactionId: undefined
              }
            ]
          }
        ]
      }
    ],
    crossRelations: [
      {
        id: 'cross_01',
        relationType: 'double_agent',
        fromFactionId: 'faction_01',
        toFactionId: 'faction_01',
        involvedCharacterIds: ['char_03'],
        description: '苏婉表面救人，实际在暗里交换情报',
        revealEpisodeRange: { start: 8, end: 10 }
      }
    ],
    landscapeSummary: '宗门表面平静，内部人人带伤带债',
    factionTimetable: [
      {
        factionId: 'faction_01',
        entryEpisode: 1,
        entryDescription: '开场就用规矩压人'
      }
    ]
  }
}

function createMultiFactionMatrix(): FactionMatrixDto {
  return {
    ...createFactionMatrix(),
    factions: [
      createFactionMatrix().factions[0]!,
      {
        id: 'faction_02',
        name: '黑沼盟',
        positioning: '外部渗透势力',
        coreDemand: '借乱夺权',
        coreValues: '先赢再讲道义',
        mainMethods: ['收买', '卧底'],
        vulnerabilities: ['内部互不信任'],
        branches: [
          {
            id: 'branch_03',
            name: '暗桩线',
            parentFactionId: 'faction_02',
            positioning: '安插暗线',
            coreDemand: '撬开玄玉宫',
            characters: [
              {
                id: 'char_11',
                name: '乌七',
                roleInFaction: 'leader',
                branchId: 'branch_03',
                depthLevel: 'core',
                identity: '黑沼盟暗线头子',
                coreMotivation: '拿到宫内命脉',
                plotFunction: '制造阵营反咬',
                isSleeper: false,
                sleeperForFactionId: undefined
              },
              {
                id: 'char_12',
                name: '柳隐',
                roleInFaction: 'variable',
                branchId: 'branch_03',
                depthLevel: 'mid',
                identity: '游走两边的信使',
                coreMotivation: '两头下注',
                plotFunction: '制造信息差',
                isSleeper: false,
                sleeperForFactionId: undefined
              }
            ]
          }
        ]
      }
    ]
  }
}

test('parseCharacterProfileV2Response accepts complete core and mid profiles', () => {
  const parsed = parseCharacterProfileV2Response(
    JSON.stringify({
      characters: [
        {
          id: 'char_01',
          name: '黎明',
          depthLevel: 'core',
          factionId: 'faction_01',
          branchId: 'branch_01',
          roleInFaction: 'leader',
          appearance: '瘦削冷脸，衣袍常带血痕',
          personality: '外冷内忍，受压时更会算计',
          identity: '被压着活的天才弟子',
          values: '先护住在乎的人，再亮底反杀',
          plotFunction: '把被动局面一步步拧回自己手里',
          hiddenPressure: '底牌一亮就会牵连旧案',
          fear: '苏婉被拖下水',
          protectTarget: '身边唯一还信他的人',
          conflictTrigger: '李科拿无辜者当筹码',
          advantage: '能在重压里保持判断',
          weakness: '护短时容易失控',
          goal: '活下来并反咬回去',
          arc: '从藏锋求活到主动设局',
          publicMask: '表面示弱认怂',
          biography: '天才弟子，外冷内忍'
        },
        {
          id: 'char_02',
          name: '苏婉',
          depthLevel: 'mid',
          factionId: 'faction_01',
          branchId: 'branch_02',
          roleInFaction: 'functional',
          appearance: '素衣清冷，手上总有药香',
          personality: '冷静克制，但底线很硬',
          identity: '医庐掌药',
          values: '该救的人一定要救',
          plotFunction: '在高压局里替主角接通生路'
        }
      ]
    })
  )

  assert.ok(parsed)
  assert.equal(parsed?.characters.length, 2)
})

test('generateCharacterProfileV2 retries once and returns second valid result', async () => {
  const attempts: string[] = []
  const diagnostics: string[] = []

  const result = await generateCharacterProfileV2({
    storyIntent: createStoryIntent(),
    factionMatrix: createFactionMatrix(),
    runtimeConfig: createRuntimeConfig(),
    diagnosticLogger: async (message) => {
      diagnostics.push(message)
    },
    generateText: async ({
      prompt
    }: AiGenerateRequestDto): Promise<AiGenerateResponseDto> => {
      attempts.push(prompt)
      if (attempts.length === 1) {
        return {
          text: JSON.stringify({
            characters: [
              {
                id: 'char_01',
                name: '黎明',
                depthLevel: 'core',
                appearance: '瘦削冷脸',
                personality: '外冷内忍',
                identity: '弟子',
                values: '先护人',
                plotFunction: '反设局'
              }
            ]
          }),
          lane: 'deepseek',
          model: 'test-model',
          usedFallback: false
        }
      }

      return {
        text: JSON.stringify({
          characters: [
            {
              id: 'char_01',
              name: '黎明',
              depthLevel: 'core',
              appearance: '瘦削冷脸，袖口常带旧血',
              personality: '外冷内忍，被压越狠越清醒',
              identity: '被压着活的天才弟子',
              values: '先护住在乎的人，再亮底反杀',
              plotFunction: '把被动局面一步步拧回自己手里',
              hiddenPressure: '旧案一旦翻开就会连累自己人',
              fear: '苏婉被拖下水',
              protectTarget: '身边最后的活路',
              conflictTrigger: '李科拿无辜者做局',
              advantage: '能在压力里看穿对手节奏',
              weakness: '护短时会失控',
              goal: '活下来并反咬回去',
              arc: '从藏锋求活到主动设局',
              publicMask: '表面示弱认怂',
              biography: '一直藏锋，等对手先露底'
            }
          ]
        }),
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false
      }
    }
  })

  assert.equal(attempts.length, 2)
  assert.equal(result.characters[0]?.name, '黎明')
  assert.ok(diagnostics.some((line) => line.includes('parse_failed')))
  assert.ok(diagnostics.some((line) => line.includes('finish')))
})

test('generateCharacterProfileV2 chunks by faction and merges results', async () => {
  const prompts: string[] = []

  const result = await generateCharacterProfileV2({
    storyIntent: createStoryIntent(),
    factionMatrix: createMultiFactionMatrix(),
    runtimeConfig: createRuntimeConfig(),
    diagnosticLogger: async () => {},
    generateText: async ({
      prompt
    }: AiGenerateRequestDto): Promise<AiGenerateResponseDto> => {
      prompts.push(prompt)

      if (prompt.includes('玄玉宫')) {
        return {
          text: JSON.stringify({
            characters: [
              {
                id: 'char_01',
                name: '李科',
                depthLevel: 'core',
                factionId: 'faction_01',
                branchId: 'branch_01',
                roleInFaction: 'leader',
                appearance: '黑袍冷脸，腰悬执法令',
                personality: '狠辣自负',
                identity: '执法堂主事',
                values: '秩序是掌权工具',
                plotFunction: '代表旧秩序持续施压',
                hiddenPressure: '怕旧账被翻',
                fear: '丢掉权柄',
                protectTarget: '执法堂权位',
                conflictTrigger: '有人公开拆他台',
                advantage: '能调规矩和人手压人',
                weakness: '过度相信掌控力',
                goal: '逼主角露底',
                arc: '从稳压到失控',
                publicMask: '表面公事公办',
                biography: '执法堂主事，靠规矩压人'
              }
            ]
          }),
          lane: 'deepseek',
          model: 'test-model',
          usedFallback: false
        }
      }

      return {
        text: JSON.stringify({
          characters: [
            {
              id: 'char_11',
              name: '乌七',
              depthLevel: 'core',
              factionId: 'faction_02',
              branchId: 'branch_03',
              roleInFaction: 'leader',
              appearance: '灰袍枯瘦，眼神阴沉',
              personality: '多疑阴狠',
              identity: '黑沼盟暗线头子',
              values: '先赢下来再谈道义',
              plotFunction: '把外部黑手伸进宗门腹地',
              hiddenPressure: '盟内随时会换掉他',
              fear: '失去唯一的潜入窗口',
              protectTarget: '自己安插多年的暗桩',
              conflictTrigger: '暗线被人连根拔起',
              advantage: '擅长操控信息差',
              weakness: '太想一步到位',
              goal: '夺下玄玉宫命脉',
              arc: '从暗中渗透到被迫提前现身',
              publicMask: '永远像个无害行脚商',
              biography: '黑沼盟暗线头子，专门从内部掏空对手'
            }
          ]
        }),
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false
      }
    }
  })

  assert.equal(prompts.length, 2)
  assert.equal(result.characters.length, 2)
  assert.deepEqual(
    result.characters.map((item) => item.name).sort(),
    ['乌七', '李科']
  )
})

test('generateCharacterProfileV2 throws faction-specific error when one chunk fails', async () => {
  await assert.rejects(
    () =>
      generateCharacterProfileV2({
        storyIntent: createStoryIntent(),
        factionMatrix: createMultiFactionMatrix(),
        runtimeConfig: createRuntimeConfig(),
        diagnosticLogger: async () => {},
        generateText: async ({
          prompt
        }: AiGenerateRequestDto): Promise<AiGenerateResponseDto> => {
          if (prompt.includes('黑沼盟')) {
            return {
              text: '{"characters": [',
              lane: 'deepseek',
              model: 'test-model',
              usedFallback: false
            }
          }

          return {
            text: JSON.stringify({
              characters: [
                {
                  id: 'char_01',
                  name: '李科',
                  depthLevel: 'core',
                  factionId: 'faction_01',
                  branchId: 'branch_01',
                  roleInFaction: 'leader',
                  appearance: '黑袍冷脸',
                  personality: '狠辣自负',
                  identity: '执法堂主事',
                  values: '秩序是掌权工具',
                  plotFunction: '持续施压',
                  hiddenPressure: '怕旧账被翻',
                  fear: '丢掉权柄',
                  protectTarget: '权位',
                  conflictTrigger: '有人拆台',
                  advantage: '能调人手',
                  weakness: '太自负',
                  goal: '逼主角露底',
                  arc: '从稳压到失控',
                  publicMask: '表面公事公办',
                  biography: '执法堂主事'
                }
              ]
            }),
            lane: 'deepseek',
            model: 'test-model',
            usedFallback: false
          }
        }
      }),
    /character_profile_v2_parse_failed:黑沼盟:json_parse_failed/
  )
})

test('generateCharacterProfileV2 retries transient runtime failure once before succeeding', async () => {
  let attempts = 0

  const result = await generateCharacterProfileV2({
    storyIntent: createStoryIntent(),
    factionMatrix: createMultiFactionMatrix(),
    runtimeConfig: createRuntimeConfig(),
    diagnosticLogger: async () => {},
    generateText: async ({
      prompt
    }: AiGenerateRequestDto): Promise<AiGenerateResponseDto> => {
      if (!prompt.includes('玄玉宫')) {
        return {
          text: JSON.stringify({
            characters: [
              {
                id: 'char_11',
                name: '乌七',
                depthLevel: 'core',
                factionId: 'faction_02',
                branchId: 'branch_03',
                roleInFaction: 'leader',
                appearance: '灰袍枯瘦',
                personality: '多疑阴狠',
                identity: '黑沼盟暗线头子',
                values: '先赢下来再谈道义',
                plotFunction: '把外部黑手伸进宗门腹地',
                hiddenPressure: '盟内随时会换掉他',
                fear: '失去唯一潜入窗口',
                protectTarget: '自己埋的暗桩',
                conflictTrigger: '暗线被连根拔起',
                advantage: '擅长操控信息差',
                weakness: '太想一步到位',
                goal: '夺下玄玉宫命脉',
                arc: '从暗中渗透到被迫现身',
                publicMask: '像个无害行脚商',
                biography: '黑沼盟暗线头子'
              }
            ]
          }),
          lane: 'deepseek',
          model: 'test-model',
          usedFallback: false
        }
      }

      attempts += 1
      if (attempts === 1) {
        throw new Error('provider terminated')
      }

      return {
        text: JSON.stringify({
          characters: [
            {
              id: 'char_01',
              name: '李科',
              depthLevel: 'core',
              factionId: 'faction_01',
              branchId: 'branch_01',
              roleInFaction: 'leader',
              appearance: '黑袍冷脸',
              personality: '狠辣自负',
              identity: '执法堂主事',
              values: '秩序是掌权工具',
              plotFunction: '持续施压',
              hiddenPressure: '怕旧账被翻',
              fear: '丢掉权柄',
              protectTarget: '权位',
              conflictTrigger: '有人拆台',
              advantage: '能调人手',
              weakness: '太自负',
              goal: '逼主角露底',
              arc: '从稳压到失控',
              publicMask: '表面公事公办',
              biography: '执法堂主事'
            }
          ]
        }),
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false
      }
    }
  })

  assert.equal(attempts, 2)
  assert.equal(result.characters.length, 2)
})

test('generateCharacterProfileV2 uses exponential backoff across transient runtime retries', async () => {
  const delays: number[] = []
  let attempts = 0

  const originalSetTimeout = globalThis.setTimeout
  const stubSetTimeout = ((callback: (...args: unknown[]) => void, delay?: number) => {
    delays.push(Number(delay ?? 0))
    callback()
    return 0 as unknown as ReturnType<typeof setTimeout>
  }) as typeof setTimeout

  globalThis.setTimeout = stubSetTimeout

  try {
    const result = await generateCharacterProfileV2({
      storyIntent: createStoryIntent(),
      factionMatrix: createFactionMatrix(),
      runtimeConfig: createRuntimeConfig(),
      diagnosticLogger: async () => {},
      generateText: async (): Promise<AiGenerateResponseDto> => {
        attempts += 1
        if (attempts < 3) {
          throw new Error('502 bad gateway')
        }

        return {
          text: JSON.stringify({
            characters: [
              {
                id: 'char_01',
                name: '李科',
                depthLevel: 'core',
                factionId: 'faction_01',
                branchId: 'branch_01',
                roleInFaction: 'leader',
                appearance: '黑袍冷脸',
                personality: '狠辣自负',
                identity: '执法堂主事',
                values: '秩序是掌权工具',
                plotFunction: '持续施压',
                hiddenPressure: '怕旧账被翻',
                fear: '丢掉权柄',
                protectTarget: '权位',
                conflictTrigger: '有人拆台',
                advantage: '能调人手',
                weakness: '太自负',
                goal: '逼主角露底',
                arc: '从稳压到失控',
                publicMask: '表面公事公办',
                biography: '执法堂主事'
              }
            ]
          }),
          lane: 'deepseek',
          model: 'test-model',
          usedFallback: false
        }
      }
    })

    assert.equal(result.characters.length, 1)
    assert.equal(attempts, 3)
    assert.deepEqual(delays, [2000, 5000])
  } finally {
    globalThis.setTimeout = originalSetTimeout
  }
})

test('generateCharacterProfileV2 splits faction into single-character calls after repeated terminated failures', async () => {
  const attemptsBySignature = new Map<string, number>()
  const diagnostics: string[] = []
  const expectedNames = ['李科', '赵武', '苏婉', '药童']

  const result = await generateCharacterProfileV2({
    storyIntent: createStoryIntent(),
    factionMatrix: createFactionMatrix(),
    runtimeConfig: createRuntimeConfig(),
    diagnosticLogger: async (message) => {
      diagnostics.push(message)
    },
    generateText: async ({
      prompt
    }: AiGenerateRequestDto): Promise<AiGenerateResponseDto> => {
      const signature = expectedNames.filter((name) => prompt.includes(`${name}（`)).join('|')
      const currentAttempt = (attemptsBySignature.get(signature) ?? 0) + 1
      attemptsBySignature.set(signature, currentAttempt)

      if (signature.includes('李科') && signature.includes('赵武') && signature.includes('苏婉') && signature.includes('药童')) {
        throw new Error('provider terminated')
      }

      if (signature === '李科' || signature === '赵武' || signature === '苏婉' || signature === '药童') {
        return {
          text: JSON.stringify({
            characters: [
              {
                id:
                  signature === '李科'
                    ? 'char_01'
                    : signature === '赵武'
                      ? 'char_02'
                      : signature === '苏婉'
                        ? 'char_03'
                        : 'char_04',
                name: signature,
                depthLevel: signature === '李科' ? 'core' : signature === '药童' ? 'extra' : 'mid',
                factionId: 'faction_01',
                branchId:
                  signature === '李科' || signature === '赵武' ? 'branch_01' : 'branch_02',
                roleInFaction:
                  signature === '李科'
                    ? 'leader'
                    : signature === '赵武'
                      ? 'enforcer'
                      : signature === '苏婉'
                        ? 'leader'
                        : 'functional',
                appearance: `${signature}外貌`,
                personality: `${signature}性格`,
                identity: `${signature}身份`,
                values: `${signature}价值观`,
                plotFunction: `${signature}剧情作用`,
                ...(signature === '李科'
                  ? {
                      hiddenPressure: '怕旧账被翻',
                      fear: '丢掉权柄',
                      protectTarget: '执法堂权位',
                      conflictTrigger: '有人公开拆台',
                      advantage: '能调人手',
                      weakness: '太自负',
                      goal: '逼主角露底',
                      arc: '从稳压到失控',
                      publicMask: '表面公事公办'
                    }
                  : {}),
                biography: `${signature}人物小传`
              }
            ]
          }),
          lane: 'deepseek',
          model: 'test-model',
          usedFallback: false
        }
      }

      throw new Error(`unexpected_prompt_signature:${signature}:${currentAttempt}`)
    }
  })

  assert.equal(result.characters.length, 4)
  assert.equal(attemptsBySignature.get('李科|赵武|苏婉|药童'), 3)
  assert.ok(diagnostics.some((line) => line.includes('faction_adaptive_split_start')))
  assert.ok(diagnostics.some((line) => line.includes('faction_adaptive_split_finish')))
})
