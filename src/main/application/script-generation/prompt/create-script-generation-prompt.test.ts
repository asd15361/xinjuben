import test from 'node:test'
import assert from 'node:assert/strict'
import { createScriptGenerationPrompt } from './create-script-generation-prompt.ts'

type PromptInputFixture = Parameters<typeof createScriptGenerationPrompt>[0] & {
  outline: Parameters<typeof createScriptGenerationPrompt>[1]
  characters: Parameters<typeof createScriptGenerationPrompt>[2]
}

function createPromptInputForTuning(): PromptInputFixture {
  return {
    plan: {
      mode: 'fresh_start' as const,
      ready: true,
      blockedBy: [],
      contract: {
        ready: true,
        targetEpisodes: 12,
        structuralActs: [],
        missingActs: [],
        confirmedFormalFacts: [],
        missingFormalFactLandings: [],
        storyContract: {
          characterSlots: {
            protagonist: '少年守钥人',
            antagonist: '恶霸',
            heroine: '小镇少女',
            mentor: '师父'
          },
          eventSlots: {
            finalePayoff: '',
            antagonistPressure: '',
            antagonistLoveConflict: '',
            relationshipShift: '',
            healingTechnique: '',
            themeRealization: ''
          },
          requirements: {
            requireFinalePayoff: false,
            requireHiddenCapabilityForeshadow: false,
            requireAntagonistContinuity: false,
            requireAntagonistLoveConflict: false,
            requireRelationshipShift: false,
            requireHealingTechnique: false,
            requireThemeRealization: false
          },
          hardFacts: [],
          softFacts: []
        },
        userAnchorLedger: {
          anchorNames: [],
          protectedFacts: [],
          heroineRequired: false,
          heroineHint: ''
        },
        missingAnchorNames: [],
        heroineAnchorCovered: true
      },
      targetEpisodes: 12,
      existingSceneCount: 4,
      recommendedPrimaryLane: 'deepseek' as const,
      recommendedFallbackLane: 'deepseek' as const,
      runtimeProfile: {
        contextPressureScore: 5,
        shouldCompactContextFirst: false,
        maxStoryIntentChars: 1600,
        maxCharacterChars: 1800,
        maxSegmentChars: 900,
        recommendedBatchSize: 4,
        profileLabel: 'balanced',
        reason: 'test'
      },
      episodePlans: []
    },
    outlineTitle: '守钥人',
    theme: '人在压力里被逼亮底',
    mainConflict: '恶霸用少女和钥匙同时施压',
    charactersSummary: ['少年守钥人：守住钥匙和人', '恶霸：抢钥匙逼亮底'],
    storyIntent: {
      sellingPremise: '他明明能动手，却被旧规矩逼着先忍。',
      coreDislocation: '最能打的人，偏偏先不能打。',
      emotionalPayoff: '忍到极限后的亮底反击',
      officialKeyCharacters: ['少年守钥人', '恶霸', '小镇少女'],
      lockedCharacterNames: ['少年守钥人', '恶霸', '小镇少女'],
      themeAnchors: ['守与代价'],
      worldAnchors: ['镇口逼压'],
      relationAnchors: ['恶霸拿少女逼钥匙'],
      dramaticMovement: ['先忍后亮底']
    },
    outline: {
      title: '守钥人',
      genre: '短剧',
      theme: '人在压力里被逼亮底',
      mainConflict: '恶霸用少女和钥匙同时施压',
      protagonist: '少年守钥人',
      summary: 'summary',
      summaryEpisodes: Array.from({ length: 12 }, (_, i) => ({
        episodeNo: i + 1,
        summary: i === 0 ? '恶霸第一次当面施压，少年必须先忍。' : `第${i + 1}集摘要`
      })),
      facts: [],
      outlineBlocks: [],
      planningUnitEpisodes: 10
    },
    characters: [
      {
        name: '少年守钥人',
        biography: '',
        publicMask: '',
        hiddenPressure: '',
        fear: '怕少女被拖走',
        protectTarget: '小镇少女',
        conflictTrigger: '',
        advantage: '打得狠',
        weakness: '受旧规矩束缚',
        goal: '守住钥匙和人',
        arc: '从忍到亮底',
        roleLayer: 'core' as const,
        activeBlockNos: []
      }
    ],
    activeCharacterBlocks: [
      {
        blockNo: 1,
        startEpisode: 1,
        endEpisode: 10,
        summary: '第1-10集',
        characterNames: ['少年守钥人', '恶霸', '小镇少女'],
        characters: []
      }
    ],
    detailedOutlineBlocks: [
      {
        blockNo: 1,
        startEpisode: 1,
        endEpisode: 10,
        summary: '第1-10集块',
        sections: [
          {
            sectionNo: 1,
            title: '第1-5集段',
            act: '升级',
            startEpisode: 1,
            endEpisode: 5,
            summary: '升级',
            hookType: '推进',
            episodeBeats: [
              {
                episodeNo: 1,
                summary: '恶霸当众施压',
                sceneByScene: [
                  {
                    sceneNo: 1,
                    location: '镇口石桥',
                    timeOfDay: '日',
                    setup: '恶霸扯下少女护身符，当众逼少年交钥匙',
                    tension: '不交就当场拖走少女示众',
                    hookEnd: '手已经伸向少女的肩膀'
                  }
                ]
              },
              {
                episodeNo: 2,
                summary: '少年承接上一场后果',
                sceneByScene: [
                  {
                    sceneNo: 1,
                    location: '祠堂外',
                    timeOfDay: '夜',
                    setup: '少女刚被拖进祠堂，少年追到门外',
                    tension: '恶霸把钥匙和少女一起钉成当场选择',
                    hookEnd: '刀已经压到门缝里'
                  }
                ]
              }
            ]
          }
        ],
        episodeBeats: []
      }
    ],
    existingScript: [
      {
        sceneNo: 1,
        screenplay: '第1集\n恶霸当众扯下护身符，少年忍着没动手。',
        action: '恶霸扯下护身符，逼近少女。',
        dialogue: '恶霸：钥匙交出来。\n少年：放开她。',
        emotion: '少年把火压回去。'
      },
      {
        sceneNo: 2,
        screenplay: '第2集\n少女被拖进祠堂，门闩当场落下。',
        action: '少女被拖进祠堂，门闩落下。',
        dialogue: '少女：救我！\n恶霸：晚了。',
        emotion: '少年在门外咬住牙。'
      }
    ],
    segments: [
      {
        act: 'ending' as const,
        blockNo: 6,
        title: '第51-60集',
        content: '第51-60集',
        hookType: '收束',
        episodeBeats: [
          {
            episodeNo: 60,
            summary: '第60集',
            sceneByScene: [
              {
                sceneNo: 1,
                location: '古镇街口',
                timeOfDay: '夜',
                setup: 'setup'.repeat(20),
                tension: 'tension'.repeat(20),
                hookEnd: 'hook'.repeat(20)
              }
            ]
          }
        ]
      }
    ]
  }
}

