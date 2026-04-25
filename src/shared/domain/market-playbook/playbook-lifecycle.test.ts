import test from 'node:test'
import assert from 'node:assert/strict'

import type {
  MarketPlaybookDraftDto
} from '../../contracts/market-playbook.ts'
import {
  validateMarketPlaybookBeforeActivation,
  activateMarketPlaybookDraft,
  archiveMarketPlaybook,
  detectMarketPlaybookVersionConflict
} from './playbook-lifecycle.ts'
import { selectDefaultMarketPlaybook, resolveMarketPlaybookSelection } from './market-playbook-registry.ts'

// ============================================================
// 辅助
// ============================================================

function createValidDraft(overrides?: Partial<MarketPlaybookDraftDto>): MarketPlaybookDraftDto {
  return {
    id: 'draft-test-1',
    name: '测试草案',
    sourceSampleIds: ['sample-1'],
    audienceLane: 'male',
    subgenre: '修仙逆袭',
    sourceMonth: '2026-05',
    version: 'v1',
    status: 'draft',
    extractedPatterns: [
      {
        id: 'p1', name: '开局压迫', type: 'opening_pressure',
        description: '测试', appliesTo: { audienceLane: 'male' },
        promptInstruction: '必须有开局压迫', qualitySignal: '读者感到愤怒', examples: []
      },
      {
        id: 'p2', name: '爽点', type: 'payoff',
        description: '测试', appliesTo: { audienceLane: 'male' },
        promptInstruction: '必须有爽点', qualitySignal: '读者感到满足', examples: []
      },
      {
        id: 'p3', name: '钩子', type: 'hook',
        description: '测试', appliesTo: { audienceLane: 'male' },
        promptInstruction: '必须有钩子', qualitySignal: '读者期待后续', examples: []
      }
    ],
    antiPatterns: ['主角太被动'],
    promptRules: ['必须有开局压迫', '必须有爽点', '必须有钩子'],
    qualitySignals: ['读者感到愤怒', '读者感到满足', '读者期待后续'],
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-01T00:00:00Z',
    ...overrides
  }
}

// ============================================================
// 测试
// ============================================================

test('P6: draft 通过校验后可 activate 成 active', () => {
  const draft = createValidDraft()
  const validation = validateMarketPlaybookBeforeActivation({ draft })
  assert.equal(validation.valid, true)
  assert.equal(validation.issues.length, 0)

  const activated = activateMarketPlaybookDraft({ draft, activateAt: '2026-05-01T12:00:00Z' })
  assert.equal(activated.status, 'active')
  assert.equal(activated.name, draft.name)
  assert.equal(activated.audienceLane, 'male')
  assert.equal(activated.subgenre, '修仙逆袭')
  assert.equal(activated.patterns.length, 3)
  assert.equal(activated.antiPatterns.length, 1)
  assert.equal(activated.promptRules.length, 3)
  assert.equal(activated.qualitySignals.length, 3)
  assert.equal(activated.updatedAt, '2026-05-01T12:00:00Z')
})

test('P6: 缺少 patterns 不能 activate', () => {
  const draft = createValidDraft({ extractedPatterns: [] })
  const result = validateMarketPlaybookBeforeActivation({ draft })
  assert.equal(result.valid, false)
  assert.ok(result.issues.some((i) => i.includes('patterns 至少 3')))
})

test('P6: patterns 不足 3 个不能 activate', () => {
  const draft = createValidDraft({
    extractedPatterns: [
      {
        id: 'p1', name: '开局压迫', type: 'opening_pressure',
        description: '测试', appliesTo: {},
        promptInstruction: '必须有开局压迫', qualitySignal: '读者感到愤怒', examples: []
      }
    ]
  })
  const result = validateMarketPlaybookBeforeActivation({ draft })
  assert.equal(result.valid, false)
  assert.ok(result.issues.some((i) => i.includes('patterns 至少 3')))
})

test('P6: 缺少 promptRules 不能 activate', () => {
  const draft = createValidDraft({ promptRules: [] })
  const result = validateMarketPlaybookBeforeActivation({ draft })
  assert.equal(result.valid, false)
  assert.ok(result.issues.some((i) => i.includes('promptRules')))
})

test('P6: 缺少 qualitySignals 不能 activate', () => {
  const draft = createValidDraft({ qualitySignals: [] })
  const result = validateMarketPlaybookBeforeActivation({ draft })
  assert.equal(result.valid, false)
  assert.ok(result.issues.some((i) => i.includes('qualitySignals')))
})

test('P6: pattern 缺 promptInstruction 不能 activate', () => {
  const draft = createValidDraft({
    extractedPatterns: [
      {
        id: 'p1', name: '开局压迫', type: 'opening_pressure',
        description: '测试', appliesTo: {},
        promptInstruction: '', qualitySignal: '读者感到愤怒', examples: []
      },
      {
        id: 'p2', name: '爽点', type: 'payoff',
        description: '测试', appliesTo: {},
        promptInstruction: '必须有爽点', qualitySignal: '读者感到满足', examples: []
      },
      {
        id: 'p3', name: '钩子', type: 'hook',
        description: '测试', appliesTo: {},
        promptInstruction: '必须有钩子', qualitySignal: '读者期待后续', examples: []
      }
    ]
  })
  const result = validateMarketPlaybookBeforeActivation({ draft })
  assert.equal(result.valid, false)
  assert.ok(result.issues.some((i) => i.includes('promptInstruction')))
})

