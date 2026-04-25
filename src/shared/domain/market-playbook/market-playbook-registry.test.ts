import test from 'node:test'
import assert from 'node:assert/strict'
import type { MarketPlaybookDto } from '../../contracts/market-playbook.ts'

import {
  getActiveMarketPlaybooks,
  getMarketPlaybookById,
  selectDefaultMarketPlaybook,
  resolveMarketPlaybookSelection
} from './market-playbook-registry.ts'

test('MarketPlaybook: active playbook 能被读到', () => {
  const all = getActiveMarketPlaybooks()
  assert.ok(all.length >= 2, `至少应有 2 个 active playbook，实际 ${all.length}`)
  assert.ok(all.every((p) => p.status === 'active'))
})

test('MarketPlaybook: archived playbook 不返回', () => {
  const all = getActiveMarketPlaybooks()
  assert.ok(all.every((p) => p.status !== 'archived'))
  // 也确认 draft 不返回
  assert.ok(all.every((p) => p.status !== 'draft'))
})

test('MarketPlaybook: 按 audienceLane 过滤正确', () => {
  const male = getActiveMarketPlaybooks({ audienceLane: 'male' })
  const female = getActiveMarketPlaybooks({ audienceLane: 'female' })

  assert.ok(male.length >= 1)
  assert.ok(male.every((p) => p.audienceLane === 'male'))

  assert.ok(female.length >= 1)
  assert.ok(female.every((p) => p.audienceLane === 'female'))
})

test('MarketPlaybook: 男频不会拿到女频打法包', () => {
  const male = getActiveMarketPlaybooks({ audienceLane: 'male' })
  assert.ok(
    male.every((p) => p.audienceLane === 'male'),
    '男频结果中不应有女频打法包'
  )
  assert.ok(
    male.every((p) => p.audienceLane !== 'female'),
    '男频结果中不应出现 female lane'
  )
})

test('MarketPlaybook: subgenre 精确匹配优先', () => {
  const result = selectDefaultMarketPlaybook({
    audienceLane: 'male',
    subgenre: '修仙逆袭'
  })
  assert.ok(result !== null)
  assert.equal(result?.subgenre, '修仙逆袭')
  assert.equal(result?.audienceLane, 'male')
})

test('MarketPlaybook: 没有精确 subgenre 时返回同 lane 通用打法包', () => {
  // 请求一个不存在的 subgenre，应回退到同 lane 的第一个 active
  const result = selectDefaultMarketPlaybook({
    audienceLane: 'female',
    subgenre: '不存在的子类型'
  })
  assert.ok(result !== null, '应回退到同 lane 的 active 打法包')
  assert.equal(result?.audienceLane, 'female')
})

test('MarketPlaybook: getMarketPlaybookById 找不到返回 null', () => {
  const result = getMarketPlaybookById('non-existent-id')
  assert.equal(result, null)
})

test('MarketPlaybook: getMarketPlaybookById 能读取自定义打法包', () => {
  const custom = createCustomPlaybook()

  const result = getMarketPlaybookById(custom.id, { customPlaybooks: [custom] })

  assert.equal(result?.id, custom.id)
  assert.equal(result?.summary, '自定义打法包摘要')
})

test('MarketPlaybook: getMarketPlaybookById 能找到内置打法包', () => {
  const male = getMarketPlaybookById('market-2026-04-male-xiuxian-v1')
  assert.ok(male !== null)
  assert.equal(male?.audienceLane, 'male')
  assert.equal(male?.subgenre, '修仙逆袭')

  const female = getMarketPlaybookById('market-2026-04-female-ceo-v1')
  assert.ok(female !== null)
  assert.equal(female?.audienceLane, 'female')
  assert.equal(female?.subgenre, '霸总甜宠')
})

test('MarketPlaybook: selectDefaultMarketPlaybook 能选最新 active 版本', () => {
  const result = selectDefaultMarketPlaybook({
    audienceLane: 'male',
    subgenre: '修仙逆袭'
  })
  assert.ok(result !== null)
  assert.equal(result?.status, 'active')
  assert.equal(result?.version, 'v1')
})

test('MarketPlaybook: selectDefaultMarketPlaybook 优先选择同垂类最新自定义 active', () => {
  const oldCustom = createCustomPlaybook({
    id: 'custom-old',
    sourceMonth: '2026-05',
    version: 'v1',
    updatedAt: '2026-05-01T00:00:00Z'
  })
  const newCustom = createCustomPlaybook({
    id: 'custom-new',
    sourceMonth: '2026-06',
    version: 'v2',
    updatedAt: '2026-06-01T00:00:00Z'
  })

  const result = selectDefaultMarketPlaybook({
    audienceLane: 'male',
    subgenre: '男频玄幻修仙',
    customPlaybooks: [oldCustom, newCustom]
  })

  assert.equal(result?.id, 'custom-new')
})

