import test from 'node:test'
import assert from 'node:assert/strict'

import { buildRuntimePolicySnapshot, decideRuntimePolicyOrder } from './runtime-policy.ts'

test('story intake stays on deepseek when only one lane is allowed', () => {
  const decision = decideRuntimePolicyOrder({
    request: {
      task: 'story_intake',
      prompt: '整理聊天'
    },
    enabledLanes: ['deepseek']
  })

  assert.deepEqual(decision.orderedLanes, ['deepseek'])
  assert.equal(decision.reasonCodes.includes('preferred_lane'), false)
})

test('generic decision assist still resolves to deepseek single lane', () => {
  const decision = decideRuntimePolicyOrder({
    request: {
      task: 'decision_assist',
      prompt: '普通判断'
    },
    enabledLanes: ['deepseek']
  })

  assert.deepEqual(decision.orderedLanes, ['deepseek'])
})

test('runtime policy snapshot states deepseek single-lane execution', () => {
  const snapshot = buildRuntimePolicySnapshot({
    task: 'quality_audit',
    prompt: '检查质量',
    runtimeHints: {
      estimatedContextTokens: 90_000,
      hasP0Risk: true
    }
  })

  assert.match(snapshot.summary, /DeepSeek 单通道/)
})
