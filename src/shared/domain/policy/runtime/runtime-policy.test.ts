import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildRuntimePolicySnapshot,
  decideRuntimePolicyOrder,
  buildRuntimeExecutionSnapshot,
  isRuntimeKeyEpisode
} from './runtime-policy.ts'

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

test('runtime policy snapshot reflects multi-lane strategy with correct priority order', () => {
  const snapshot = buildRuntimePolicySnapshot({
    task: 'quality_audit',
    prompt: '检查质量',
    runtimeHints: {
      estimatedContextTokens: 90_000,
      hasP0Risk: true
    }
  })

  // 1. 路由摘要里包含主优先级顺序
  assert.match(snapshot.summary, /OpenRouter/)
  assert.match(snapshot.summary, /Gemini Flash Lite/)
  assert.match(snapshot.summary, /Qwen Free/)
  assert.match(snapshot.summary, /DeepSeek/)

  // 2. 长上下文模式摘要差异
  assert.match(snapshot.summary, /长上下文/)

  // 3. 高风险模式标记
  assert.equal(snapshot.highRiskMode, true)
})

test('decideRuntimePolicyOrder returns reason codes for key episodes and risks', () => {
  // 关键集（第1集、第5集、最后一集）
  const keyEpisodeDecision = decideRuntimePolicyOrder({
    request: {
      task: 'episode_script',
      prompt: '生成剧本',
      runtimeHints: {
        episode: 5,
        totalEpisodes: 30
      }
    },
    enabledLanes: ['openrouter_gemini_flash_lite', 'openrouter_qwen_free', 'deepseek']
  })

  assert.ok(keyEpisodeDecision.reasonCodes.includes('key_episode'))

  // P0 风险
  const p0RiskDecision = decideRuntimePolicyOrder({
    request: {
      task: 'episode_script',
      prompt: '生成剧本',
      runtimeHints: {
        episode: 3,
        totalEpisodes: 30,
        hasP0Risk: true
      }
    },
    enabledLanes: ['openrouter_gemini_flash_lite', 'openrouter_qwen_free', 'deepseek']
  })

  assert.ok(p0RiskDecision.reasonCodes.includes('p0_risk'))

  // 严格模式
  const strictDecision = decideRuntimePolicyOrder({
    request: {
      task: 'episode_script',
      prompt: '生成剧本',
      runtimeHints: {
        episode: 2,
        totalEpisodes: 30,
        strictness: 'strict'
      }
    },
    enabledLanes: ['openrouter_gemini_flash_lite', 'openrouter_qwen_free', 'deepseek']
  })

  assert.ok(strictDecision.reasonCodes.includes('strict_mode'))
})

test('isRuntimeKeyEpisode identifies key episodes correctly', () => {
  // 第1集是关键集
  assert.equal(isRuntimeKeyEpisode(1, 30), true)
  // 第5集是关键集（每5集一个关键集）
  assert.equal(isRuntimeKeyEpisode(5, 30), true)
  // 第10集是关键集
  assert.equal(isRuntimeKeyEpisode(10, 30), true)
  // 最后一集是关键集
  assert.equal(isRuntimeKeyEpisode(30, 30), true)
  // 普通集不是关键集
  assert.equal(isRuntimeKeyEpisode(3, 30), false)
  assert.equal(isRuntimeKeyEpisode(7, 30), false)
})

test('buildRuntimeExecutionSnapshot returns pending state for null plan', () => {
  const snapshot = buildRuntimeExecutionSnapshot(null)

  assert.equal(snapshot.primaryLane, 'pending')
  assert.equal(snapshot.fallbackLane, 'pending')
  assert.equal(snapshot.blockedIssueCount, 0)
  assert.match(snapshot.summary, /尚未形成执行计划/)
})