test('MarketPlaybook: selectDefaultMarketPlaybook 不允许跨性别 fallback', () => {
  // 请求 male + 不存在的 subgenre，不应返回 female 的打法包
  const result = selectDefaultMarketPlaybook({
    audienceLane: 'male',
    subgenre: '不存在的子类型'
  })
  if (result) {
    assert.equal(result.audienceLane, 'male', '不应 fallback 到 female lane')
  }
})

test('MarketPlaybook: 男频修仙打法包内容完整', () => {
  const playbook = getMarketPlaybookById('market-2026-04-male-xiuxian-v1')
  assert.ok(playbook)
  assert.ok(playbook.patterns.length >= 6, `至少 6 个 pattern，实际 ${playbook.patterns.length}`)
  assert.ok(playbook.antiPatterns.length >= 1)
  assert.ok(playbook.promptRules.length >= 1)
  assert.ok(playbook.qualitySignals.length >= 1)

  // 检查关键 pattern 类型
  const patternTypes = playbook.patterns.map((p) => p.type)
  assert.ok(patternTypes.includes('opening_pressure'), '应包含开局压迫')
  assert.ok(patternTypes.includes('payoff'), '应包含爽点')
  assert.ok(patternTypes.includes('villain_pressure'), '应包含反派压迫')
  assert.ok(patternTypes.includes('protagonist_action'), '应包含主角行动')
})

test('MarketPlaybook: 女频霸总打法包内容完整', () => {
  const playbook = getMarketPlaybookById('market-2026-04-female-ceo-v1')
  assert.ok(playbook)
  assert.ok(playbook.patterns.length >= 6, `至少 6 个 pattern，实际 ${playbook.patterns.length}`)
  assert.ok(playbook.antiPatterns.length >= 1)
  assert.ok(playbook.promptRules.length >= 1)
  assert.ok(playbook.qualitySignals.length >= 1)

  // 检查关键 pattern 类型
  const patternTypes = playbook.patterns.map((p) => p.type)
  assert.ok(patternTypes.includes('relationship_tension'), '应包含关系压迫')
  assert.ok(patternTypes.includes('hook'), '应包含身份误解')
  assert.ok(patternTypes.includes('payoff'), '应包含情绪补偿')
})

// ============================================================
// resolveMarketPlaybookSelection 测试
// ============================================================

test('resolveMarketPlaybookSelection: 新项目自动选 latest active (auto_latest)', () => {
  const result = resolveMarketPlaybookSelection({
    audienceLane: 'male',
    subgenre: '修仙逆袭'
  })
  assert.equal(result.reason, 'auto_latest')
  assert.ok(result.playbook !== null)
  assert.equal(result.playbook?.audienceLane, 'male')
  assert.equal(result.playbook?.subgenre, '修仙逆袭')
  assert.ok(result.selection !== null)
  assert.equal(result.selection?.selectionMode, 'locked')
  assert.equal(result.selection?.selectedPlaybookId, result.playbook?.id)
  assert.ok(result.selection?.lockedAt, 'lockedAt 应被记录')
  assert.ok(result.selection?.selectedVersion, 'selectedVersion 应被记录')
  assert.ok(result.selection?.selectedSourceMonth, 'selectedSourceMonth 应被记录')
})

test('resolveMarketPlaybookSelection: 已锁定的 playbook 优先返回 (existing_locked)', () => {
  const existingSelection = {
    selectedPlaybookId: 'market-2026-04-male-xiuxian-v1',
    selectionMode: 'locked' as const,
    lockedAt: '2026-04-20T00:00:00Z',
    selectedVersion: 'v1',
    selectedSourceMonth: '2026-04'
  }
  const result = resolveMarketPlaybookSelection({
    audienceLane: 'male',
    subgenre: '修仙逆袭',
    existingSelection
  })
  assert.equal(result.reason, 'existing_locked')
  assert.ok(result.playbook !== null)
  assert.equal(result.playbook?.id, 'market-2026-04-male-xiuxian-v1')
  assert.deepEqual(result.selection, existingSelection)
})

test('resolveMarketPlaybookSelection: 手动选择的 playbook 返回 (manual_selected)', () => {
  const existingSelection = {
    selectedPlaybookId: 'market-2026-04-female-ceo-v1',
    selectionMode: 'manual' as const,
    selectedVersion: 'v1',
    selectedSourceMonth: '2026-04'
  }
  const result = resolveMarketPlaybookSelection({
    audienceLane: 'female',
    subgenre: '霸总甜宠',
    existingSelection
  })
  assert.equal(result.reason, 'manual_selected')
  assert.ok(result.playbook !== null)
  assert.equal(result.playbook?.id, 'market-2026-04-female-ceo-v1')
})