test('createScriptGenerationPrompt uses compact budgets and current-episode scene source', () => {
  const input = {
    plan: {
      mode: 'resume' as const,
      ready: true,
      blockedBy: [],
      contract: {
        ready: true,
        targetEpisodes: 60,
        structuralActs: [],
        missingActs: [],
        confirmedFormalFacts: [],
        missingFormalFactLandings: [],
        storyContract: {
          characterSlots: {
            protagonist: '少年守钥人',
            antagonist: '恶霸',
            heroine: '小镇少女',
            mentor: ''
          },
          eventSlots: {
            finalePayoff: '',
            antagonistPressure: '',
            antagonistLoveConflict: '',
            relationshipShift: '',
            healingTechnique: '',
            themeRealization: ''
          },
          requirements: {
            requireFinalePayoff: false,
            requireHiddenCapabilityForeshadow: false,
            requireAntagonistContinuity: false,
            requireAntagonistLoveConflict: false,
            requireRelationshipShift: false,
            requireHealingTechnique: false,
            requireThemeRealization: false
          },
          hardFacts: [],
          softFacts: []
        },
        userAnchorLedger: {
          anchorNames: [],
          protectedFacts: [],
          heroineRequired: false,
          heroineHint: ''
        },
        missingAnchorNames: [],
        heroineAnchorCovered: true
      },
      targetEpisodes: 60,
      existingSceneCount: 61,
      recommendedPrimaryLane: 'deepseek' as const,
      recommendedFallbackLane: 'deepseek' as const,
      runtimeProfile: {
        contextPressureScore: 8,
        shouldCompactContextFirst: true,
        maxStoryIntentChars: 1200,
        maxCharacterChars: 1600,
        maxSegmentChars: 220,
        recommendedBatchSize: 5,
        profileLabel: 'compact',
        reason: 'test'
      },
      episodePlans: []
    },
    outlineTitle: 'title',
    theme: 'theme',
    mainConflict: 'main conflict',
    charactersSummary: [],
    storyIntent: null,
    outline: {
      title: 'title',
      genre: 'genre',
      theme: 'theme',
      mainConflict: 'main conflict',
      protagonist: '少年守钥人',
      summary: 'summary',
      summaryEpisodes: Array.from({ length: 60 }, (_, i) => ({
        episodeNo: i + 1,
        summary: `第${i + 1}集摘要${'A'.repeat(20)}`
      })),
      facts: [
        {
          id: 'fact-1',
          label: '关键人物关系',
          description: '恶霸会持续拿少年守钥人逼主角亮底。',
          linkedToPlot: true,
          linkedToTheme: true,
          authorityType: 'user_declared' as const,
          provenanceTier: 'user_declared' as const,
          originAuthorityType: 'user_declared' as const,
          originDeclaredBy: 'user' as const,
          status: 'confirmed' as const,
          level: 'core' as const,
          declaredBy: 'user' as const,
          declaredStage: 'outline' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      outlineBlocks: [],
      planningUnitEpisodes: 10
    },
    characters: [
      {
        name: '少年守钥人',
        biography: '',
        publicMask: '',
        hiddenPressure: '',
        fear: '',
        protectTarget: '小镇少女',
        conflictTrigger: '',
        advantage: '优势'.repeat(20),
        weakness: '短板'.repeat(20),
        goal: '目标'.repeat(20),
        arc: '弧光'.repeat(20),
        roleLayer: 'core' as const,
        activeBlockNos: []
      }
    ],
    activeCharacterBlocks: [
      {
        blockNo: 6,
        startEpisode: 51,
        endEpisode: 60,
        summary: '第51-60集',
        characterNames: ['少年守钥人'],
        characters: []
      }
    ],
    detailedOutlineBlocks: [
      {
        blockNo: 6,
        startEpisode: 51,
        endEpisode: 60,
        summary: '第51-60集块',
        sections: [
          {
            sectionNo: 1,
            title: '第56-60集段',
            act: '收束',
            startEpisode: 56,
            endEpisode: 60,
            summary: '收束',
            hookType: '推进',
            episodeBeats: [
              {
                episodeNo: 60,
                summary: '第60集',
                sceneByScene: [
                  {
                    sceneNo: 1,
                    location: '古镇街口',
                    timeOfDay: '夜',
                    setup: 'setup'.repeat(20),
                    tension: 'tension'.repeat(20),
                    hookEnd: 'hook'.repeat(20)
                  }
                ]
              }
            ]
          }
        ],
        episodeBeats: []
      }
    ],
    existingScript: Array.from({ length: 61 }, (_, index) => ({
      sceneNo: index + 1,
      screenplay: `第${index + 1}集\n${'剧本文本'.repeat(120)}`,
      action: '',
      dialogue: '',
      emotion: '情绪'.repeat(10)
    }))
  }

  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 62)

  assert.ok(prompt.includes('【前情提要】'))
  assert.ok(prompt.includes('【当前集任务】第 62 集'))
  // 【已确认设定】 block was removed — formal fact narration now delegated to world, not first draft
  // Replaced by compact ledger block (still present in compact mode)
  assert.ok(prompt.includes('【连续性硬锚】'), 'compact ledger block replaces formal fact block')
  assert.ok(prompt.length < 4900, `expected compact prompt under 4900 chars, got ${prompt.length}`)
  // New Step3 instructions (compact mode: no scene heading clause, just basic format rules)
  assert.ok(prompt.includes('【完成判定】'))
  assert.ok(prompt.includes('只输出剧本正文'))
  // New format contract checks
  assert.ok(prompt.includes('「第X集」标题'), 'must require 第X集 heading in positive form')
  assert.ok(
    prompt.includes('禁止使用旧三段标签格式'),
    'must ban legacy three-section delivery format'
  )
  assert.ok(prompt.includes('示意：'), 'must include minimal format template')
  // New format contract: positive 第X集 requirement (Task 1)
  assert.ok(prompt.includes('「第X集」标题'), 'must require 第X集 heading in positive form')
  assert.ok(
    prompt.includes('禁止使用旧三段标签格式'),
    'must ban legacy three-section delivery format'
  )
  // Format template
  assert.ok(prompt.includes('示意：'), 'must include minimal format template')
})

test('createScriptGenerationPrompt hardens final-run anti-bloat and offscreen dialogue rules', () => {
  const input = createPromptInputForTuning()
  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 10, [])

  // 【故事合同落地】 was removed — theme/arc judging now delegated to arc_control_agent
  assert.ok(!prompt.includes('【故事合同落地】'), 'story contract landing block removed from first draft')
  // New: verify anti-bloat and offscreen rules are present
  assert.ok(prompt.includes('同类动作和同义威胁不重复'))
  assert.ok(prompt.includes('SCREENPLAY_NO_OFFSCREEN_DIALOGUE_RULE') === false)
  assert.ok(prompt.includes('还没进场的人只能先写成'))
})

