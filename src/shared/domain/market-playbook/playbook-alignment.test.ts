import test from 'node:test'
import assert from 'node:assert/strict'

import type { MarketPlaybookDto, MarketPatternDto } from '../../contracts/market-playbook.ts'
import { inspectPlaybookAlignment } from './playbook-alignment.ts'

// ============================================================
// 测试辅助
// ============================================================

function createTestPatterns(count: number): MarketPatternDto[] {
  const types: MarketPatternDto['type'][] = [
    'opening_pressure',
    'payoff',
    'hook',
    'villain_pressure',
    'protagonist_action',
    'relationship_tension',
    'prop_usage',
    'dialogue_style'
  ]
  return Array.from({ length: count }, (_, i) => ({
    id: `pattern-${i}`,
    name: `模式${i}`,
    type: types[i % types.length],
    description: `描述${i}`,
    appliesTo: { audienceLane: 'male' as const, subgenre: '测试' },
    promptInstruction: `指令${i}`,
    qualitySignal: `读者必须在前${i + 1}集感受到${i % 2 === 0 ? '愤怒' : '爽感'}`,
    examples: []
  }))
}

function createTestPlaybook(overrides?: Partial<MarketPlaybookDto>): MarketPlaybookDto {
  return {
    id: 'test-playbook-v1',
    name: '测试打法包 v1',
    audienceLane: 'male',
    subgenre: '测试',
    sourceMonth: '2026-04',
    version: 'v1',
    status: 'active',
    summary: '测试打法包摘要',
    patterns: createTestPatterns(6),
    antiPatterns: ['反模式1'],
    promptRules: ['规则1'],
    qualitySignals: ['信号1'],
    createdAt: '2026-04-25T00:00:00Z',
    updatedAt: '2026-04-25T00:00:00Z',
    ...overrides
  }
}

// ============================================================
// inspectPlaybookAlignment 测试
// ============================================================

test('P9: 无 playbook 时返回 null', () => {
  assert.equal(inspectPlaybookAlignment({ text: '测试文本', playbook: null }), null)
  assert.equal(inspectPlaybookAlignment({ text: '测试文本', playbook: undefined }), null)
})

test('P9: 空 patterns 返回 null', () => {
  const playbook = createTestPlaybook({ patterns: [] })
  assert.equal(inspectPlaybookAlignment({ text: '测试文本', playbook }), null)
})

test('P9: 文本命中 qualitySignal 时 matchedSignals 有值', () => {
  const playbook = createTestPlaybook({
    patterns: [
      { ...createTestPatterns(1)[0], qualitySignal: '读者必须感受到愤怒感' },
      { ...createTestPatterns(1)[0], id: 'p2', qualitySignal: '读者必须看到打脸场面' }
    ]
  })
  const result = inspectPlaybookAlignment({
    text: '主角当众被羞辱，读者必须感受到愤怒感，他咬紧牙关隐忍',
    playbook
  })
  assert.ok(result)
  assert.ok(result!.matchedSignals.length >= 1)
  assert.ok(result!.matchedSignals.some((s) => s.includes('愤怒感')))
})

test('P9: 文本未命中时 missingSignals 有值', () => {
  const playbook = createTestPlaybook({
    patterns: [
      { ...createTestPatterns(1)[0], qualitySignal: '读者必须看到当众打脸的场面' }
    ]
  })
  const result = inspectPlaybookAlignment({
    text: '主角安静地在房间里修炼，没有任何冲突发生',
    playbook
  })
  assert.ok(result)
  assert.ok(result!.missingSignals.length >= 1)
  assert.ok(result!.missingSignals.some((s) => s.includes('打脸')))
})

