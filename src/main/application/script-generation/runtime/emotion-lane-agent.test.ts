/**
 * src/main/application/script-generation/runtime/emotion-lane-agent.test.ts
 *
 * emotion-lane-agent 单测。
 *
 * 注意：这个文件主要测 prompt 构建和函数签名，不测实际 AI 调用。
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

describe('emotion-lane-agent (prompt signature)', () => {
  it('buildEmotionLaneAgentPrompt 返回非空字符串', () => {
    const input: EmotionLaneAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      emotionAnchoringScore: 30,
      protagonistName: '黎明'
    }
    const prompt = buildEmotionLaneAgentPrompt(input)
    assert.ok(typeof prompt === 'string')
    assert.ok(prompt.length > 0)
  })

  it('包含核心情绪', () => {
    const input: EmotionLaneAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      emotionAnchoringScore: 30,
      protagonistName: '黎明',
      coreEmotion: '一路反咬的爽感'
    }
    const prompt = buildEmotionLaneAgentPrompt(input)
    assert.ok(prompt.includes('一路反咬的爽感'))
    assert.ok(prompt.includes('主情绪'))
  })

  it('分数低于30时提供完整方向', () => {
    const input: EmotionLaneAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      emotionAnchoringScore: 20,
      protagonistName: '黎明'
    }
    const prompt = buildEmotionLaneAgentPrompt(input)
    assert.ok(prompt.includes('开场先用一刀更硬的压力'))
    assert.ok(prompt.includes('尾场必须交一个结果'))
  })

  it('分数30-59时提供强化方向', () => {
    const input: EmotionLaneAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      emotionAnchoringScore: 45,
      protagonistName: '黎明'
    }
    const prompt = buildEmotionLaneAgentPrompt(input)
    assert.ok(prompt.includes('更具体') || prompt.includes('更强'))
  })

  it('分数60以上时提供微调方向', () => {
    const input: EmotionLaneAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      emotionAnchoringScore: 75,
      protagonistName: '黎明'
    }
    const prompt = buildEmotionLaneAgentPrompt(input)
    assert.ok(prompt.includes('微调'))
  })

  it('包含原稿', () => {
    const screenplay = '黎明在山洞里发现秘宝。'
    const input: EmotionLaneAgentInput = {
      previousScene: makeScene(screenplay),
      emotionAnchoringScore: 30,
      protagonistName: '黎明'
    }
    const prompt = buildEmotionLaneAgentPrompt(input)
    assert.ok(prompt.includes(screenplay))
    assert.ok(prompt.includes('必须改的上一版原稿'))
  })
})

