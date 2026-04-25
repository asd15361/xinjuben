import test from 'node:test'
import assert from 'node:assert/strict'

import type { MarketPlaybookDto, MarketPatternDto } from '../../contracts/market-playbook.ts'
import {
  buildMarketPlaybookPromptBlock,
  resolveProjectMarketPlaybook
} from './playbook-prompt-block.ts'

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
    qualitySignal: `信号${i}`,
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
    antiPatterns: ['反模式1', '反模式2', '反模式3'],
    promptRules: ['规则1', '规则2', '规则3'],
    qualitySignals: ['信号1'],
    createdAt: '2026-04-25T00:00:00Z',
    updatedAt: '2026-04-25T00:00:00Z',
    ...overrides
  }
}

// ============================================================
// buildMarketPlaybookPromptBlock 测试
// ============================================================

test('P8: 空 playbook 返回空字符串', () => {
  assert.equal(buildMarketPlaybookPromptBlock({ playbook: null, stage: 'seven_questions' }), '')
  assert.equal(buildMarketPlaybookPromptBlock({ playbook: undefined, stage: 'script_skeleton' }), '')
})

test('P8: block 包含"不覆盖稳定内核"', () => {
  const playbook = createTestPlaybook()
  const block = buildMarketPlaybookPromptBlock({ playbook, stage: 'seven_questions' })
  assert.ok(block.includes('不能覆盖稳定创作内核'))
  assert.ok(block.includes('用户设定'))
  assert.ok(block.includes('已锁定七问'))
})

test('P8: seven_questions stage 包含开局压迫/钩子/反派递进', () => {
  const playbook = createTestPlaybook({
    patterns: [
      { ...createTestPatterns(1)[0], type: 'opening_pressure', name: '废体受辱' },
      { ...createTestPatterns(1)[0], id: 'p2', type: 'hook', name: '身份误解' },
      { ...createTestPatterns(1)[0], id: 'p3', type: 'villain_pressure', name: '长老追杀' },
      { ...createTestPatterns(1)[0], id: 'p4', type: 'payoff', name: '打脸' }
    ]
  })
  const block = buildMarketPlaybookPromptBlock({ playbook, stage: 'seven_questions' })
  assert.ok(block.includes('七问阶段'))
  assert.ok(block.includes('废体受辱'))
  assert.ok(block.includes('身份误解'))
  assert.ok(block.includes('长老追杀'))
})

test('P8: script_skeleton stage 包含每5集爽点/底牌释放/反派递进', () => {
  const playbook = createTestPlaybook({
    patterns: [
      { ...createTestPatterns(1)[0], type: 'payoff', name: '第5集打脸', promptInstruction: '每5集大爽点' },
      { ...createTestPatterns(1)[0], id: 'p2', type: 'protagonist_action', name: '底牌释放', promptInstruction: '前50%隐忍' },
      { ...createTestPatterns(1)[0], id: 'p3', type: 'villain_pressure', name: '反派递进', promptInstruction: '逐级递进' }
    ]
  })
  const block = buildMarketPlaybookPromptBlock({ playbook, stage: 'script_skeleton' })
  assert.ok(block.includes('剧本骨架阶段'))
  assert.ok(block.includes('第5集打脸'))
  assert.ok(block.includes('前50%隐忍'))
  assert.ok(block.includes('反派递进'))
})

test('P8: episode_script stage 包含反派压迫/主角反击/爽点兑现', () => {
  const playbook = createTestPlaybook({
    patterns: [
      { ...createTestPatterns(1)[0], type: 'villain_pressure', name: '规则压迫', promptInstruction: '用规则卡死' },
      { ...createTestPatterns(1)[0], id: 'p2', type: 'protagonist_action', name: '装弱反击', promptInstruction: '表面退让后反咬' },
      { ...createTestPatterns(1)[0], id: 'p3', type: 'payoff', name: '当众打脸', promptInstruction: '反派实质损失' },
      { ...createTestPatterns(1)[0], id: 'p4', type: 'hook', name: '集尾钩子', promptInstruction: '新危机压到眼前' }
    ]
  })
  const block = buildMarketPlaybookPromptBlock({ playbook, stage: 'episode_script' })
  assert.ok(block.includes('剧本阶段'))
  assert.ok(block.includes('用规则卡死'))
  assert.ok(block.includes('表面退让后反咬'))
  assert.ok(block.includes('反派实质损失'))
  assert.ok(block.includes('新危机压到眼前'))
})

test('P8: patterns 超过 6 条会截断', () => {
  const playbook = createTestPlaybook({ patterns: createTestPatterns(10) })
  const block = buildMarketPlaybookPromptBlock({ playbook, stage: 'seven_questions' })
  // 【关键模式】部分只输出前 6 条的 promptInstruction
  const keyPatternSection = block.split('【关键模式】')[1]?.split('【必须避免】')[0] || ''
  assert.ok(keyPatternSection.includes('指令0'))
  assert.ok(keyPatternSection.includes('指令5'))
  assert.ok(!keyPatternSection.includes('指令6'))
  assert.ok(!keyPatternSection.includes('指令9'))
})

test('P8: antiPatterns/promptRules 超过限制会截断', () => {
  const playbook = createTestPlaybook({
    antiPatterns: ['反1', '反2', '反3', '反4', '反5', '反6', '反7'],
    promptRules: ['规1', '规2', '规3', '规4', '规5', '规6', '规7']
  })
  const block = buildMarketPlaybookPromptBlock({ playbook, stage: 'seven_questions' })
  // antiPatterns 只保留 5 条
  assert.ok(block.includes('反1'))
  assert.ok(block.includes('反5'))
  assert.ok(!block.includes('反6'))
  assert.ok(!block.includes('反7'))
  // promptRules 只保留 5 条
  assert.ok(block.includes('规1'))
  assert.ok(block.includes('规5'))
  assert.ok(!block.includes('规6'))
  assert.ok(!block.includes('规7'))
})

// ============================================================
// resolveProjectMarketPlaybook 测试
// ============================================================

test('P8: resolveProjectMarketPlaybook 有 selection 时返回锁定的 playbook', () => {
  const result = resolveProjectMarketPlaybook({
    marketPlaybookSelection: {
      selectedPlaybookId: 'market-2026-04-male-xiuxian-v1',
      selectionMode: 'locked'
    }
  })
  assert.ok(result)
  assert.equal(result!.id, 'market-2026-04-male-xiuxian-v1')
})

test('P8: resolveProjectMarketPlaybook 无 selection 时自动选', () => {
  const result = resolveProjectMarketPlaybook({
    audienceLane: 'male',
    subgenre: '修仙逆袭'
  })
  assert.ok(result)
  assert.equal(result!.id, 'market-2026-04-male-xiuxian-v1')
})

test('P8: resolveProjectMarketPlaybook 找不到时返回 null', () => {
  const result = resolveProjectMarketPlaybook({
    audienceLane: 'male',
    subgenre: '不存在的垂类'
  })
  // male lane 有 fallback
  assert.ok(result)
  // 但如果 audienceLane 也没有匹配的
  const result2 = resolveProjectMarketPlaybook({})
  assert.equal(result2, null)
})
