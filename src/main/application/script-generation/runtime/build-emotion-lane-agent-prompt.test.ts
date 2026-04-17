/**
 * src/main/application/script-generation/runtime/build-emotion-lane-agent-prompt.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  buildEmotionLaneAgentPrompt,
  type EmotionLaneAgentInput
} from './build-emotion-lane-agent-prompt.ts'

function makeScene(screenplay: string, sceneNo = 18): EmotionLaneAgentInput['previousScene'] {
  return {
    sceneNo,
    screenplay,
    action: '',
    dialogue: '',
    emotion: '',
    screenplayScenes: [{ sceneNo: 1, body: screenplay, characterRoster: [] }]
  }
}

describe('buildEmotionLaneAgentPrompt', () => {
  it('包含角色和任务声明', () => {
    const input: EmotionLaneAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      emotionAnchoringScore: 30,
      protagonistName: '黎明',
      coreEmotion: '一路反咬的爽感'
    }
    const prompt = buildEmotionLaneAgentPrompt(input)
    assert.ok(prompt.includes('emotion-lane-agent'))
    assert.ok(prompt.includes('一路反咬的爽感'))
    assert.ok(prompt.includes('冲突 -> 选择 -> 结果'))
  })

  it('显示当前主题锚定分数', () => {
    const input: EmotionLaneAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      emotionAnchoringScore: 25,
      protagonistName: '黎明',
      coreEmotion: '一路反咬的爽感'
    }
    const prompt = buildEmotionLaneAgentPrompt(input)
    assert.ok(prompt.includes('25'))
    assert.ok(prompt.includes('60'))
  })

  it('分数低于30时提供完整方向', () => {
    const input: EmotionLaneAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      emotionAnchoringScore: 20,
      protagonistName: '黎明',
      coreEmotion: '一路反咬的爽感'
    }
    const prompt = buildEmotionLaneAgentPrompt(input)
    assert.ok(prompt.includes('开场先用一刀更硬的压力'))
    assert.ok(prompt.includes('尾场必须交一个结果'))
  })

  it('分数30-59时提供强化方向', () => {
    const input: EmotionLaneAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      emotionAnchoringScore: 45,
      protagonistName: '黎明',
      coreEmotion: '一路反咬的爽感'
    }
    const prompt = buildEmotionLaneAgentPrompt(input)
    assert.ok(prompt.includes('更具体'))
  })

  it('分数60以上时提供微调方向', () => {
    const input: EmotionLaneAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      emotionAnchoringScore: 75,
      protagonistName: '黎明',
      coreEmotion: '一路反咬的爽感'
    }
    const prompt = buildEmotionLaneAgentPrompt(input)
    assert.ok(prompt.includes('微调'))
  })

  it('包含主题呈现原则', () => {
    const input: EmotionLaneAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      emotionAnchoringScore: 20,
      protagonistName: '黎明',
      coreEmotion: '一路反咬的爽感'
    }
    const prompt = buildEmotionLaneAgentPrompt(input)
    assert.ok(prompt.includes('不能靠喊口号'))
    assert.ok(prompt.includes('可拍动作'))
    assert.ok(prompt.includes('一集只死磕一股主情绪'))
  })

  it('包含禁止事项', () => {
    const input: EmotionLaneAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      emotionAnchoringScore: 30,
      protagonistName: '黎明',
      coreEmotion: '一路反咬的爽感'
    }
    const prompt = buildEmotionLaneAgentPrompt(input)
    assert.ok(prompt.includes('场数'))
    assert.ok(prompt.includes('不准从零重写'))
    assert.ok(prompt.includes('Action:/Dialogue:/Emotion:'))
  })

  it('包含原稿', () => {
    const screenplay = '黎明在山洞里发现秘宝。'
    const input: EmotionLaneAgentInput = {
      previousScene: makeScene(screenplay),
      emotionAnchoringScore: 30,
      protagonistName: '黎明',
      coreEmotion: '一路反咬的爽感'
    }
    const prompt = buildEmotionLaneAgentPrompt(input)
    assert.ok(prompt.includes(screenplay))
    assert.ok(prompt.includes('必须改的上一版原稿'))
  })

  it('支持动态核心情绪文本，而不是写死项目主题', () => {
    const input: EmotionLaneAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      emotionAnchoringScore: 20,
      protagonistName: '黎明',
      coreEmotion: '紧张压迫感'
    }
    const prompt = buildEmotionLaneAgentPrompt(input)
    assert.ok(prompt.includes('紧张压迫感'))
  })
})

