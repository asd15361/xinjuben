import test from 'node:test'
import assert from 'node:assert/strict'
import {
  inspectStorySynopsisReadiness
} from './story-synopsis.ts'

function buildSynopsis(overrides: Partial<import('../../contracts/intake.ts').StorySynopsisDto> = {}): import('../../contracts/intake.ts').StorySynopsisDto {
  return {
    logline: '废灵根刺客发现组织黑幕，觉醒神尊之力逆袭',
    openingPressureEvent: '测灵台当众判废体，同门逼交功劳，女修划清界限',
    protagonistCurrentDilemma: '被宗门判废体，功劳被夺，婚约被撕',
    firstFaceSlapEvent: '测灵石炸裂反噬长老，众人以为他是天才',
    antagonistForce: '宗门长老与刺客组织首领',
    antagonistPressureMethod: '用宗门规矩当众废他灵脉',
    corePayoff: '废材逆袭+身份揭露',
    stageGoal: '查清组织黑幕，夺回自主权',
    finaleDirection: '登顶仙界，清算旧势力',
    ...overrides
  }
}

test('null synopsis = not ready, all fields missing', () => {
  const result = inspectStorySynopsisReadiness(null)
  assert.equal(result.ready, false)
  assert.ok(result.missing.length > 0)
  assert.ok(result.missing.includes('开局压迫事件'))
  assert.ok(result.missing.includes('第一场打脸'))
})

test('undefined synopsis = not ready', () => {
  const result = inspectStorySynopsisReadiness(undefined)
  assert.equal(result.ready, false)
  assert.ok(result.missing.length > 0)
})

test('fully filled synopsis = ready', () => {
  const result = inspectStorySynopsisReadiness(buildSynopsis())
  assert.equal(result.ready, true)
  assert.equal(result.missing.length, 0)
})

test('missing openingPressureEvent = not ready', () => {
  const result = inspectStorySynopsisReadiness(buildSynopsis({ openingPressureEvent: '' }))
  assert.equal(result.ready, false)
  assert.ok(result.missing.includes('开局压迫事件'))
})

test('missing firstFaceSlapEvent = not ready', () => {
  const result = inspectStorySynopsisReadiness(buildSynopsis({ firstFaceSlapEvent: '' }))
  assert.equal(result.ready, false)
  assert.ok(result.missing.includes('第一场打脸'))
})

test('missing antagonistForce = not ready', () => {
  const result = inspectStorySynopsisReadiness(buildSynopsis({ antagonistForce: '' }))
  assert.equal(result.ready, false)
  assert.ok(result.missing.includes('核心反派/势力'))
})

test('too-short value treated as missing', () => {
  const result = inspectStorySynopsisReadiness(buildSynopsis({ stageGoal: 'ab' }))
  assert.equal(result.ready, false)
  assert.ok(result.missing.includes('主角阶段目标'))
})

test('optional fields do not affect readiness', () => {
  const result = inspectStorySynopsisReadiness(buildSynopsis({
    keyFemaleCharacterFunction: '',
    episodePlanHint: ''
  }))
  assert.equal(result.ready, true)
})

test('suggestions match missing fields', () => {
  const result = inspectStorySynopsisReadiness(buildSynopsis({
    openingPressureEvent: '',
    firstFaceSlapEvent: ''
  }))
  assert.equal(result.suggestions.length, result.missing.length)
  assert.ok(result.suggestions.some((s) => s.includes('压迫')))
  assert.ok(result.suggestions.some((s) => s.includes('反击')))
})