test('P9: score 按 matched/total 计算', () => {
  const playbook = createTestPlaybook({
    patterns: [
      { ...createTestPatterns(1)[0], qualitySignal: '愤怒感爆发' },
      { ...createTestPatterns(1)[0], id: 'p2', qualitySignal: '爽感爆发' },
      { ...createTestPatterns(1)[0], id: 'p3', qualitySignal: '紧张氛围蔓延' }
    ]
  })
  // 只命中"愤怒感爆发"和"爽感爆发"，miss "紧张氛围蔓延"
  const result = inspectPlaybookAlignment({
    text: '他愤怒感爆发，随即感到一阵爽感爆发',
    playbook
  })
  assert.ok(result)
  // 2/3 ≈ 67
  assert.equal(result!.score, 67)
  assert.equal(result!.matchedSignals.length, 2)
  assert.equal(result!.missingSignals.length, 1)
})

test('P9: 只取前 6 条 patterns', () => {
  const patterns = createTestPatterns(10)
  // 让所有 qualitySignal 都能被匹配
  const playbook = createTestPlaybook({
    patterns: patterns.map((p) => ({
      ...p,
      qualitySignal: '愤怒感'
    }))
  })
  const result = inspectPlaybookAlignment({
    text: '他充满了愤怒感，要复仇',
    playbook
  })
  assert.ok(result)
  // 应该只有 6 条被检测（MAX_ALIGNMENT_PATTERNS = 6）
  assert.equal(result!.matchedSignals.length + result!.missingSignals.length, 6)
})

test('P9: 返回正确的 playbook 元信息', () => {
  const playbook = createTestPlaybook({
    id: 'market-2026-04-male-xiuxian-v1',
    version: 'v2',
    sourceMonth: '2026-03',
    patterns: [{ ...createTestPatterns(1)[0], qualitySignal: '愤怒感' }]
  })
  const result = inspectPlaybookAlignment({
    text: '他愤怒了',
    playbook
  })
  assert.ok(result)
  assert.equal(result!.playbookId, 'market-2026-04-male-xiuxian-v1')
  assert.equal(result!.version, 'v2')
  assert.equal(result!.sourceMonth, '2026-03')
})

test('P9: qualitySignal 为空的 pattern 被跳过并记录 note', () => {
  const playbook = createTestPlaybook({
    patterns: [
      { ...createTestPatterns(1)[0], qualitySignal: '' },
      { ...createTestPatterns(1)[0], id: 'p2', qualitySignal: '愤怒感' }
    ]
  })
  const result = inspectPlaybookAlignment({
    text: '他愤怒了',
    playbook
  })
  assert.ok(result)
  assert.equal(result!.matchedSignals.length + result!.missingSignals.length, 1)
  assert.ok(result!.notes.length >= 1)
  assert.ok(result!.notes[0].includes('无 qualitySignal'))
})

test('P9: 全部命中时 score 为 100', () => {
  const playbook = createTestPlaybook({
    patterns: [
      { ...createTestPatterns(1)[0], qualitySignal: '愤怒' },
      { ...createTestPatterns(1)[0], id: 'p2', qualitySignal: '爽感' }
    ]
  })
  const result = inspectPlaybookAlignment({
    text: '他充满了愤怒，随即感到一阵爽感',
    playbook
  })
  assert.ok(result)
  assert.equal(result!.score, 100)
  assert.equal(result!.matchedSignals.length, 2)
  assert.equal(result!.missingSignals.length, 0)
})

test('P9: 全部未命中时 score 为 0', () => {
  const playbook = createTestPlaybook({
    patterns: [
      { ...createTestPatterns(1)[0], qualitySignal: '当众打脸的快感' },
      { ...createTestPatterns(1)[0], id: 'p2', qualitySignal: '身份揭晓的震撼' }
    ]
  })
  const result = inspectPlaybookAlignment({
    text: '今天天气很好，小明去散步了',
    playbook
  })
  assert.ok(result)
  assert.equal(result!.score, 0)
  assert.equal(result!.matchedSignals.length, 0)
  assert.equal(result!.missingSignals.length, 2)
})
