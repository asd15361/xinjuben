import test from 'node:test'
import assert from 'node:assert/strict'

import {
  VIRAL_GOLDEN_RULES,
  VIRAL_EPISODE_STRUCTURE,
  VIRAL_PROTAGONIST_RULES,
  VIRAL_VILLAIN_RULES,
  VIRAL_PAYOFF_TYPES,
  VIRAL_PUNCHLINE_PATTERNS,
  VIRAL_QUALITY_THRESHOLDS,
  VIRAL_VILLAIN_OPPRESSION_MODES,
  resolveVillainOppressionModeByEpisode,
  resolvePayoffTypeByEpisode,
  resolvePayoffLevelByEpisode,
  isMajorPayoffType,
  resolvePunchlinePatternByEpisode,
  buildSignatureLineSeed,
  resolveOpeningShockTypeByEpisode,
  buildOpeningShockEventFallback,
  resolveRetentionCliffhangerTypeByEpisode,
  buildRetentionCliffhangerFallback,
  resolveViralHookTypeByEpisode
} from './viral-short-drama-policy.ts'

test('VIRAL_GOLDEN_RULES has 10 rules with unique ids', () => {
  assert.equal(VIRAL_GOLDEN_RULES.length, 10)
  const ids = VIRAL_GOLDEN_RULES.map((r) => r.id)
  assert.equal(new Set(ids).size, 10)
  assert.ok(ids.includes('opening_shock'))
  assert.ok(ids.includes('punchline_is_distribution'))
})

test('VIRAL_EPISODE_STRUCTURE has 3 acts', () => {
  assert.equal(VIRAL_EPISODE_STRUCTURE.length, 3)
  assert.equal(VIRAL_EPISODE_STRUCTURE[0].actLabel, '施压')
  assert.equal(VIRAL_EPISODE_STRUCTURE[1].actLabel, '反转')
  assert.equal(VIRAL_EPISODE_STRUCTURE[2].actLabel, '钩子')
})

test('VIRAL_PROTAGONIST_RULES has 5 rules', () => {
  assert.equal(VIRAL_PROTAGONIST_RULES.length, 5)
  assert.ok(VIRAL_PROTAGONIST_RULES.every((r) => r.allowed.length > 0 && r.forbidden.length > 0))
})

test('VIRAL_VILLAIN_RULES has 4 rules matching oppression modes', () => {
  assert.equal(VIRAL_VILLAIN_RULES.length, 4)
  assert.equal(VIRAL_VILLAIN_OPPRESSION_MODES.length, 4)
})

test('VIRAL_PAYOFF_TYPES has 16 types', () => {
  assert.equal(VIRAL_PAYOFF_TYPES.length, 16)
  assert.equal(new Set(VIRAL_PAYOFF_TYPES).size, 16)
})

test('VIRAL_PUNCHLINE_PATTERNS has 4 patterns with antiPatterns', () => {
  assert.equal(VIRAL_PUNCHLINE_PATTERNS.length, 4)
  assert.ok(VIRAL_PUNCHLINE_PATTERNS.every((p) => p.antiPatterns.length > 0))
  assert.ok(VIRAL_PUNCHLINE_PATTERNS.every((p) => p.constraints.maxLength <= 15))
})

test('resolveVillainOppressionModeByEpisode rotates through 4 modes', () => {
  assert.equal(resolveVillainOppressionModeByEpisode(1), '规则压迫')
  assert.equal(resolveVillainOppressionModeByEpisode(2), '权位压迫')
  assert.equal(resolveVillainOppressionModeByEpisode(3), '利益分化')
  assert.equal(resolveVillainOppressionModeByEpisode(4), '借刀杀人')
  assert.equal(resolveVillainOppressionModeByEpisode(5), '规则压迫')
})

test('resolvePayoffTypeByEpisode rotates through 16 types', () => {
  assert.equal(resolvePayoffTypeByEpisode(1), VIRAL_PAYOFF_TYPES[0])
  assert.equal(resolvePayoffTypeByEpisode(16), VIRAL_PAYOFF_TYPES[15])
  assert.equal(resolvePayoffTypeByEpisode(17), VIRAL_PAYOFF_TYPES[0])
})

test('resolvePayoffLevelByEpisode: every 5th is major, last is final', () => {
  assert.equal(resolvePayoffLevelByEpisode(1, 20), 'normal')
  assert.equal(resolvePayoffLevelByEpisode(5, 20), 'major')
  assert.equal(resolvePayoffLevelByEpisode(10, 20), 'major')
  assert.equal(resolvePayoffLevelByEpisode(20, 20), 'final')
})

test('isMajorPayoffType identifies major types', () => {
  assert.equal(isMajorPayoffType('身份碾压'), true)
  assert.equal(isMajorPayoffType('证据打脸'), false)
})

test('resolvePunchlinePatternByEpisode rotates through 4 patterns', () => {
  const p1 = resolvePunchlinePatternByEpisode(1)
  const p2 = resolvePunchlinePatternByEpisode(2)
  const p5 = resolvePunchlinePatternByEpisode(5)
  assert.notEqual(p1.id, p2.id)
  assert.equal(p1.id, p5.id)
})

test('buildSignatureLineSeed returns non-empty seed with binding', () => {
  const seed = buildSignatureLineSeed({
    episodeNo: 1,
    protagonistName: '黎明',
    coreItem: '账册',
    identityAnchor: '第十九徒'
  })
  assert.ok(seed.length > 0)
  assert.ok(seed.includes('账册'))
  assert.ok(seed.includes('第十九徒'))
  assert.ok(seed.includes('15字以内') || seed.includes('字以内'))
})

test('resolveOpeningShockTypeByEpisode: ep1 is 高损失, then rotates', () => {
  assert.equal(resolveOpeningShockTypeByEpisode(1), '高损失')
  assert.equal(resolveOpeningShockTypeByEpisode(2), '高羞辱')
  assert.equal(resolveOpeningShockTypeByEpisode(3), '高危险')
  assert.equal(resolveOpeningShockTypeByEpisode(4), '高反转')
  assert.equal(resolveOpeningShockTypeByEpisode(5), '高损失')
})

test('buildOpeningShockEventFallback returns non-empty direction', () => {
  const event = buildOpeningShockEventFallback({ episodeNo: 1, protagonistName: '黎明' })
  assert.ok(event.length > 0)
  assert.ok(event.includes('黎明'))
})

test('resolveRetentionCliffhangerTypeByEpisode rotates through 6 types', () => {
  assert.equal(resolveRetentionCliffhangerTypeByEpisode(1), '新危机压到眼前')
  assert.equal(resolveRetentionCliffhangerTypeByEpisode(7), '新危机压到眼前')
})

test('buildRetentionCliffhangerFallback returns non-empty direction', () => {
  const text = buildRetentionCliffhangerFallback({ episodeNo: 1 })
  assert.ok(text.length > 0)
  assert.ok(text.includes('强制观众'))
})

test('resolveViralHookTypeByEpisode: first is 入局, last is 收束, 5th is 打脸', () => {
  assert.equal(resolveViralHookTypeByEpisode(1, 20), '入局钩子')
  assert.equal(resolveViralHookTypeByEpisode(20, 20), '收束钩子')
  assert.equal(resolveViralHookTypeByEpisode(5, 20), '打脸钩子')
})

test('VIRAL_QUALITY_THRESHOLDS has openingShock and punchline thresholds', () => {
  assert.ok(VIRAL_QUALITY_THRESHOLDS.openingShock.pass >= 50)
  assert.ok(VIRAL_QUALITY_THRESHOLDS.punchlineDensity.good >= 70)
})
