import test from 'node:test'
import assert from 'node:assert/strict'

import { generateEpisodeControlCardsForSegment } from './episode-control-agent.ts'
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

test('generateEpisodeControlCardsForSegment decorates every beat through episode_control agent output', async () => {
  let capturedTask = ''
  let capturedPrompt = ''

  const result = await generateEpisodeControlCardsForSegment({
    storyIntent: {
      titleHint: '守钥人',
      sellingPremise: '少年守钥人被恶霸拿少女逼到亮底。',
      coreDislocation: '最该忍的人先被逼急。',
      emotionalPayoff: '一路反咬的爽感',
      protagonist: '少年守钥人',
      antagonist: '恶霸',
      coreConflict: '恶霸拿少女和钥匙一起逼主角表态。',
      officialKeyCharacters: ['少年守钥人', '恶霸', '小镇少女'],
      lockedCharacterNames: ['少年守钥人', '恶霸', '小镇少女'],
      themeAnchors: ['守与代价'],
      worldAnchors: ['镇口逼压'],
      relationAnchors: ['恶霸拿少女逼钥匙'],
      dramaticMovement: ['先守人再守钥匙'],
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
    outline: {
      title: '守钥人',
      genre: '短剧',
      theme: '守与代价',
      mainConflict: '恶霸拿少女和钥匙一起逼主角表态。',
      protagonist: '少年守钥人',
      summary: 'summary',
      summaryEpisodes: [
        { episodeNo: 1, summary: '第1集先炸场。' },
        { episodeNo: 2, summary: '第2集继续加压。' }
      ],
      facts: []
    },
    characters: [
      {
        name: '少年守钥人',
        biography: '平时先忍，真被逼到人和钥匙一起出事时才会亮底。',
        publicMask: '表面装住，先认一口。',
        hiddenPressure: '最怕小镇少女先被拿来开刀。',
        fear: '小镇少女出事',
        protectTarget: '小镇少女',
        conflictTrigger: '一旦有人拿小镇少女逼钥匙，立刻换打法。',
        advantage: '能忍能算',
        weakness: '一碰小镇少女就会被逼急',
        goal: '先守人再守钥匙',
        arc: '从只会忍到会反咬'
      },
      {
        name: '恶霸',
        biography: '最爱拿人和筹码一起压主角表态。',
        publicMask: '先点名羞辱，再当场加价。',
        hiddenPressure: '最怕这次压不住主角。',
        fear: '失手丢脸',
        protectTarget: '自己的压制力',
        conflictTrigger: '一旦拿不到钥匙就继续加压。',
        advantage: '敢在公开场合施压',
        weakness: '越压越失控',
        goal: '逼出钥匙',
        arc: '从稳压到失控'
      }
    ],
    segment: {
      act: 'opening',
      startEpisode: 1,
      endEpisode: 2,
      content: '开局段',
      hookType: '入局钩子',
      episodeBeats: [
        {
          episodeNo: 1,
          summary: '第1集先炸场。',
          sceneByScene: [{ sceneNo: 1, setup: '恶霸先拿少女逼压。', hookEnd: '主角当场被逼表态。' }]
        },
        {
          episodeNo: 2,
          summary: '第2集继续加压。',
          sceneByScene: [{ sceneNo: 1, setup: '门外刀已经压进门缝。', hookEnd: '退路彻底断了。' }]
        }
      ]
    },
    runtimeConfig,
    invokeText: async (request) => {
      capturedTask = request.task
      capturedPrompt = request.prompt
      return {
        text: JSON.stringify({
          cards: [
            {
              episodeNo: 1,
              episodeMission: '第1集先炸场，立刻把人和钥匙绑成一道选择题。',
              openingBomb: '恶霸先拿少女逼压。',
              conflictUpgrade: '恶霸继续把少女和钥匙一起钉成当场选择。',
              arcBeat: '主角第一次意识到只忍不够。',
              emotionBeat: '一路反咬的爽感先压住再抬头。',
              hookLanding: '主角当场被逼表态。',
              povConstraint: '只准跟着少年守钥人的眼睛往前走。',
              forbiddenDrift: ['不要铺背景', '不要切无关视角']
            },
            {
              episodeNo: 2,
              episodeMission: '第2集继续加压，彻底断掉退路。',
              openingBomb: '门外刀已经压进门缝。',
              conflictUpgrade: '恶霸把局面压成只能硬接。',
              arcBeat: '主角开始换打法。',
              emotionBeat: '继续稳住一路反咬的爽感。',
              hookLanding: '退路彻底断了。',
              povConstraint: '只准跟着少年守钥人的眼睛往前走。',
              forbiddenDrift: ['不要回头解释']
            }
          ]
        }),
        lane: 'deepseek',
        model: 'mock',
        usedFallback: false,
        finishReason: 'stop'
      }
    }
  })

  assert.equal(capturedTask, 'episode_control')
  assert.match(capturedPrompt, /【当前人物小传】/)
  assert.match(capturedPrompt, /人物行为边界检查/)
  assert.match(capturedPrompt, /少年守钥人/)
  assert.match(capturedPrompt, /openingBomb 和 conflictUpgrade/)
  assert.equal(
    result.episodeBeats?.[0]?.episodeControlCard?.episodeMission,
    '第1集先炸场，立刻把人和钥匙绑成一道选择题。'
  )
  assert.equal(result.episodeBeats?.[1]?.episodeControlCard?.openingBomb, '门外刀已经压进门缝。')
  assert.deepEqual(result.episodeBeats?.[0]?.episodeControlCard?.forbiddenDrift, [
    '不要铺背景',
    '不要切无关视角'
  ])
})
