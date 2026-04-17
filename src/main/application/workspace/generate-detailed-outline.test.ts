import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

import {
  generateDetailedOutlineFromContext,
  normalizeDetailedOutlineSourceOutline,
  isDetailedOutlineActResultComplete,
  isDetailedOutlineModelResultComplete
} from './generate-detailed-outline.ts'
import {
  buildFourActEpisodeRanges,
  deriveOutlineEpisodeCount
} from '../../../shared/domain/workflow/episode-count.ts'
import type { DetailedOutlineSegmentDto } from '../../../shared/contracts/workflow.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineEpisodeBeatDto,
  OutlineDraftDto
} from '../../../shared/contracts/workflow.ts'
import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config.ts'

const runtimeConfig: RuntimeProviderConfig = {
  deepseek: {
    apiKey: '',
    baseUrl: 'https://example.com',
    model: 'deepseek-chat',
    systemInstruction: '',
    timeoutMs: 45_000
  },
  openrouterGeminiFlashLite: {
    apiKey: '',
    baseUrl: 'https://example.com',
    model: 'google/gemini-3.1-flash-lite-preview',
    systemInstruction: '',
    timeoutMs: 45_000
  },
  openrouterQwenFree: {
    apiKey: '',
    baseUrl: 'https://example.com',
    model: 'qwen/qwen3.6-plus-preview:free',
    systemInstruction: '',
    timeoutMs: 45_000
  },
  lanes: {
    deepseek: true,
    openrouterGeminiFlashLite: false,
    openrouterQwenFree: false
  },
  runtimeFetchTimeoutMs: 15_000
}

const THIRTY_EPISODE_REAL_PROJECT_DIR = path.resolve(
  process.cwd(),
  'tools/e2e/out/userdata-xiuxian-full-real-30ep-mncz0qkz/workspace/projects/project_mncz0sno'
)

function readJsonFixture<T>(...segments: string[]): T {
  const filePath = path.join(THIRTY_EPISODE_REAL_PROJECT_DIR, ...segments)
  return JSON.parse(readFileSync(filePath, 'utf8')) as T
}

function loadRealThirtyEpisodeOutline(): OutlineDraftDto {
  return readJsonFixture<{ outlineDraft: OutlineDraftDto }>('outline.json').outlineDraft
}

function loadRealThirtyEpisodeDetailedOutlineSegments(): DetailedOutlineSegmentDto[] {
  return readJsonFixture<{ detailedOutlineSegments: DetailedOutlineSegmentDto[] }>(
    'detailed-outline.json'
  ).detailedOutlineSegments
}

function hasEpisodeBeatContent(episodeBeat: DetailedOutlineEpisodeBeatDto): boolean {
  if (episodeBeat.summary.trim()) return true

  return (episodeBeat.sceneByScene || []).some(
    (scene) =>
      Boolean(scene.location?.trim()) ||
      Boolean(scene.timeOfDay?.trim()) ||
      Boolean(scene.setup?.trim()) ||
      Boolean(scene.tension?.trim()) ||
      Boolean(scene.hookEnd?.trim())
  )
}

function buildThinSegments(): DetailedOutlineSegmentDto[] {
  return [
    {
      act: 'opening',
      content: '开局段',
      hookType: '入局钩子',
      episodeBeats: [
        { episodeNo: 1, summary: '第1集推进', sceneByScene: [{ sceneNo: 1, setup: '开局' }] }
      ]
    },
    {
      act: 'midpoint',
      content: '中段',
      hookType: '升级钩子',
      episodeBeats: [
        { episodeNo: 2, summary: '第2集推进', sceneByScene: [{ sceneNo: 1, setup: '升级' }] }
      ]
    },
    {
      act: 'climax',
      content: '高潮段',
      hookType: '反转钩子',
      episodeBeats: [
        { episodeNo: 3, summary: '第3集推进', sceneByScene: [{ sceneNo: 1, setup: '高潮' }] }
      ]
    },
    {
      act: 'ending',
      content: '收束段',
      hookType: '收束钩子',
      episodeBeats: [
        { episodeNo: 4, summary: '第4集推进', sceneByScene: [{ sceneNo: 1, setup: '收束' }] }
      ]
    }
  ]
}