test('createScriptGenerationPrompt encodes scene quotas and anti-template escalation rules', () => {
  const input = {
    plan: {
      mode: 'fresh_start' as const,
      ready: true,
      blockedBy: [],
      contract: {
        ready: true,
        targetEpisodes: 15,
        structuralActs: [],
        missingActs: [],
        confirmedFormalFacts: [],
        missingFormalFactLandings: [],
        storyContract: {
          characterSlots: {
            protagonist: '少年守钥人',
            antagonist: '恶霸',
            heroine: '小镇少女',
            mentor: ''
          },
          eventSlots: {
            finalePayoff: '',
            antagonistPressure: '',
            antagonistLoveConflict: '',
            relationshipShift: '',
            healingTechnique: '',
            themeRealization: ''
          },
          requirements: {
            requireFinalePayoff: false,
            requireHiddenCapabilityForeshadow: false,
            requireAntagonistContinuity: false,
            requireAntagonistLoveConflict: false,
            requireRelationshipShift: false,
            requireHealingTechnique: false,
            requireThemeRealization: false
          },
          hardFacts: [],
          softFacts: []
        },
        userAnchorLedger: {
          anchorNames: [],
          protectedFacts: [],
          heroineRequired: false,
          heroineHint: ''
        },
        missingAnchorNames: [],
        heroineAnchorCovered: true
      },
      targetEpisodes: 15,
      existingSceneCount: 10,
      recommendedPrimaryLane: 'deepseek' as const,
      recommendedFallbackLane: 'deepseek' as const,
      runtimeProfile: {
        contextPressureScore: 4,
        shouldCompactContextFirst: false,
        maxStoryIntentChars: 1600,
        maxCharacterChars: 1800,
        maxSegmentChars: 900,
        recommendedBatchSize: 5,
        profileLabel: 'balanced',
        reason: 'test'
      },
      episodePlans: []
    },
    outlineTitle: 'title',
    theme: '人在压力里被逼亮底',
    mainConflict: '恶霸拿钥匙和少女施压',
    charactersSummary: [],
    storyIntent: null,
    outline: {
      title: 'title',
      genre: 'genre',
      theme: '人在压力里被逼亮底',
      mainConflict: '恶霸拿钥匙和少女施压',
      protagonist: '少年守钥人',
      summary: 'summary',
      summaryEpisodes: Array.from({ length: 15 }, (_, i) => ({
        episodeNo: i + 1,
        summary:
          i === 10 ? '少年守钥人发现恶霸拿小镇少女逼他交钥匙，只能先亮底止血。' : `第${i + 1}集摘要`
      })),
      facts: [],
      outlineBlocks: [],
      planningUnitEpisodes: 10
    },
    characters: [
      {
        name: '少年守钥人',
        biography: '',
        publicMask: '',
        hiddenPressure: '',
        fear: '',
        protectTarget: '小镇少女',
        conflictTrigger: '',
        advantage: '优势',
        weakness: '短板',
        goal: '守住钥匙和人',
        arc: '被逼亮底',
        roleLayer: 'core' as const,
        activeBlockNos: []
      }
    ],
    activeCharacterBlocks: [
      {
        blockNo: 2,
        startEpisode: 11,
        endEpisode: 15,
        summary: '第11-15集',
        characterNames: ['少年守钥人', '恶霸', '小镇少女'],
        characters: []
      }
    ],
    detailedOutlineBlocks: [
      {
        blockNo: 2,
        startEpisode: 11,
        endEpisode: 15,
        summary: '第11-15集块',
        sections: [
          {
            sectionNo: 1,
            title: '第11-15集段',
            act: '升级',
            startEpisode: 11,
            endEpisode: 15,
            summary: '升级',
            hookType: '推进',
            episodeBeats: [
              {
                episodeNo: 11,
                summary: '恶霸拿少女逼钥匙',
                sceneByScene: [
                  {
                    sceneNo: 1,
                    location: '镇口石桥',
                    timeOfDay: '日',
                    setup: '恶霸拿少女逼少年亮底',
                    tension: '少年不交钥匙就要失人',
                    hookEnd: '刀已经抵住少女喉前'
                  },
                  {
                    sceneNo: 2,
                    location: '祠堂后院',
                    timeOfDay: '夜',
                    setup: '双方继续逼压',
                    tension: '山中妖物逼近，恶霸仍不松手',
                    hookEnd: '退路已经断了'
                  }
                ]
              }
            ]
          }
        ],
        episodeBeats: []
      }
    ],
    existingScript: Array.from({ length: 10 }, (_, index) => ({
      sceneNo: index + 1,
      screenplay: `第${index + 1}集\n${'剧本文本'.repeat(40)}`,
      action: '',
      dialogue: '',
      emotion: '情绪'.repeat(4)
    }))
  }

  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 11)

  assert.ok(prompt.includes('【首稿定位】这一步只负责写出稳定首稿'))
  assert.ok(prompt.includes('第一场必须先有事发生'))
  assert.ok(prompt.includes('每场只保留 1-2 条关键△动作、1-2 轮有效对打、至少 1 个可见后果'))
  assert.ok(prompt.includes('【首稿禁止事项】不要写画外音、旁白、OS、心理总结、分析句、策划词、占位词'))
  assert.ok(prompt.includes('门被撞开 / 人被拖走 / 刀已经抵住 / 证据拍到脸上'))
  assert.ok(prompt.includes('本集已给出 2 场 sceneByScene，必须严格写成 2 场'))
  assert.ok(prompt.includes('只准使用 11-1、11-2 这些场号'))
  assert.ok(prompt.includes('本集 2 场时：每场参考 450-600 字，首稿整集尽量落在 900-1200 字'))
  assert.ok(
    prompt.includes(
      '【字数合同】全集硬红线 800-1800 字。首稿只负责先写出稳定可修稿'
    )
  )
  assert.ok(prompt.includes('每场必须有场景标题'))
  // New Step3 instructions
  assert.ok(prompt.includes('【完成判定】'))
  assert.ok(prompt.includes('只输出剧本正文'))
  // Screenplay-first ending rule
  assert.ok(prompt.includes('每场最后一条△动作或最后一句对白'))
  assert.ok(prompt.includes('禁止停在"有┄/感到┄/开始┄/有种┄/是┄"这类开放性句式'))
  assert.ok(prompt.includes('不要另起一行写情绪总结'))
  assert.ok(!prompt.includes('Emotion 段末句必须是具体可见动作词'))
  assert.ok(!prompt.includes('Emotion 字段必须只写本场此刻的情绪状态'))
})

