import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import * as shared from '../seed-constructors/script-quality-shared.mjs'

const PASSING_SCREENPLAY = readFileSync(
  new URL('../../.codex/script-parse-failure-scene-1.txt', import.meta.url),
  'utf8'
)

const FAILING_SCREENPLAY = `第3集

3-1 破庙［外］［日］
人物：黎明，小柔
△黎明冲到庙门前。
**黎明**：（厉声）放人。
**李科**：（冷笑）你拦不住。
△李科抬手示意打手上前。

3-2 小巷［外］［夜］
人物：黎明，李科
△两人在巷口对峙。
**李科**：（逼近）钥匙交出来。
**黎明**：（咬牙）休想。
△巷口风声骤紧。`

function createProject(screenplay, issues = []) {
  return {
    scriptDraft: [
      {
        sceneNo: 1,
        action: '',
        dialogue: '',
        emotion: '',
        screenplay,
        screenplayScenes: [],
        legacyFormat: false
      }
    ],
    scriptStateLedger: {
      postflight: {
        issues
      }
    }
  }
}

function createEvidence(overrides = {}) {
  return {
    plan: { ready: true, blockedBy: [] },
    afterSaveScriptDraft: true,
    afterSaveRuntimeState: true,
    ...overrides
  }
}

test('summarizeOfficialQuality returns compact official quality summary', () => {
  assert.equal(typeof shared.summarizeOfficialQuality, 'function')

  const summary = shared.summarizeOfficialQuality(createProject(PASSING_SCREENPLAY))

  assert.equal(summary.pass, true)
  assert.equal(summary.episodeCount, 1)
  assert.equal(summary.passedEpisodes, 1)
  assert.equal(typeof summary.averageCharCount, 'number')
  assert.equal(summary.weakEpisodeCount, 0)
  assert.deepEqual(summary.weakEpisodes, [])
})

test('buildCaseResult uses official quality pass even when judge is weak', () => {
  const result = shared.buildCaseResult(
    'fs-a',
    'fresh_start',
    'baseline',
    createEvidence(),
    {
      quality: '弱',
      issueCount: 0,
      firstScene: {
        hasAction: false,
        hasDialogue: false,
        hasEmotion: false
      }
    },
    { success: true },
    createProject(PASSING_SCREENPLAY)
  )

  assert.equal(result.officialQuality.pass, true)
  assert.equal(result.quality_verdict, 'PASS')
  assert.equal(result.failure_layer, 'none')
  assert.equal(result.issue_count, 0)
  assert.equal(result.weak_episode_count, 0)
  assert.equal(result.judge.quality, '弱')
})

test('buildCaseResult fails on official quality even when judge is good', () => {
  const result = shared.buildCaseResult(
    'rs-a',
    'resume',
    'baseline',
    createEvidence(),
    {
      quality: '好',
      issueCount: 0,
      firstScene: {
        hasAction: true,
        hasDialogue: true,
        hasEmotion: true
      }
    },
    { success: true },
    createProject(FAILING_SCREENPLAY)
  )

  assert.equal(result.officialQuality.pass, false)
  assert.equal(result.quality_verdict, 'FAIL')
  assert.equal(result.failure_layer, 'postflight')
  assert.ok(result.weak_episode_count > 0)
})

test('buildCaseResult keeps pre-quality failures out of postflight attribution', () => {
  const scenarios = [
    {
      name: 'prompt failure wins before official quality',
      evidence: createEvidence({
        plan: { ready: false, blockedBy: ['script_formal_fact_missing'] }
      }),
      generationResult: { success: true },
      expectedLayer: 'prompt'
    },
    {
      name: 'batch failure wins before official quality',
      evidence: createEvidence(),
      generationResult: { success: false },
      expectedLayer: 'batch'
    },
    {
      name: 'save chain failure wins before official quality',
      evidence: createEvidence({ afterSaveScriptDraft: false }),
      generationResult: { success: true },
      expectedLayer: 'save_chain'
    }
  ]

  for (const scenario of scenarios) {
    const result = shared.buildCaseResult(
      'rw-a',
      'rewrite',
      'baseline',
      scenario.evidence,
      {
        quality: '好',
        issueCount: 0,
        firstScene: {
          hasAction: true,
          hasDialogue: true,
          hasEmotion: true
        }
      },
      scenario.generationResult,
      createProject(FAILING_SCREENPLAY)
    )

    assert.equal(result.quality_verdict, 'FAIL', scenario.name)
    assert.equal(result.failure_layer, scenario.expectedLayer, scenario.name)
  }
})