function buildDerivedSegments(): DetailedOutlineSegmentDto[] {
  return [
    {
      act: 'opening',
      content:
        '黎明这一段先被拖进局里：李科拿小柔逼他交出密库钥匙。推进到这一段收口前，更狠的代价已经顺着小柔追上来，重点是把第一轮压力坐实，并逼出第一次明面让步。',
      hookType: '入局钩子',
      episodeBeats: [
        {
          episodeNo: 1,
          summary:
            '【起】李科先拿小柔逼黎明交出密库钥匙，把主线第一轮压力正面压下来。【承】李科拿小柔和密库钥匙双线卡喉，逼黎明当场表态。【转】黎明为了先守住小柔和密库钥匙，只能先吞下这一刀，转成表面让步、暗里找翻口。【钩子】黎明刚压住眼前这一轮，下一集更狠的代价已经顺着小柔追上来。',
          sceneByScene: [
            { sceneNo: 1, setup: '李科拿小柔和密库钥匙同时施压。', tension: '先把人物拖进局里。' },
            { sceneNo: 2, setup: '黎明被逼表态。', tension: '阻力明显加码。' },
            { sceneNo: 3, setup: '黎明转成表面让步。', tension: '让步里藏反手。' },
            { sceneNo: 4, setup: '下一刀顺着小柔追上来。', tension: '尾场必须挂钩子。' }
          ]
        }
      ]
    },
    {
      act: 'midpoint',
      content:
        '这一段继续把局面往更险处抬：对手加码，主角被迫换打法。走到这一段后段时，代价开始同时压到关系、身份和局面控制权上，重点是让代价、关系和局面控制权一起变重。',
      hookType: '升级钩子',
      episodeBeats: [
        {
          episodeNo: 2,
          summary:
            '【起】李科继续加码，把黎明逼进更窄的处理空间。【承】小柔和密库钥匙两条线同时发紧，黎明必须换打法。【转】黎明开始边守边查，试着反手布局。【钩子】刚抢回一点主动，更高一级的反扑已经压下来。',
          sceneByScene: [
            { sceneNo: 1, setup: '李科继续加码。', tension: '局势升级。' },
            { sceneNo: 2, setup: '两条线一起收紧。', tension: '主角空间变窄。' },
            { sceneNo: 3, setup: '黎明边守边查。', tension: '开始换打法。' },
            { sceneNo: 4, setup: '更高一级反扑压下来。', tension: '继续挂险口。' }
          ]
        }
      ]
    },
    {
      act: 'climax',
      content:
        '这一段开始把人逼到最痛的位置：小柔和密库钥匙一起被顶到临界点。到这一段最狠的时候，黎明不得不亮更深的底牌，重点是让底牌、误判或关系翻面真的落地。',
      hookType: '反转钩子',
      episodeBeats: [
        {
          episodeNo: 3,
          summary:
            '【起】小柔和密库钥匙同时被顶到最痛的位置。【承】黎明再退就彻底守不住眼前这一轮。【转】黎明被逼亮出更深的底牌。【钩子】这一刀已经见血，下一场必须有人买单。',
          sceneByScene: [
            { sceneNo: 1, setup: '双线一起被顶到最痛处。', tension: '真正逼到临界点。' },
            { sceneNo: 2, setup: '黎明再退就守不住。', tension: '退路被封死。' },
            { sceneNo: 3, setup: '黎明亮底牌。', tension: '翻面见血。' },
            { sceneNo: 4, setup: '下一场必须有人买单。', tension: '把账挂出去。' }
          ]
        }
      ]
    },
    {
      act: 'ending',
      content:
        '这一段先收前面积下的账：黎明必须把这一轮选择和代价落定。等这一段真正落定时，新的状态已经形成，重点是把决定、代价和新状态一起写实，不再空挂。',
      hookType: '收束钩子',
      episodeBeats: [
        {
          episodeNo: 4,
          summary:
            '【起】黎明开始收前面欠下的账。【承】他必须把这一轮的选择和代价亲手落定。【转】新的局面因为这次决定正式成形。【钩子】更大的账已经轻轻挂到下一轮。',
          sceneByScene: [
            { sceneNo: 1, setup: '黎明开始收账。', tension: '不能继续拖。' },
            { sceneNo: 2, setup: '选择与代价一起落定。', tension: '决定不可回头。' },
            { sceneNo: 3, setup: '新的局面正式成形。', tension: '状态已改变。' },
            { sceneNo: 4, setup: '更大的账挂到下一轮。', tension: '收口但不断头。' }
          ]
        }
      ]
    }
  ]
}