test('createScriptGenerationPrompt prefers concrete sceneByScene beats over looped summary wording', () => {
  const input = {
    plan: {
      mode: 'fresh_start' as const,
      ready: true,
      blockedBy: [],
      contract: {
        ready: true,
        targetEpisodes: 15,
        structuralActs: [],
        missingActs: [],
        confirmedFormalFacts: [],
        missingFormalFactLandings: [],
        storyContract: {
          characterSlots: {
            protagonist: '少年守钥人',
            antagonist: '恶霸',
            heroine: '小镇少女',
            mentor: ''
          },
          eventSlots: {
            finalePayoff: '',
            antagonistPressure: '',
            antagonistLoveConflict: '',
            relationshipShift: '',
            healingTechnique: '',
            themeRealization: ''
          },
          requirements: {
            requireFinalePayoff: false,
            requireHiddenCapabilityForeshadow: false,
            requireAntagonistContinuity: false,
            requireAntagonistLoveConflict: false,
            requireRelationshipShift: false,
            requireHealingTechnique: false,
            requireThemeRealization: false
          },
          hardFacts: [],
          softFacts: []
        },
        userAnchorLedger: {
          anchorNames: [],
          protectedFacts: [],
          heroineRequired: false,
          heroineHint: ''
        },
        missingAnchorNames: [],
        heroineAnchorCovered: true
      },
      targetEpisodes: 15,
      existingSceneCount: 10,
      recommendedPrimaryLane: 'deepseek' as const,
      recommendedFallbackLane: 'deepseek' as const,
      runtimeProfile: {
        contextPressureScore: 4,
        shouldCompactContextFirst: false,
        maxStoryIntentChars: 1600,
        maxCharacterChars: 1800,
        maxSegmentChars: 900,
        recommendedBatchSize: 5,
        profileLabel: 'balanced',
        reason: 'test'
      },
      episodePlans: []
    },
    outlineTitle: 'title',
    theme: '人在压力里被逼亮底',
    mainConflict: '恶霸拿钥匙和少女施压',
    charactersSummary: [],
    storyIntent: null,
    outline: {
      title: 'title',
      genre: 'genre',
      theme: '人在压力里被逼亮底',
      mainConflict: '恶霸拿钥匙和少女施压',
      protagonist: '少年守钥人',
      summary: 'summary',
      summaryEpisodes: Array.from({ length: 15 }, (_, i) => ({
        episodeNo: i + 1,
        summary:
          i === 10
            ? '恶霸盯上钥匙顺势加码,把小镇少女和钥匙一起推上台面,少年守钥人被迫硬扛第一轮代价。'
            : `第${i + 1}集摘要`
      })),
      facts: [],
      outlineBlocks: [],
      planningUnitEpisodes: 10
    },
    characters: [
      {
        name: '少年守钥人',
        biography: '',
        publicMask: '',
        hiddenPressure: '',
        fear: '',
        protectTarget: '小镇少女',
        conflictTrigger: '',
        advantage: '优势',
        weakness: '短板',
        goal: '守住钥匙和人',
        arc: '被逼亮底',
        roleLayer: 'core' as const,
        activeBlockNos: []
      }
    ],
    activeCharacterBlocks: [
      {
        blockNo: 2,
        startEpisode: 11,
        endEpisode: 15,
        summary: '第11-15集',
        characterNames: ['少年守钥人', '恶霸', '小镇少女'],
        characters: []
      }
    ],
    detailedOutlineBlocks: [
      {
        blockNo: 2,
        startEpisode: 11,
        endEpisode: 15,
        summary: '第11-15集块',
        sections: [
          {
            sectionNo: 1,
            title: '第11-15集段',
            act: '升级',
            startEpisode: 11,
            endEpisode: 15,
            summary: '升级',
            hookType: '推进',
            episodeBeats: [
              {
                episodeNo: 11,
                summary: '恶霸加码施压',
                sceneByScene: [
                  {
                    sceneNo: 1,
                    location: '祠堂门口',
                    timeOfDay: '日',
                    setup: '恶霸当众扯下少女脖子上的护身符，逼少年当场交钥匙',
                    tension: '少年若再拖，小镇少女就会被拖上祭台示众',
                    hookEnd: '护身符已经被恶霸踩碎在脚下'
                  },
                  {
                    sceneNo: 2,
                    location: '祠堂台阶',
                    timeOfDay: '日',
                    setup: '少年扑上去抢护身符碎片',
                    tension: '恶霸让手下按住少女，逼少年立刻亮底',
                    hookEnd: '刀已经抵住少女喉前'
                  }
                ]
              }
            ]
          }
        ],
        episodeBeats: []
      }
    ],
    segments: [
      {
        act: 'midpoint' as const,
        blockNo: 2,
        title: '第11-15集',
        content: '第11-15集',
        hookType: '推进',
        episodeBeats: [
          {
            episodeNo: 11,
            summary: '恶霸加码施压',
            sceneByScene: [
              {
                sceneNo: 1,
                location: '祠堂门口',
                timeOfDay: '日',
                setup: '恶霸当众扯下少女脖子上的护身符，逼少年当场交钥匙',
                tension: '少年若再拖，小镇少女就会被拖上祭台示众',
                hookEnd: '护身符已经被恶霸踩碎在脚下'
              },
              {
                sceneNo: 2,
                location: '祠堂台阶',
                timeOfDay: '日',
                setup: '少年扑上去抢护身符碎片',
                tension: '恶霸让手下按住少女，逼少年立刻亮底',
                hookEnd: '刀已经抵住少女喉前'
              }
            ]
          }
        ]
      }
    ],
    existingScript: Array.from({ length: 10 }, (_, index) => ({
      sceneNo: index + 1,
      screenplay: `第${index + 1}集\n${'剧本文本'.repeat(40)}`,
      action: '',
      dialogue: '',
      emotion: '情绪'.repeat(4)
    }))
  }

  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 11)

  assert.ok(prompt.includes('恶霸当众扯下少女脖子上的护身符'))
  assert.ok(prompt.includes('护身符已经被恶霸踩碎在脚下'))
  assert.ok(prompt.includes('第 1 场标题：11-1 日｜地点：祠堂门口'))
  assert.ok(prompt.includes('第 2 场标题：11-2 日｜地点：祠堂台阶'))
  assert.ok(prompt.includes('当前集已给出 2 场 sceneByScene，必须严格写成 2 场'))
  assert.ok(!prompt.includes('把小镇少女和钥匙一起推上台面'))
  assert.ok(prompt.includes('只输出剧本正文'))
  assert.ok(prompt.includes('旧三段标签格式'))

  assert.ok(!prompt.includes('Emotion 字段必须只写本场此刻的情绪状态'))
})

test('createScriptGenerationPrompt forces episode 1 to cash selling point conflict and price inside the first 30 percent', () => {
  const input = createPromptInputForTuning()

  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 1)

  assert.ok(prompt.includes('前 30% 内就把这集最好卖的冲突、反差和代价一起打到观众眼前'))
})

test('createScriptGenerationPrompt requires episodes after episode 1 to start from the previous scene consequence before explanation', () => {
  const input = createPromptInputForTuning()

  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2)

  assert.ok(prompt.includes('这集不是上一集的重写稿'))
  assert.ok(prompt.includes('开场先接上一场已经造成的后果，再补那句非补不可的解释'))
})

test('createScriptGenerationPrompt requires ending hook to land as next-scene action instead of emotion words', () => {
  const input = createPromptInputForTuning()

  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2)

  assert.ok(prompt.includes('每场最后一条△动作或最后一句对白'))
  assert.ok(prompt.includes('必须落在具体可见的结果上'))
})

test('createScriptGenerationPrompt promotes the last scene hookEnd into a hard result-floor block', () => {
  const input = createPromptInputForTuning()

  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2)

  assert.ok(prompt.includes('【当集最后一场结果落点】'))
  assert.ok(prompt.includes('最后一场：第 1 场'))
  assert.ok(prompt.includes('最后一场 hookEnd：刀已经压到门缝里'))
  assert.ok(prompt.includes('最后一句落到可见结果即可，不强求完美钩子'))
})

