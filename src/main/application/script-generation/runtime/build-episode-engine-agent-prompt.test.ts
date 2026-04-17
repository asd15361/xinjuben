/**
 * src/main/application/script-generation/runtime/build-episode-engine-agent-prompt.test.ts
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

describe('buildEpisodeEngineAgentPrompt', () => {
  it('包含角色和任务声明', () => {
    const input: EpisodeEngineAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      loopsDetected: []
    }
    const prompt = buildEpisodeEngineAgentPrompt(input)
    assert.ok(prompt.includes('episode-engine-agent'))
    assert.ok(prompt.includes('局面真的往前推'))
    assert.ok(prompt.includes(' 18 ') || prompt.includes('18集') || prompt.includes('第 18'))
  })

  it('列出必须避免的 6 个已知循环模式', () => {
    const input: EpisodeEngineAgentInput = {
      previousScene: makeScene('小柔：（捂伤口）\n小柔：（踉跄）'),
      loopsDetected: [{ patternId: 'xiaRouBleeding', patternLabel: '小柔流血循环' }]
    }
    const prompt = buildEpisodeEngineAgentPrompt(input)
    assert.ok(prompt.includes('扔假钥循环'))
    assert.ok(prompt.includes('小柔流血循环'))
    assert.ok(prompt.includes('喽啰骂废物循环'))
    assert.ok(prompt.includes('李柯黑脸循环'))
    assert.ok(prompt.includes('假阵图循环'))
    assert.ok(prompt.includes('易成质疑循环'))
  })

  it('包含检测到的循环问题', () => {
    const input: EpisodeEngineAgentInput = {
      previousScene: makeScene('喽啰：废物！\n喽啰：没用！'),
      loopsDetected: [
        { patternId: 'gangsterScoldWaste', patternLabel: '喽啰骂废物循环' }
      ]
    }
    const prompt = buildEpisodeEngineAgentPrompt(input)
    assert.ok(prompt.includes('喽啰骂废物循环'))
    assert.ok(prompt.includes('检测到 1 个'))
  })

  it('无循环问题时说明情节停滞', () => {
    const input: EpisodeEngineAgentInput = {
      previousScene: makeScene('黎明走进山洞。'),
      loopsDetected: []
    }
    const prompt = buildEpisodeEngineAgentPrompt(input)
    assert.ok(prompt.includes('缺乏新事件'))
    assert.ok(prompt.includes('结果落地'))
    assert.ok(prompt.includes('不可逆结果'))
  })

  it('包含禁止事项', () => {
    const input: EpisodeEngineAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      loopsDetected: []
    }
    const prompt = buildEpisodeEngineAgentPrompt(input)
    assert.ok(prompt.includes('场数'))
    assert.ok(prompt.includes('不准从零重写'))
    assert.ok(prompt.includes('保留'))
    assert.ok(prompt.includes('Action:/Dialogue:/Emotion:'))
    assert.ok(prompt.includes('集尾优先写“已经发生的结果”'))
    assert.ok(prompt.includes('推进够狠'))
  })

  it('包含原稿', () => {
    const screenplay = '黎明在山洞里发现秘宝。'
    const input: EpisodeEngineAgentInput = {
      previousScene: makeScene(screenplay),
      loopsDetected: []
    }
    const prompt = buildEpisodeEngineAgentPrompt(input)
    assert.ok(prompt.includes(screenplay))
    assert.ok(prompt.includes('必须改的上一版原稿'))
  })

  it('接受 nextEpisodeHint 参数', () => {
    const input: EpisodeEngineAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      loopsDetected: [],
      nextEpisodeHint: '下一集黎明将面对李柯的挑战。'
    }
    const prompt = buildEpisodeEngineAgentPrompt(input)
    assert.ok(prompt.includes('下一集提示'))
    assert.ok(prompt.includes('下一集黎明将面对李柯的挑战'))
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

  it('前3集会补开头集额外要求', () => {
    const input: EpisodeEngineAgentInput = {
      previousScene: makeScene('黎明被堵在门口。', 2),
      loopsDetected: []
    }
    const prompt = buildEpisodeEngineAgentPrompt(input)
    assert.ok(prompt.includes('开头集额外要求'))
    assert.ok(prompt.includes('前 30% 就要让主冲突咬人'))
  })

  it('第1集会补专用加力要求', () => {
    const input: EpisodeEngineAgentInput = {
      previousScene: makeScene('黎明被堵在门口。', 1),
      loopsDetected: []
    }
    const prompt = buildEpisodeEngineAgentPrompt(input)
    assert.ok(prompt.includes('第1集专用加力'))
    assert.ok(prompt.includes('硬夺筹码'))
    assert.ok(prompt.includes('主角真被压住了'))
  })
})

