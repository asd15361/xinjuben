/**
 * src/main/application/script-generation/runtime/arc-control-agent.test.ts
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

describe('arc-control-agent (prompt signature)', () => {
  it('buildArcControlAgentPrompt 返回非空字符串', () => {
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
    assert.ok(typeof prompt === 'string')
    assert.ok(prompt.length > 0)
  })

  it('停滞角色给出推进方向', () => {
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
    assert.ok(prompt.includes('黎明'))
  })

  it('退化角色给出恢复方向', () => {
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
    assert.ok(prompt.includes('重新拿回一点主动'))
  })

  it('包含三个角色的弧线状态', () => {
    const input: ArcControlAgentInput = {
      previousScene: makeScene('黎明在山洞里。'),
      characterArcs: [
        { characterName: '黎明', status: 'advanced', description: '有变化', evidence: [] },
        { characterName: '小柔', status: 'stagnant', description: '无变化', evidence: [] },
        { characterName: '李柯', status: 'stagnant', description: '无变化', evidence: [] }
      ],
      protagonistName: '黎明',
      supportingName: '小柔',
      antagonistName: '李柯'
    }
    const prompt = buildArcControlAgentPrompt(input)
    assert.ok(prompt.includes('黎明'))
    assert.ok(prompt.includes('小柔'))
    assert.ok(prompt.includes('李柯'))
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
})