test('createScriptGenerationPrompt adds anti-bloat rules instead of repeating old minimum-beat inflation wording', () => {
  const input = createPromptInputForTuning()
  // Non-compact mode: episodeSceneDirectives from build-episode-scene-directives.ts are included
  // Compact mode: compact scene directives replace them
  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2)

  // Core anti-bloat rules that must be present in non-compact mode
  assert.ok(prompt.includes('同一场只保留能改变局势的关键动作和关键对白'))
  assert.ok(prompt.includes('同类动作、同义威胁、同一情绪反应不准换句重复写'))
  assert.ok(prompt.includes('SCREENPLAY_FINAL_RUN_COMPRESSION_RULE') === false)
  assert.ok(prompt.includes('每场只准完成一个推进回合'))
  assert.ok(prompt.includes('不要写画外音、旁白、OS'))
  assert.ok(prompt.includes('门外/窗外/台阶下/身后的声音，一律先写成△门外传来某人的喊声或脚步声'))
  assert.ok(prompt.includes('不准从宗门合议、代表宣判、卷轴宣读、长老落锤或侧殿静室听处分开场'))
  assert.ok(prompt.includes('同一场不准连续写第二轮追打、第三次翻转、第四段解释'))
  assert.ok(!prompt.includes('【本集场次与控长脚手架】'))
})
test('createScriptGenerationPrompt removes legacy three-section output wording', () => {
  const input = createPromptInputForTuning()

  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2)

  assert.ok(!prompt.includes('只保留三段正文'))
  assert.ok(prompt.includes('不要输出任何三段结构标签'))
})

test('createScriptGenerationPrompt emits scene heading instruction in non-compact mode', () => {
  const input = {
    plan: {
      mode: 'fresh_start' as const,
      ready: true,
      blockedBy: [],
      contract: {
        ready: true,
        targetEpisodes: 10,
        structuralActs: [],
        missingActs: [],
        confirmedFormalFacts: [],
        missingFormalFactLandings: [],
        storyContract: {
          characterSlots: { protagonist: '', antagonist: '', heroine: '', mentor: '' },
          eventSlots: {
            finalePayoff: '',
            antagonistPressure: '',
            antagonistLoveConflict: '',
            relationshipShift: '',
            healingTechnique: '',
            themeRealization: ''
          },
          requirements: {
            requireFinalePayoff: false,
            requireHiddenCapabilityForeshadow: false,
            requireAntagonistContinuity: false,
            requireAntagonistLoveConflict: false,
            requireRelationshipShift: false,
            requireHealingTechnique: false,
            requireThemeRealization: false
          },
          hardFacts: [],
          softFacts: []
        },
        userAnchorLedger: {
          anchorNames: [],
          protectedFacts: [],
          heroineRequired: false,
          heroineHint: ''
        },
        missingAnchorNames: [],
        heroineAnchorCovered: true
      },
      targetEpisodes: 10,
      existingSceneCount: 0,
      recommendedPrimaryLane: 'deepseek' as const,
      recommendedFallbackLane: 'deepseek' as const,
      runtimeProfile: {
        contextPressureScore: 3,
        shouldCompactContextFirst: false, // non-compact
        maxStoryIntentChars: 1200,
        maxCharacterChars: 2400,
        maxSegmentChars: 3600,
        recommendedBatchSize: 5,
        profileLabel: 'balanced',
        reason: 'test'
      },
      episodePlans: []
    },
    outlineTitle: '测试',
    theme: '测试主题',
    mainConflict: '测试冲突',
    charactersSummary: [],
    storyIntent: null,
    outline: {
      title: '测试',
      genre: '测试题材',
      theme: '测试主题',
      mainConflict: '测试冲突',
      protagonist: '角色A',
      summary: '测试摘要',
      summaryEpisodes: [{ episodeNo: 1, summary: '第1集测试摘要' }],
      facts: [],
      outlineBlocks: [],
      planningUnitEpisodes: 10
    },
    characters: [
      {
        name: '角色A',
        biography: '',
        publicMask: '',
        hiddenPressure: '',
        fear: '',
        protectTarget: '',
        conflictTrigger: '',
        advantage: '',
        weakness: '',
        goal: '',
        arc: '',
        roleLayer: 'core' as const,
        activeBlockNos: []
      }
    ],
    activeCharacterBlocks: [],
    segments: [
      {
        act: 'opening' as const,
        blockNo: 1,
        title: '第1-5集',
        content: '测试分段内容',
        hookType: '推进' as const,
        episodeBeats: [
          {
            episodeNo: 1,
            summary: '第1集',
            sceneByScene: [
              {
                sceneNo: 1,
                location: '测试地点',
                timeOfDay: '日',
                setup: '测试setup',
                tension: '测试tension',
                hookEnd: '测试hook'
              }
            ]
          }
        ]
      }
    ],
    existingScript: []
  }

  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 1)

  // Scene heading instruction MUST appear in non-compact mode
  assert.ok(
    prompt.includes('每场必须有场景标题'),
    'non-compact prompt must include scene heading instruction'
  )
  assert.ok(
    prompt.includes('1-1 日'),
    'non-compact prompt must include example scene heading format'
  )
  assert.ok(prompt.includes('【对白口风】'), 'non-compact prompt must include dialogue voice block')
  assert.ok(
    prompt.includes('角色A：'),
    'dialogue voice block should include the protagonist voice line'
  )
})