function buildTenEpisodeOutline(): OutlineDraftDto {
  return {
    title: '守钥人',
    genre: '短剧',
    theme: '守与代价',
    mainConflict: '恶霸拿少女和钥匙一起逼主角亮底。',
    protagonist: '少年守钥人',
    summary: Array.from({ length: 10 }, (_, index) => `第${index + 1}集推进`).join('\n'),
    summaryEpisodes: Array.from({ length: 10 }, (_, index) => ({
      episodeNo: index + 1,
      summary: `第${index + 1}集推进`
    })),
    facts: []
  }
}

function buildCharacters(): CharacterDraftDto[] {
  return [
    {
      name: '少年守钥人',
      biography: '被恶霸逼到亮底的守钥人。',
      publicMask: '能忍',
      hiddenPressure: '少女和钥匙一起被捏住。',
      fear: '守不住人也守不住钥匙。',
      protectTarget: '小柔',
      conflictTrigger: '恶霸用小柔逼钥匙。',
      advantage: '懂门路',
      weakness: '先忍后发。',
      goal: '先守人再守钥匙。',
      arc: '被逼着从只会忍变成敢反咬。'
    }
  ]
}

test('generateDetailedOutlineFromContext wires episode_control cards into returned beats', async () => {
  const outline = buildTenEpisodeOutline()
  const characters = buildCharacters()
  const decoratedRanges: string[] = []

  const result = await generateDetailedOutlineFromContext(
    {
      outline,
      characters,
      storyIntent: {
        titleHint: '守钥人',
        sellingPremise: '少年守钥人被恶霸拿少女逼到亮底。',
        coreDislocation: '最该忍的人先被逼急。',
        emotionalPayoff: '一路反咬的爽感',
        protagonist: '少年守钥人',
        antagonist: '恶霸',
        coreConflict: '恶霸拿少女和钥匙一起逼主角亮底。',
        officialKeyCharacters: ['少年守钥人', '恶霸', '小柔'],
        lockedCharacterNames: ['少年守钥人', '恶霸', '小柔'],
        themeAnchors: ['守与代价'],
        worldAnchors: ['镇口逼压'],
        relationAnchors: ['恶霸拿少女逼钥匙'],
        dramaticMovement: ['先守人再守钥匙', '再被逼着换打法'],
        shortDramaConstitution: {
          corePrinciple: '快节奏、强冲突、稳情绪',
          coreEmotion: '一路反咬的爽感',
          incitingIncident: {
            timingRequirement: '30 秒炸场，最晚不超过第 1 集结尾',
            disruption: '恶霸先拿小柔逼少年守钥人亮底',
            mainLine: '少年守钥人必须先守人再守钥匙'
          },
          protagonistArc: {
            flawBelief: '少年守钥人以为一直忍就能保住一切',
            growthMode: '每集被逼着改一次打法',
            payoff: '最后把旧账狠狠干回去'
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
      },
      runtimeConfig
    },
    {
      invokeAct: async ({ plan }) => ({
        act: plan.act,
        startEpisode: plan.startEpisode,
        endEpisode: plan.endEpisode,
        content: `${plan.act}-${plan.startEpisode}-${plan.endEpisode}`,
        hookType: `${plan.act}-hook`,
        episodeBeats: plan.episodes.map((episode) => ({
          episodeNo: episode.episodeNo,
          summary: `${episode.summary}｜详纲推进`,
          sceneByScene: [
            {
              sceneNo: 1,
              location: `地点${episode.episodeNo}`,
              timeOfDay: '夜',
              setup: `第${episode.episodeNo}集先炸场`,
              tension: `第${episode.episodeNo}集继续加压`,
              hookEnd: `第${episode.episodeNo}集尾场挂钩`
            }
          ]
        }))
      }),
      decorateSegmentWithEpisodeControlCards: async ({ segment }) => {
        decoratedRanges.push(`${segment.startEpisode}-${segment.endEpisode}`)
        return {
          ...segment,
          episodeBeats: (segment.episodeBeats || []).map((beat) => ({
            ...beat,
            episodeControlCard: {
              episodeMission: `第${beat.episodeNo}集推进任务`,
              openingBomb: `第${beat.episodeNo}集开场先炸`,
              conflictUpgrade: `第${beat.episodeNo}集冲突继续升级`,
              arcBeat: `第${beat.episodeNo}集主角被逼改一步`,
              emotionBeat: `第${beat.episodeNo}集稳住一路反咬`,
              hookLanding: `第${beat.episodeNo}集尾场结果落地`,
              povConstraint: '只跟主角视角走',
              forbiddenDrift: ['不要铺背景', '不要切无关视角']
            }
          }))
        }
      }
    }
  )

  assert.equal(result.source, 'model')
  assert.equal(result.segments.length, 4)
  assert.deepEqual(decoratedRanges, ['1-2', '3-4', '5-7', '8-10'])
  assert.equal(
    result.segments.every((segment) =>
      (segment.episodeBeats || []).every((beat) => Boolean(beat.episodeControlCard?.episodeMission))
    ),
    true
  )
  assert.equal(
    result.segments[3]?.episodeBeats?.[2]?.episodeControlCard?.hookLanding,
    '第10集尾场结果落地'
  )
})

test('generateDetailedOutlineFromContext feeds batch-specific active characters into each invokeAct call', async () => {
  const outline = buildTenEpisodeOutline()
  outline.summaryEpisodes = outline.summaryEpisodes.map((episode) => {
    if (episode.episodeNo <= 2) {
      return { ...episode, summary: `第${episode.episodeNo}集：李科把少年守钥人逼到祠堂门口。` }
    }
    if (episode.episodeNo >= 8) {
      return { ...episode, summary: `第${episode.episodeNo}集：谢宁带边城军报逼少年守钥人立刻守城。` }
    }
    return { ...episode, summary: `第${episode.episodeNo}集：少年守钥人继续扛压。` }
  })

  const capturedCharacters: Array<{ range: string; names: string[] }> = []

  await generateDetailedOutlineFromContext(
    {
      outline,
      characters: [
        {
          name: '少年守钥人',
          biography: '主角',
          publicMask: '能忍',
          hiddenPressure: '要护住小柔',
          fear: '守不住人',
          protectTarget: '小柔',
          conflictTrigger: '被逼到亮底',
          advantage: '会忍也会算',
          weakness: '太在意要护的人',
          goal: '守住钥匙和人',
          arc: '从忍到反咬',
          roleLayer: 'core'
        }
      ],
      entityStore: {
        characters: [
          {
            id: 'char-li-ke',
            projectId: 'project-1',
            type: 'character',
            name: '李科',
            aliases: [],
            summary: '前半程反派',
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
          },
          {
            id: 'char-xie-ning',
            projectId: 'project-1',
            type: 'character',
            name: '谢宁',
            aliases: [],
            summary: '后半程守将',
            tags: ['守将'],
            roleLayer: 'active',
            goals: ['逼少年守钥人守边城'],
            pressures: ['边城军报压境'],
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
      },
      runtimeConfig
    },
    {
      invokeAct: async ({ plan, characters }) => {
        capturedCharacters.push({
          range: `${plan.startEpisode}-${plan.endEpisode}`,
          names: characters.map((character) => character.name)
        })
        return {
          act: plan.act,
          startEpisode: plan.startEpisode,
          endEpisode: plan.endEpisode,
          content: `${plan.act}-${plan.startEpisode}-${plan.endEpisode}`,
          hookType: `${plan.act}-hook`,
          episodeBeats: plan.episodes.map((episode) => ({
            episodeNo: episode.episodeNo,
            summary: `${episode.summary}｜详纲推进`,
            sceneByScene: [
              {
                sceneNo: 1,
                location: `地点${episode.episodeNo}`,
                timeOfDay: '夜',
                setup: `第${episode.episodeNo}集先炸场`,
                tension: `第${episode.episodeNo}集继续加压`,
                hookEnd: `第${episode.episodeNo}集尾场挂钩`
              }
            ]
          }))
        }
      },
      decorateSegmentWithEpisodeControlCards: async ({ segment }) => segment
    }
  )

  assert.deepEqual(capturedCharacters[0], {
    range: '1-2',
    names: ['少年守钥人', '李科']
  })
  assert.deepEqual(capturedCharacters[3], {
    range: '8-10',
    names: ['少年守钥人', '谢宁']
  })
})

test('isDetailedOutlineModelResultComplete accepts four fully populated model segments', () => {
  assert.equal(isDetailedOutlineModelResultComplete(buildDerivedSegments()), true)
})

test('isDetailedOutlineModelResultComplete rejects thin segments without full scene coverage', () => {
  const incomplete: DetailedOutlineSegmentDto[] = buildThinSegments().map((segment) => ({
    ...segment,
    episodeBeats: segment.episodeBeats?.map((episode) => ({
      ...episode,
      sceneByScene: []
    }))
  }))

  assert.equal(isDetailedOutlineModelResultComplete(incomplete), false)
})

test('isDetailedOutlineModelResultComplete rejects partial segment arrays', () => {
  assert.equal(isDetailedOutlineModelResultComplete(buildDerivedSegments().slice(0, 3)), false)
})

test('isDetailedOutlineActResultComplete requires exact episode coverage for the current act', () => {
  const [opening] = buildDerivedSegments()

  assert.equal(
    isDetailedOutlineActResultComplete({
      segment: opening,
      startEpisode: 1,
      endEpisode: 2
    }),
    false
  )
})

test('isDetailedOutlineActResultComplete accepts a fully covered act range', () => {
  const segment: DetailedOutlineSegmentDto = {
    act: 'opening',
    content: '开局先把黎明拖进局，再把第一轮代价坐实。',
    hookType: '入局钩子',
    episodeBeats: [
      {
        episodeNo: 1,
        summary: '第1集：黎明先被拖进局。',
        sceneByScene: [
          { sceneNo: 1, setup: '李科先压下来。', tension: '黎明被逼应对。' },
          { sceneNo: 2, setup: '黎明先吞这一刀。', tension: '暗里开始找翻口。' }
        ]
      },
      {
        episodeNo: 2,
        summary: '第2集：代价开始变重。',
        sceneByScene: [
          { sceneNo: 1, setup: '小柔被盯上。', tension: '守的人变成筹码。' },
          { sceneNo: 2, setup: '黎明被迫换打法。', tension: '局势开始升级。' }
        ]
      }
    ]
  }

  assert.equal(
    isDetailedOutlineActResultComplete({
      segment,
      startEpisode: 1,
      endEpisode: 2
    }),
    true
  )
})

test('normalizeDetailedOutlineSourceOutline keeps 30-episode outline coverage instead of snapping back to 10', () => {
  const outline: OutlineDraftDto = {
    title: '修仙传',
    genre: '玄幻',
    theme: '隐忍反咬',
    mainConflict: '黎明被逼亮底',
    protagonist: '黎明',
    summary: Array.from({ length: 30 }, (_, index) => `第${index + 1}集：推进${index + 1}`).join(
      '\n'
    ),
    summaryEpisodes: Array.from({ length: 30 }, (_, index) => ({
      episodeNo: index + 1,
      summary: `第${index + 1}集推进`
    })),
    facts: []
  }

  const normalized = normalizeDetailedOutlineSourceOutline(outline)

  assert.equal(normalized.summaryEpisodes.length, 30)
  assert.equal(normalized.summaryEpisodes[29]?.episodeNo, 30)
  assert.equal(normalized.summaryEpisodes[29]?.summary, '第30集推进')
})

test('deriveOutlineEpisodeCount returns 30 for real 30-episode outline data', () => {
  const outline = loadRealThirtyEpisodeOutline()

  assert.equal(deriveOutlineEpisodeCount(outline), 30)
})

test('buildFourActEpisodeRanges splits real 30-episode outline into exact 30-episode act ranges', () => {
  const outline = loadRealThirtyEpisodeOutline()
  const totalEpisodes = deriveOutlineEpisodeCount(outline)

  assert.deepEqual(buildFourActEpisodeRanges(totalEpisodes), [
    { startEpisode: 1, endEpisode: 7 },
    { startEpisode: 8, endEpisode: 14 },
    { startEpisode: 15, endEpisode: 22 },
    { startEpisode: 23, endEpisode: 30 }
  ])
})

test('real 30-episode detailed outline episodeBeats cover 1..30 and later 30-episode beats are not empty shells', () => {
  const segments = loadRealThirtyEpisodeDetailedOutlineSegments()
  const uniqueEpisodeNos = Array.from(
    new Set(
      segments.flatMap((segment) => segment.episodeBeats?.map((beat) => beat.episodeNo) || [])
    )
  ).sort((left, right) => left - right)

  assert.equal(segments.length, 4)
  assert.deepEqual(
    uniqueEpisodeNos,
    Array.from({ length: 30 }, (_, index) => index + 1)
  )

  const laterEpisodeBeats = segments
    .flatMap((segment) => segment.episodeBeats || [])
    .filter((beat) => beat.episodeNo >= 11 && beat.episodeNo <= 30)

  assert.equal(laterEpisodeBeats.length, 20)
  assert.equal(laterEpisodeBeats.every(hasEpisodeBeatContent), true)
})