test('resolveMarketPlaybookSelection: 手动选择自定义 playbook 返回 manual_selected', () => {
  const custom = createCustomPlaybook()

  const result = resolveMarketPlaybookSelection({
    audienceLane: 'male',
    subgenre: '男频玄幻修仙',
    customPlaybooks: [custom],
    existingSelection: {
      selectedPlaybookId: custom.id,
      selectionMode: 'manual',
      selectedVersion: custom.version,
      selectedSourceMonth: custom.sourceMonth
    }
  })

  assert.equal(result.reason, 'manual_selected')
  assert.equal(result.playbook?.id, custom.id)
})

test('resolveMarketPlaybookSelection: archived 但已锁定的 playbook 仍然返回', () => {
  // 即使 playbook 将来被 archived，已锁定的项目也必须能继续使用
  const existingSelection = {
    selectedPlaybookId: 'market-2026-04-male-xiuxian-v1',
    selectionMode: 'locked' as const,
    lockedAt: '2026-04-20T00:00:00Z',
    selectedVersion: 'v1',
    selectedSourceMonth: '2026-04'
  }
  const result = resolveMarketPlaybookSelection({
    audienceLane: 'male',
    subgenre: '修仙逆袭',
    existingSelection
  })
  // 当前 playbook 是 active，但即使将来 archived，只要 ID 能找到就返回
  assert.ok(result.playbook !== null, '已锁定的 playbook 不应因状态变化而丢失')
  assert.equal(result.reason, 'existing_locked')
})

test('resolveMarketPlaybookSelection: 找不到 playbook 返回 not_found', () => {
  const existingSelection = {
    selectedPlaybookId: 'non-existent-playbook-id',
    selectionMode: 'locked' as const
  }
  const result = resolveMarketPlaybookSelection({
    audienceLane: 'male',
    subgenre: '修仙逆袭',
    existingSelection
  })
  assert.equal(result.reason, 'not_found')
  assert.equal(result.playbook, null)
  assert.deepEqual(result.selection, existingSelection)
})

test('resolveMarketPlaybookSelection: 跨 audienceLane 选择被阻止', () => {
  // 项目是 male lane，但 existingSelection 指向 female playbook
  const existingSelection = {
    selectedPlaybookId: 'market-2026-04-female-ceo-v1',
    selectionMode: 'locked' as const,
    selectedVersion: 'v1',
    selectedSourceMonth: '2026-04'
  }
  const result = resolveMarketPlaybookSelection({
    audienceLane: 'male',
    subgenre: '修仙逆袭',
    existingSelection
  })
  assert.equal(result.reason, 'not_found')
  assert.equal(result.playbook, null, '不应跨 lane 返回 female playbook')
})

test('resolveMarketPlaybookSelection: auto_latest 记录 version/sourceMonth/lockedAt', () => {
  const result = resolveMarketPlaybookSelection({
    audienceLane: 'female',
    subgenre: '霸总甜宠'
  })
  assert.equal(result.reason, 'auto_latest')
  assert.ok(result.selection)
  assert.equal(result.selection?.selectedVersion, 'v1')
  assert.equal(result.selection?.selectedSourceMonth, '2026-04')
  assert.ok(result.selection?.lockedAt, 'lockedAt 应记录当前时间')
  // lockedAt 应该是 ISO 时间字符串
  assert.ok(
    !isNaN(Date.parse(result.selection?.lockedAt ?? '')),
    'lockedAt 应为有效的 ISO 时间'
  )
})

function createCustomPlaybook(overrides: Partial<MarketPlaybookDto> = {}): MarketPlaybookDto {
  return {
    id: 'custom-market-2026-06-male-xuanhuan-v1',
    name: '自定义玄幻修仙打法包',
    audienceLane: 'male',
    subgenre: '男频玄幻修仙',
    sourceMonth: '2026-06',
    version: 'v1',
    status: 'active',
    summary: '自定义打法包摘要',
    patterns: [
      {
        id: 'custom-opening',
        name: '自定义开局压迫',
        type: 'opening_pressure',
        description: '自定义开局压迫说明',
        appliesTo: { audienceLane: 'male', subgenre: '男频玄幻修仙' },
        promptInstruction: '必须写出强压迫开局。',
        qualitySignal: '前3集有明确压迫感。',
        examples: ['公开羞辱']
      }
    ],
    antiPatterns: ['不要平铺直叙'],
    promptRules: ['开局必须有强冲突'],
    qualitySignals: ['读者能感到压迫'],
    createdAt: '2026-06-01T00:00:00Z',
    updatedAt: '2026-06-01T00:00:00Z',
    ...overrides
  }
}