test('createScriptGenerationPrompt omits scene heading instruction in compact mode while keeping compact safety rails', () => {
  // Extract facts to avoid TypeScript parsing issue inside Array.from
  const confirmedFact = {
    id: 'f1',
    label: '测试事实',
    description: '测试',
    linkedToPlot: true,
    linkedToTheme: true,
    authorityType: 'user_declared' as const,
    provenanceTier: 'user_declared' as const,
    originAuthorityType: 'user_declared' as const,
    originDeclaredBy: 'user' as const,
    status: 'confirmed' as const,
    level: 'core' as const,
    declaredBy: 'user' as const,
    declaredStage: 'outline' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
  const input = {
    plan: {
      mode: 'resume' as const,
      ready: true,
      blockedBy: [],
      contract: {
        ready: true,
        targetEpisodes: 60,
        structuralActs: [],
        missingActs: [],
        confirmedFormalFacts: [],
        missingFormalFactLandings: [],
        storyContract: {
          characterSlots: { protagonist: '', antagonist: '', heroine: '', mentor: '' },
          eventSlots: {
            finalePayoff: '',
            antagonistPressure: '',
            antagonistLoveConflict: '',
            relationshipShift: '',
            healingTechnique: '',
            themeRealization: ''
          },
          requirements: {
            requireFinalePayoff: false,
            requireHiddenCapabilityForeshadow: false,
            requireAntagonistContinuity: false,
            requireAntagonistLoveConflict: false,
            requireRelationshipShift: false,
            requireHealingTechnique: false,
            requireThemeRealization: false
          },
          hardFacts: [],
          softFacts: []
        },
        userAnchorLedger: {
          anchorNames: [],
          protectedFacts: [],
          heroineRequired: false,
          heroineHint: ''
        },
        missingAnchorNames: [],
        heroineAnchorCovered: true
      },
      targetEpisodes: 60,
      existingSceneCount: 61,
      recommendedPrimaryLane: 'deepseek' as const,
      recommendedFallbackLane: 'deepseek' as const,
      runtimeProfile: {
        contextPressureScore: 8,
        shouldCompactContextFirst: true, // compact — high pressure / high failure
        maxStoryIntentChars: 1200,
        maxCharacterChars: 1600,
        maxSegmentChars: 220,
        recommendedBatchSize: 5,
        profileLabel: 'compact',
        reason: 'test'
      },
      episodePlans: []
    },
    outlineTitle: '测试',
    theme: '测试主题',
    mainConflict: '测试冲突',
    charactersSummary: [],
    storyIntent: {
      sellingPremise: '最该藏底的人被逼亮底。',
      coreDislocation: '最会装弱的人先得护人。',
      emotionalPayoff: '忍到头后反咬一口。',
      protagonist: '角色A',
      antagonist: '角色B',
      coreConflict: '角色A被逼亮底。',
      endingDirection: '开放',
      titleHint: '测试',
      genre: '测试题材',
      tone: '压迫',
      audience: '短剧观众',
      officialKeyCharacters: ['角色A', '角色B'],
      lockedCharacterNames: ['角色A', '角色B'],
      themeAnchors: ['不争'],
      worldAnchors: ['旧规'],
      relationAnchors: ['角色B拿人施压'],
      dramaticMovement: ['先忍后反咬'],
      freeChatFinalSummary:
        '这里是一大段原始底稿摘要，里面会反复讲谦卦、不争、大道和师父教诲，不该在 compact prompt 里整段回灌。',
      manualRequirementNotes:
        '这里还有一大段没讲死的口子，也不该在 compact prompt 里继续灌给剧本阶段。'
    },
    outline: {
      title: '测试',
      genre: '测试题材',
      theme: '测试主题',
      mainConflict: '测试冲突',
      protagonist: '角色A',
      summary: '测试摘要',
      summaryEpisodes: Array.from({ length: 60 }, (_, i) => ({
        episodeNo: i + 1,
        summary: `第${i + 1}集摘要`
      })),
      facts: [confirmedFact],
      outlineBlocks: [],
      planningUnitEpisodes: 10
    },
    characters: [
      {
        name: '角色A',
        biography: '',
        publicMask: '',
        hiddenPressure: '',
        fear: '',
        protectTarget: '',
        conflictTrigger: '',
        advantage: '',
        weakness: '',
        goal: '',
        arc: '',
        roleLayer: 'core' as const,
        activeBlockNos: []
      }
    ],
    activeCharacterBlocks: [],
    segments: Array.from({ length: 10 }, (_, i) => ({
      act: 'opening' as const,
      blockNo: i + 1,
      title: `第${i * 5 + 1}-${(i + 1) * 5}集`,
      content: '测试分段内容'.repeat(20),
      hookType: '推进' as const,
      episodeBeats: []
    })),
    existingScript: Array.from({ length: 61 }, (_, i) => ({
      sceneNo: i + 1,
      screenplay: `第${i + 1}集`,
      action: '',
      dialogue: '',
      emotion: ''
    }))
  }

  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 62)

  // Scene heading instruction must NOT appear in compact mode
  assert.ok(
    !prompt.includes('每场用场景标题标示'),
    'compact prompt must NOT include scene heading instruction'
  )
  assert.ok(
    prompt.includes('【对白口风】'),
    'compact prompt should keep dialogue voice block for long-season continuity'
  )
  assert.ok(
    !prompt.includes('底稿摘要='),
    'compact prompt must not dump raw storyIntent freeChatFinalSummary'
  )
  assert.ok(
    !prompt.includes('未讲死的口子='),
    'compact prompt must not dump raw manualRequirementNotes'
  )
})

test('createScriptGenerationPrompt keeps hard hook landing block in compact mode', () => {
  const input = createPromptInputForTuning()
  input.plan.runtimeProfile.shouldCompactContextFirst = true
  input.plan.runtimeProfile.profileLabel = 'compact'
  input.plan.targetEpisodes = 30
  input.outline.summaryEpisodes = Array.from({ length: 30 }, (_, i) => ({
    episodeNo: i + 1,
    summary: `第${i + 1}集摘要`
  }))

  const prompt = createScriptGenerationPrompt(
    input as never,
    input.outline as never,
    input.characters as never,
    1
  )

  assert.ok(prompt.includes('【当集最后一场结果落点】'))
  assert.ok(prompt.includes('手已经伸向少女的肩膀'))
  assert.ok(prompt.includes('最后一句落到可见结果即可，不强求完美钩子'))
})

test('createScriptGenerationPrompt keeps dialogue voice block in compact mode', () => {
  const input = createPromptInputForTuning()
  input.plan.runtimeProfile.shouldCompactContextFirst = true
  input.plan.runtimeProfile.profileLabel = 'compact'
  input.plan.targetEpisodes = 30
  input.outline.summaryEpisodes = Array.from({ length: 30 }, (_, i) => ({
    episodeNo: i + 1,
    summary: `第${i + 1}集摘要`
  }))

  const prompt = createScriptGenerationPrompt(
    input as never,
    input.outline as never,
    input.characters as never,
    1
  )

  assert.ok(prompt.includes('【对白口风】'))
  // 【故事合同落地】 was removed — theme judging now delegated to arc_control_agent
  assert.ok(!prompt.includes('【故事合同落地】'), 'story contract landing removed from compact mode')


})

test('createScriptGenerationPrompt falls back to summaryEpisodes when current beat is missing', () => {
  const input = createPromptInputForTuning()

  input.detailedOutlineBlocks = [
    {
      blockNo: 1,
      startEpisode: 1,
      endEpisode: 8,
      summary: '第1-8集块',
      sections: [
        {
          sectionNo: 1,
          title: '第1-8集段',
          act: '升级',
          startEpisode: 1,
          endEpisode: 8,
          summary: '升级',
          hookType: '推进',
          episodeBeats: [
            {
              episodeNo: 8,
              summary: '第8集只到这里',
              sceneByScene: []
            }
          ]
        }
      ],
      episodeBeats: []
    }
  ]
  input.outline.summaryEpisodes = input.outline.summaryEpisodes.map((episode) =>
    episode.episodeNo === 9
      ? { episodeNo: 9, summary: '顾玄真正托付的不是守物，而是守住镇口最后的证词。' }
      : episode.episodeNo === 10
        ? { episodeNo: 10, summary: '林守钥公开翻账、守住铜钥，也把旧约代价一起扛下来。' }
        : episode
  )

  const ep9Prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 9)
  const ep10Prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 10)

  assert.ok(ep9Prompt.includes('【当前集任务】第 9 集'))
  assert.ok(ep10Prompt.includes('【当前集任务】第 10 集'))
  assert.ok(ep9Prompt.includes('当前集摘要：顾玄真正托付的不是守物，而是守住镇口最后的证词。'))
  assert.ok(ep10Prompt.includes('当前集摘要：林守钥公开翻账、守住铜钥，也把旧约代价一起扛下来。'))
  assert.ok(
    ep9Prompt.includes(
      '当前集未提供逐场细纲，禁止模型自行补全整季骨架；只能围绕本集摘要把这一集写实。'
    )
  )
  assert.ok(
    ep10Prompt.includes(
      '当前集未提供逐场细纲，禁止模型自行补全整季骨架；只能围绕本集摘要把这一集写实。'
    )
  )
  assert.ok(
    ep10Prompt.includes(
      '当前批次末集若保留侧殿、合议、接任、令牌或职责确认场，它只能是本批次最短一场'
    )
  )
  assert.ok(ep10Prompt.includes('最后一句不准停在职责令牌、新看守职责、合议确认或制度说明上'))
})

