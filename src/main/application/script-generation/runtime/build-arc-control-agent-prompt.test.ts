/**
 * src/main/application/script-generation/runtime/build-arc-control-agent-prompt.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import {
  buildArcControlAgentPrompt,
  type ArcControlAgentInput
} from './build-arc-control-agent-prompt.ts'

function makeScene(screenplay: string, sceneNo = 18): ArcControlAgentInput['previousScene'] {
  return {
    sceneNo,
    screenplay,
    action: '',
    dialogue: '',
    emotion: '',
    screenplayScenes: [{ sceneNo: 1, body: screenplay, characterRoster: [] }]
  }
}

describe('buildArcControlAgentPrompt', () => {
  it('包含角色和任务声明', () => {
    const input: ArcControlAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      characterArcs: [
        { characterName: '黎明', status: 'stagnant', description: '无变化', evidence: [] }
      ],
      protagonistName: '黎明',
      supportingName: '小柔',
      antagonistName: '李柯'
    }
    const prompt = buildArcControlAgentPrompt(input)
    assert.ok(prompt.includes('arc-control-agent'))
    assert.ok(prompt.includes('戏剧功能'))
    assert.ok(prompt.includes(' 18 ') || prompt.includes('18集') || prompt.includes('第 18'))
  })

  it('显示停滞角色的状态', () => {
    const input: ArcControlAgentInput = {
      previousScene: makeScene('黎明：（依然）我还是一样。'),
      characterArcs: [
        { characterName: '黎明', status: 'stagnant', description: '无变化', evidence: [] }
      ],
      protagonistName: '黎明',
      supportingName: '小柔',
      antagonistName: '李柯'
    }
    const prompt = buildArcControlAgentPrompt(input)
    assert.ok(prompt.includes('黎明'))
    assert.ok(prompt.includes('STAGNANT'))
    assert.ok(prompt.includes('主角'))
  })

  it('显示退化角色的状态', () => {
    const input: ArcControlAgentInput = {
      previousScene: makeScene('黎明：（依然）我还是一样。'),
      characterArcs: [
        { characterName: '黎明', status: 'regressed', description: '退步了', evidence: [] }
      ],
      protagonistName: '黎明',
      supportingName: '小柔',
      antagonistName: '李柯'
    }
    const prompt = buildArcControlAgentPrompt(input)
    assert.ok(prompt.includes('REGRESSED'))
    assert.ok(prompt.includes('主动'))
  })

  it('停滞状态给出推进方向', () => {
    const input: ArcControlAgentInput = {
      previousScene: makeScene('黎明：（依然）我还是一样。'),
      characterArcs: [
        { characterName: '黎明', status: 'stagnant', description: '无变化', evidence: [] }
      ],
      protagonistName: '黎明',
      supportingName: '小柔',
      antagonistName: '李柯'
    }
    const prompt = buildArcControlAgentPrompt(input)
    assert.ok(prompt.includes('STAGNANT'))
    assert.ok(prompt.includes('带后果的选择'))
    assert.ok(prompt.includes('二选一'))
  })

  it('包含禁止事项', () => {
    const input: ArcControlAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      characterArcs: [
        { characterName: '黎明', status: 'stagnant', description: '无变化', evidence: [] }
      ],
      protagonistName: '黎明',
      supportingName: '小柔',
      antagonistName: '李柯'
    }
    const prompt = buildArcControlAgentPrompt(input)
    assert.ok(prompt.includes('场数'))
    assert.ok(prompt.includes('不准从零重写'))
    assert.ok(prompt.includes('Action:/Dialogue:/Emotion:'))
    assert.ok(prompt.includes('明确时限'))
    assert.ok(prompt.includes('改掉一个筹码'))
  })

  it('包含原稿', () => {
    const screenplay = '黎明在山洞里发现秘宝。'
    const input: ArcControlAgentInput = {
      previousScene: makeScene(screenplay),
      characterArcs: [
        { characterName: '黎明', status: 'stagnant', description: '无变化', evidence: [] }
      ],
      protagonistName: '黎明',
      supportingName: '小柔',
      antagonistName: '李柯'
    }
    const prompt = buildArcControlAgentPrompt(input)
    assert.ok(prompt.includes(screenplay))
    assert.ok(prompt.includes('必须改的上一版原稿'))
  })

  it('前3集会补开头集额外要求', () => {
    const input: ArcControlAgentInput = {
      previousScene: makeScene('黎明被堵在门口。', 2),
      characterArcs: [
        { characterName: '黎明', status: 'stagnant', description: '无变化', evidence: [] }
      ],
      protagonistName: '黎明',
      supportingName: '小柔',
      antagonistName: '李柯'
    }
    const prompt = buildArcControlAgentPrompt(input)
    assert.ok(prompt.includes('开头集额外要求'))
    assert.ok(prompt.includes('硬选择'))
    assert.ok(prompt.includes('拿人质'))
  })

  it('第1集会补专用加力要求', () => {
    const input: ArcControlAgentInput = {
      previousScene: makeScene('黎明被堵在门口。', 1),
      characterArcs: [
        { characterName: '黎明', status: 'stagnant', description: '无变化', evidence: [] }
      ],
      protagonistName: '黎明',
      supportingName: '小柔',
      antagonistName: '李柯'
    }
    const prompt = buildArcControlAgentPrompt(input)
    assert.ok(prompt.includes('第1集专用加力'))
    assert.ok(prompt.includes('保人'))
    assert.ok(prompt.includes('公开踩一次主角脸面'))
  })
})