test('P6: pattern 缺 qualitySignal 不能 activate', () => {
  const draft = createValidDraft({
    extractedPatterns: [
      {
        id: 'p1', name: '开局压迫', type: 'opening_pressure',
        description: '测试', appliesTo: {},
        promptInstruction: '必须有开局压迫', qualitySignal: '', examples: []
      },
      {
        id: 'p2', name: '爽点', type: 'payoff',
        description: '测试', appliesTo: {},
        promptInstruction: '必须有爽点', qualitySignal: '读者感到满足', examples: []
      },
      {
        id: 'p3', name: '钩子', type: 'hook',
        description: '测试', appliesTo: {},
        promptInstruction: '必须有钩子', qualitySignal: '读者期待后续', examples: []
      }
    ]
  })
  const result = validateMarketPlaybookBeforeActivation({ draft })
  assert.equal(result.valid, false)
  assert.ok(result.issues.some((i) => i.includes('qualitySignal')))
})

test('P6: 同 lane/subgenre/month/version 冲突会报错', () => {
  const draft = createValidDraft({
    audienceLane: 'male',
    subgenre: '修仙逆袭',
    sourceMonth: '2026-04',
    version: 'v1'
  })

  // 内置已有 male/修仙逆袭/2026-04/v1
  const result = validateMarketPlaybookBeforeActivation({ draft })
  assert.equal(result.valid, false)
  assert.ok(result.issues.some((i) => i.includes('version_conflict')))
})

test('P6: 同 lane 不同 subgenre 不冲突', () => {
  const draft = createValidDraft({
    audienceLane: 'male',
    subgenre: '都市逆袭',
    sourceMonth: '2026-04',
    version: 'v1'
  })

  const result = validateMarketPlaybookBeforeActivation({ draft })
  assert.equal(result.valid, true)
})

test('P6: active playbook 可 archived', () => {
  const draft = createValidDraft({
    id: 'draft-archive-test',
    audienceLane: 'female',
    subgenre: '古言宅斗',
    sourceMonth: '2026-05',
    version: 'v1'
  })

  const activated = activateMarketPlaybookDraft({ draft })
  assert.equal(activated.status, 'active')

  const archived = archiveMarketPlaybook({
    playbook: activated,
    archivedAt: '2026-05-15T00:00:00Z'
  })
  assert.equal(archived.status, 'archived')
  assert.equal(archived.updatedAt, '2026-05-15T00:00:00Z')
  // 其他字段不变
  assert.equal(archived.name, activated.name)
  assert.equal(archived.patterns.length, activated.patterns.length)
})

test('P6: archived playbook 不影响 locked 老项目 resolve', () => {
  // 模拟：老项目 locked 到一个 playbook，后来该 playbook 被 archived
  const existingSelection = {
    selectedPlaybookId: 'market-2026-04-male-xiuxian-v1',
    selectionMode: 'locked' as const,
    lockedAt: '2026-04-20T00:00:00Z',
    selectedVersion: 'v1',
    selectedSourceMonth: '2026-04'
  }

  // resolveMarketPlaybookSelection 通过 ID 查找，不管 status
  const result = resolveMarketPlaybookSelection({
    audienceLane: 'male',
    subgenre: '修仙逆袭',
    existingSelection
  })

  assert.equal(result.reason, 'existing_locked')
  assert.ok(result.playbook !== null)
  assert.equal(result.playbook?.id, 'market-2026-04-male-xiuxian-v1')
})

test('P6: draft 不会被 selectDefaultMarketPlaybook 选中', () => {
  // selectDefaultMarketPlaybook 只返回 status === 'active'
  // draft status 是 'draft'，不在 BUILT_IN_PLAYBOOKS 中
  const result = selectDefaultMarketPlaybook({
    audienceLane: 'male',
    subgenre: '修仙逆袭'
  })

  // 只会返回内置 active playbook，不会返回任何 draft
  if (result) {
    assert.equal(result.status, 'active')
  }
})

test('P6: detectMarketPlaybookVersionConflict 检测冲突', () => {
  // 内置已有 male/修仙逆袭/2026-04/v1
  const conflict = detectMarketPlaybookVersionConflict({
    audienceLane: 'male',
    subgenre: '修仙逆袭',
    sourceMonth: '2026-04',
    version: 'v1'
  })
  assert.equal(conflict, true)

  // 不同 version 不冲突
  const noConflict = detectMarketPlaybookVersionConflict({
    audienceLane: 'male',
    subgenre: '修仙逆袭',
    sourceMonth: '2026-04',
    version: 'v2'
  })
  assert.equal(noConflict, false)
})

test('P6: 校验 name 不能为空', () => {
  const draft = createValidDraft({ name: '' })
  const result = validateMarketPlaybookBeforeActivation({ draft })
  assert.equal(result.valid, false)
  assert.ok(result.issues.some((i) => i.includes('name')))
})

test('P6: 校验 sourceMonth 格式', () => {
  const draft = createValidDraft({ sourceMonth: '202605' })
  const result = validateMarketPlaybookBeforeActivation({ draft })
  assert.equal(result.valid, false)
  assert.ok(result.issues.some((i) => i.includes('sourceMonth')))
})

test('P6: activate 保留 draft 的 id 和 createdAt', () => {
  const draft = createValidDraft({
    id: 'my-draft-id',
    createdAt: '2026-05-01T00:00:00Z'
  })

  const activated = activateMarketPlaybookDraft({ draft, activateAt: '2026-05-10T00:00:00Z' })
  assert.equal(activated.id, 'my-draft-id')
  assert.equal(activated.createdAt, '2026-05-01T00:00:00Z')
  assert.equal(activated.updatedAt, '2026-05-10T00:00:00Z')
})
