import test from 'node:test'
import assert from 'node:assert/strict'

import { confirmStoryIntentFromChat } from './confirm-story-intent-from-chat.ts'
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

test('confirmStoryIntentFromChat uses showrunner agent constitution as the only project-level control source', async () => {
  let summarizeCalled = 0
  let showrunnerCalled = 0

  const result = await confirmStoryIntentFromChat({
    projectId: 'project_world_1',
    chatTranscript: '用户：我要一个先忍后反咬的 12 集短剧。',
    runtimeConfig,
    summarizeChat: async () => {
      summarizeCalled += 1
      return {
        generationBriefText: `【项目】守钥人｜12集
【主角】少年守钥人
【对手】恶霸
【关键角色】少年守钥人、恶霸、小镇少女
【角色卡】
- 少年守钥人：玄玉宫看门少年
- 恶霸：持续拿少女和钥匙施压
- 小镇少女：被卷入局里的筹码
【世界观与故事背景】
宗门争斗不休，玄玉宫守着旧钥匙
【人物关系总梳理】
- 少年守钥人与恶霸是敌对关系`,
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
          dramaticMovement: ['先守人再守钥匙', '再被逼着换打法']
        }
      }
    },
    draftShortDramaConstitution: async ({ storyIntent, generationBriefText, chatTranscript }) => {
      showrunnerCalled += 1
      assert.equal(storyIntent.protagonist, '少年守钥人')
      assert.match(generationBriefText, /【项目】守钥人｜12集/)
      assert.match(chatTranscript, /先忍后反咬/)
      return {
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
    }
  })

  assert.equal(summarizeCalled, 1)
  assert.equal(showrunnerCalled, 1)
  assert.match(result.generationBriefText, /【项目】守钥人｜12集/)
  assert.equal(result.storyIntent.shortDramaConstitution?.corePrinciple, '快节奏、强冲突、稳情绪')
  assert.equal(
    result.storyIntent.shortDramaConstitution?.incitingIncident.mainLine,
    '少年守钥人必须先守人再守钥匙'
  )
  assert.ok(result.entityStore.characters.some((item) => item.name === '少年守钥人'))
  assert.ok(result.entityStore.characters.some((item) => item.name === '恶霸'))
  assert.ok(result.entityStore.factions.some((item) => item.name === '宗门'))
  assert.ok(Array.isArray(result.entityStore.relations))
})