test('createScriptGenerationPrompt keeps screenplay-first emotion boundaries without legacy Emotion field wording', () => {
  const input = createPromptInputForTuning()

  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 1)

  assert.ok(prompt.includes('不要另起一行写情绪总结'))
  // '如某场字数已达上限但冲突未收口，立即转入下场' removed from non-compact
  assert.ok(!prompt.includes('如某场字数已达上限但冲突未收口'))
  assert.ok(!prompt.includes('立即转入下场'))
  assert.ok(!prompt.includes('Emotion 字段必须只写本场此刻的情绪状态'))
  assert.ok(!prompt.includes('Emotion 段末句必须是具体可见动作词'))
})

test('createScriptGenerationPrompt adds season finale anti-placeholder contract for the final episode', () => {
  const input = createPromptInputForTuning()
  input.plan.targetEpisodes = 30
  input.outline.summaryEpisodes = Array.from({ length: 30 }, (_, i) => ({
    episodeNo: i + 1,
    summary: `第${i + 1}集摘要`
  }))
  input.detailedOutlineBlocks = [
    {
      blockNo: 3,
      startEpisode: 21,
      endEpisode: 30,
      summary: '第21-30集块',
      sections: [
        {
          sectionNo: 1,
          title: '第28-30集段',
          act: 'ending',
          startEpisode: 28,
          endEpisode: 30,
          summary: '收尾',
          hookType: '收束',
          episodeBeats: [
            {
              episodeNo: 30,
              summary: '末集收尾',
              sceneByScene: [
                {
                  sceneNo: 1,
                  location: '玄玉宫正门外',
                  timeOfDay: '夜',
                  setup: '黎明攥着血契冲出宫门',
                  tension: '郡守逼宫，小柔伤势未稳',
                  hookEnd: '残党混在人群里抬起弩箭'
                },
                {
                  sceneNo: 2,
                  location: '玄玉宫正门外',
                  timeOfDay: '夜',
                  setup: '小柔扑开黎明，毒箭擦肩而过',
                  tension: '旧账未了，残党退入夜色',
                  hookEnd: '箭头上的四个字让黎明彻底停住'
                }
              ]
            }
          ]
        }
      ],
      episodeBeats: []
    }
  ]

  const ep30Prompt = createScriptGenerationPrompt(input as never, input.outline as never, input.characters as never, 30)

  assert.ok(ep30Prompt.includes('【整季末集收口合同】'))
  assert.ok(ep30Prompt.includes('必须把本集给定的全部场次完整写完'))
  assert.ok(ep30Prompt.includes('禁止占位稿'))
  assert.ok(ep30Prompt.includes('写完末场后直接停在剧本场面里'))
})
test('createScriptGenerationPrompt puts current-episode task before recap blocks', () => {
  const input = createPromptInputForTuning()
  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2)

  const taskIndex = prompt.indexOf('【当前集任务】第 2 集')
  const recapIndex = prompt.indexOf('【前情提要】')

  assert.notEqual(taskIndex, -1)
  assert.notEqual(recapIndex, -1)
  assert.ok(taskIndex < recapIndex, 'current episode task should appear before recap blocks')
})

test('createScriptGenerationPrompt prioritizes short-drama constitution and episode control card before recap', () => {
  const input = createPromptInputForTuning()
  const baseStoryIntent = input.storyIntent
  if (!baseStoryIntent) throw new Error('storyIntent missing in test fixture')
  input.storyIntent = {
    ...baseStoryIntent,
    shortDramaConstitution: {
      corePrinciple: '快节奏、强冲突、稳情绪',
      coreEmotion: '一路反咬的爽感',
      incitingIncident: {
        timingRequirement: '30 秒炸场，最晚不超过第 1 集结尾',
        disruption: '恶霸先拿小镇少女逼少年守钥人亮底',
        mainLine: '少年守钥人必须先守人再守钥匙'
      },
      protagonistArc: {
        flawBelief: '少年守钥人以为一直忍就能保住一切',
        growthMode: '每集被逼着改一次打法',
        payoff: '最后把旧账打回去'
      },
      povPolicy: {
        mode: 'single_protagonist',
        allowedAuxiliaryViewpoints: ['恶霸'],
        restriction: '默认单主角视角，其他视角只能补主线必要信息。'
      },
      climaxPolicy: {
        episodeHookRule: '集集有小高潮，集尾必须留强钩子。',
        finalePayoffRule: '结局总爆发，并回打开篇激励事件。',
        callbackRequirement: '结局必须回打恶霸第一次拿少女逼钥匙这一下。'
      }
    }
  }

  const beat = input.detailedOutlineBlocks?.[0]?.sections?.[0]?.episodeBeats?.find(
    (item) => item.episodeNo === 2
  )
  if (!beat) throw new Error('episode beat 2 missing in test fixture')
  beat.episodeControlCard = {
    episodeMission: '第2集必须承接门闩落下后的后果，继续把人和钥匙绑成一道选择题。',
    openingBomb: '祠堂门外先看见刀已经压进门缝。',
    conflictUpgrade: '恶霸把少女和钥匙一起钉成当场选择。',
    arcBeat: '少年守钥人第一次意识到只忍不够，得开始换打法。',
    emotionBeat: '继续稳住忍到头后反咬的爽感。',
    hookLanding: '这一集尾场必须把退路彻底断掉。',
    povConstraint: '只准跟着少年守钥人的眼睛往前走。',
    forbiddenDrift: ['不要回头铺背景', '不要切去无关旁支视角']
  }

  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2)

  const constitutionIndex = prompt.indexOf('【短剧创作宪法】')
  const controlCardIndex = prompt.indexOf('【当前集控制卡】')
  const recapIndex = prompt.indexOf('【前情提要】')

  assert.notEqual(constitutionIndex, -1)
  assert.notEqual(controlCardIndex, -1)
  assert.notEqual(recapIndex, -1)
  assert.ok(constitutionIndex < recapIndex, 'constitution block should appear before recap')
  assert.ok(controlCardIndex < recapIndex, 'control card block should appear before recap')
  assert.ok(prompt.includes('核心原则：快节奏、强冲突、稳情绪'))
  assert.ok(prompt.includes('核心情绪：一路反咬的爽感'))
  assert.ok(prompt.includes('episodeMission：第2集必须承接门闩落下后的后果'))
  assert.ok(prompt.includes('openingBomb：祠堂门外先看见刀已经压进门缝'))
  assert.ok(prompt.includes('forbiddenDrift：不要回头铺背景；不要切去无关旁支视角'))
  assert.ok(
    prompt.includes('如果短剧创作宪法、当前集控制卡、sceneByScene 与其他散规则冲突，以这三层为准'),
    'new control package should explicitly take priority over legacy scattered rules'
  )
})

