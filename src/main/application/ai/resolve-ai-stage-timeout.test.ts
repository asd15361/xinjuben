import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveAiStageTimeoutMs } from './resolve-ai-stage-timeout.ts'

test('episode script keeps a longer timeout budget than default ai tasks', () => {
  assert.equal(resolveAiStageTimeoutMs('episode_script'), 120_000)
  assert.equal(resolveAiStageTimeoutMs('decision_assist'), 45_000)
})

test('story intake gets a longer timeout budget than generic decision assist', () => {
  assert.equal(resolveAiStageTimeoutMs('story_intake'), 60_000)
  assert.equal(resolveAiStageTimeoutMs('decision_assist'), 45_000)
})

test('rough outline and character profile use stage-specific timeout budgets', () => {
  assert.equal(resolveAiStageTimeoutMs('rough_outline'), 90_000)
  assert.equal(resolveAiStageTimeoutMs('character_profile'), 90_000)
})

test('retry runtime script episodes get the longest timeout budget', () => {
  assert.equal(
    resolveAiStageTimeoutMs('episode_script', {
      recoveryMode: 'retry_runtime'
    }),
    150_000
  )
})

test('detailed outline uses an extended timeout budget', () => {
  assert.equal(resolveAiStageTimeoutMs('detailed_outline'), 300_000)
})

test('showrunner and episode control agents use dedicated timeout budgets', () => {
  assert.equal(resolveAiStageTimeoutMs('short_drama_showrunner'), 60_000)
  assert.equal(resolveAiStageTimeoutMs('episode_control'), 90_000)
})

test('faction matrix uses an extended timeout budget', () => {
  assert.equal(resolveAiStageTimeoutMs('faction_matrix'), 300_000)
})
