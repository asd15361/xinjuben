/**
 * src/main/application/script-generation/runtime/episode-engine-agent.test.ts
 *
 * episode-engine-agent 单测。
 *
 * 注意：这个文件主要测 prompt 构建和函数签名，不测实际 AI 调用。
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  buildEpisodeEngineAgentPrompt,
  type EpisodeEngineAgentInput
} from './build-episode-engine-agent-prompt.ts'

function makeScene(screenplay: string, sceneNo = 18): EpisodeEngineAgentInput['previousScene'] {
  return {
    sceneNo,
    screenplay,
    action: '',
    dialogue: '',
    emotion: '',
    screenplayScenes: [{ sceneNo: 1, body: screenplay, characterRoster: [] }]
  }
}

describe('episode-engine-agent (prompt signature)', () => {
  it('buildEpisodeEngineAgentPrompt 返回非空字符串', () => {
    const input: EpisodeEngineAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      loopsDetected: [{ patternId: 'throwFakeKey', patternLabel: '扔假钥循环' }]
    }
    const prompt = buildEpisodeEngineAgentPrompt(input)
    assert.ok(typeof prompt === 'string')
    assert.ok(prompt.length > 0)
  })

  it('包含连续性修复指令', () => {
    const input: EpisodeEngineAgentInput = {
      previousScene: makeScene('喽啰：废物！\n喽啰：没用！'),
      loopsDetected: [{ patternId: 'gangsterScoldWaste', patternLabel: '喽啰骂废物循环' }]
    }
    const prompt = buildEpisodeEngineAgentPrompt(input)
    assert.ok(prompt.includes('打破循环'))
    assert.ok(prompt.includes('明确推进'))
  })

  it('包含 6 个已知循环模式', () => {
    const input: EpisodeEngineAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      loopsDetected: []
    }
    const prompt = buildEpisodeEngineAgentPrompt(input)
    assert.ok(prompt.includes('扔假钥循环'))
    assert.ok(prompt.includes('小柔流血循环'))
    assert.ok(prompt.includes('喽啰骂废物循环'))
    assert.ok(prompt.includes('李柯黑脸循环'))
    assert.ok(prompt.includes('假阵图循环'))
    assert.ok(prompt.includes('易成质疑循环'))
  })

  it('无循环时要求引入新事件', () => {
    const input: EpisodeEngineAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      loopsDetected: []
    }
    const prompt = buildEpisodeEngineAgentPrompt(input)
    assert.ok(prompt.includes('新增 1 个可拍的推进'))
  })

  it('接受 expectedEvent 参数', () => {
    const input: EpisodeEngineAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      loopsDetected: [],
      expectedEvent: '小柔背叛黎明'
    }
    const prompt = buildEpisodeEngineAgentPrompt(input)
    assert.ok(prompt.includes('本集必须发生'))
    assert.ok(prompt.includes('小柔背叛黎明'))
  })
})