test('createScriptGenerationPrompt prefers explicit runtime control package over stale upstream fields', () => {
  const input = createPromptInputForTuning()
  const baseStoryIntent = input.storyIntent
  if (!baseStoryIntent) throw new Error('storyIntent missing in test fixture')
  input.storyIntent = {
    ...baseStoryIntent,
    shortDramaConstitution: {
      corePrinciple: '旧原则',
      coreEmotion: '旧情绪',
      incitingIncident: {
        timingRequirement: '旧时机',
        disruption: '旧激励',
        mainLine: '旧主线'
      },
      protagonistArc: {
        flawBelief: '旧错误信念',
        growthMode: '旧成长',
        payoff: '旧回收'
      },
      povPolicy: {
        mode: 'single_protagonist',
        allowedAuxiliaryViewpoints: [],
        restriction: '旧视角'
      },
      climaxPolicy: {
        episodeHookRule: '旧钩子',
        finalePayoffRule: '旧结局',
        callbackRequirement: '旧回打'
      }
    }
  }
  input.scriptControlPackage = {
    shortDramaConstitution: {
      corePrinciple: '新原则',
      coreEmotion: '新情绪',
      incitingIncident: {
        timingRequirement: '新时机',
        disruption: '新激励',
        mainLine: '新主线'
      },
      protagonistArc: {
        flawBelief: '新错误信念',
        growthMode: '新成长',
        payoff: '新回收'
      },
      povPolicy: {
        mode: 'single_protagonist',
        allowedAuxiliaryViewpoints: ['反派'],
        restriction: '新视角'
      },
      climaxPolicy: {
        episodeHookRule: '新钩子',
        finalePayoffRule: '新结局',
        callbackRequirement: '新回打'
      }
    },
    episodeControlPlans: [
      {
        episodeNo: 2,
        episodeControlCard: {
          episodeMission: 'runtime 控制卡任务',
          openingBomb: 'runtime 开场炸点',
          conflictUpgrade: 'runtime 冲突升级',
          arcBeat: 'runtime 弧光',
          emotionBeat: 'runtime 情绪',
          hookLanding: 'runtime 钩子',
          povConstraint: 'runtime 视角',
          forbiddenDrift: ['runtime 禁止漂移']
        }
      }
    ]
  }

  const beat = input.detailedOutlineBlocks?.[0]?.sections?.[0]?.episodeBeats?.find(
    (item) => item.episodeNo === 2
  )
  if (!beat) throw new Error('episode beat 2 missing in test fixture')
  beat.episodeControlCard = {
    episodeMission: '旧控制卡任务',
    openingBomb: '旧控制卡炸点',
    conflictUpgrade: '旧控制卡升级',
    arcBeat: '旧控制卡弧光',
    emotionBeat: '旧控制卡情绪',
    hookLanding: '旧控制卡钩子',
    povConstraint: '旧控制卡视角',
    forbiddenDrift: ['旧控制卡漂移']
  }

  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 2)

  assert.ok(prompt.includes('核心原则：新原则'))
  assert.ok(prompt.includes('核心情绪：新情绪'))
  assert.ok(prompt.includes('episodeMission：runtime 控制卡任务'))
  assert.ok(prompt.includes('openingBomb：runtime 开场炸点'))
  assert.ok(prompt.includes('forbiddenDrift：runtime 禁止漂移'))
  assert.ok(!prompt.includes('核心原则：旧原则'))
  assert.ok(!prompt.includes('episodeMission：旧控制卡任务'))
})

test('createScriptGenerationPrompt narrows prompt characters to the current batch active package', () => {
  const input = createPromptInputForTuning()
  input.characters = [
    input.characters[0]!,
    {
      name: '谢宁',
      biography: '第二批次守将',
      publicMask: '',
      hiddenPressure: '边城军报压境',
      fear: '',
      protectTarget: '',
      conflictTrigger: '边城沦陷',
      advantage: '',
      weakness: '',
      goal: '守住边城',
      arc: '从守城到反攻',
      roleLayer: 'active' as const,
      activeBlockNos: [2]
    }
  ]
  input.outline.summaryEpisodes = input.outline.summaryEpisodes.map((episode) =>
    episode.episodeNo === 1
      ? { episodeNo: 1, summary: '李科在镇口拿小柔逼少年守钥人交钥匙。' }
      : episode.episodeNo === 2
        ? { episodeNo: 2, summary: '少年守钥人被李科逼到祠堂门外。' }
        : episode
  )
  input.entityStore = {
    characters: [
      {
        id: 'char-li-ke',
        projectId: 'project-1',
        type: 'character',
        name: '李科',
        aliases: ['恶霸'],
        summary: '当前批次反派',
        tags: ['反派'],
        roleLayer: 'active',
        goals: ['逼出钥匙'],
        pressures: ['拿小柔施压'],
        linkedFactionIds: [],
        linkedLocationIds: [],
        linkedItemIds: [],
        provenance: {
          provenanceTier: 'user_declared',
          originAuthorityType: 'user_declared',
          originDeclaredBy: 'user',
          sourceStage: 'outline',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z'
        }
      }
    ],
    factions: [],
    locations: [],
    items: [],
    relations: []
  }

  const prompt = createScriptGenerationPrompt(input as never, input.outline as never, input.characters as never, 2)

  assert.ok(prompt.includes('【当前批次活跃人物包】'))
  assert.ok(prompt.includes('当前上场人物：少年守钥人、李科'))
  assert.ok(prompt.includes('需要升级完整小传：李科'))
  assert.ok(prompt.includes('角色摘要：少年守钥人：守住钥匙和人'))
  assert.ok(prompt.includes('李科：逼出钥匙'))
  assert.ok(!prompt.includes('谢宁：守住边城'))
})

test('createScriptGenerationPrompt injects ledger state locks for custody, injury and paper evidence abuse', () => {
  const input = createPromptInputForTuning()
  input.characters = [
    {
      name: '黎明',
      biography: '',
      publicMask: '',
      hiddenPressure: '',
      fear: '小柔出事',
      protectTarget: '小柔',
      conflictTrigger: '小柔被拿住',
      advantage: '会反设局',
      weakness: '太想护人',
      goal: '守住钥匙',
      arc: '从忍到反咬',
      roleLayer: 'core'
    },
    {
      name: '李科',
      biography: '',
      publicMask: '',
      hiddenPressure: '',
      fear: '',
      protectTarget: '',
      conflictTrigger: '',
      advantage: '权势压人',
      weakness: '自负',
      goal: '逼出钥匙',
      arc: '失控',
      roleLayer: 'active'
    }
  ]
  input.existingScript = [
    {
      sceneNo: 18,
      screenplay: '第18集\n黎明吐血后亮出血契，李科被押回候审。',
      action: '黎明吐血后亮出血契，执事将李科押回候审。',
      dialogue: '黎明：血契在这。\n执事：押回候审。',
      emotion: '黎明强撑着站住。'
    },
    {
      sceneNo: 19,
      screenplay: '第19集\n黎明咳出黑血，把账本和密信拍上桌，李科被押入地牢。',
      action: '黎明咳出黑血，把账本和密信拍上桌。李科被押入地牢。',
      dialogue: '黎明：账本、密信都在这里。\n李诚阳：押入地牢。',
      emotion: '黎明毒发跪地。'
    }
  ]

  const prompt = createScriptGenerationPrompt(input, input.outline, input.characters, 20)

  assert.ok(prompt.includes('【Ledger State Locks】'))
  assert.ok(prompt.includes('李科 当前状态=captured'))
  assert.ok(prompt.includes('没有越狱/放出/换押送/解除限制的明确情节前'))
  assert.ok(prompt.includes('黎明 已连续 2 集维持重伤/中毒'))
  assert.ok(prompt.includes('禁止继续重复吐血、跪地、脸色惨白'))
  assert.ok(prompt.includes('禁止再靠账本、密信、血契、契据、残页、卷轴直接拍脸收账'))
  assert.ok(prompt.includes('必须换成法阵、妖兽、血脉、灵力、法器或实物争夺'))
})
