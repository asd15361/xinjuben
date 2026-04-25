import test from 'node:test'
import assert from 'node:assert/strict'

import { mapProjectSummary, mapProjectSnapshot } from './project-snapshot-mapper.ts'
import type { ProjectRecordShape, ProjectStageRecordsShape } from './project-snapshot-mapper.ts'

function createBaseRecord(overrides?: Partial<ProjectRecordShape>): ProjectRecordShape {
  return {
    id: 'proj-1',
    name: '测试项目',
    workflowType: 'ai_write',
    stage: 'chat',
    genre: '玄幻',
    updated: '2026-04-25T00:00:00Z',
    ...overrides
  }
}

function createEmptyStages(): ProjectStageRecordsShape {
  return {}
}

// ============================================================
// marketPlaybookSelectionJson 解析测试
// ============================================================

test('mapper: marketPlaybookSelectionJson 有值时正确解析到 summary', () => {
  const record = createBaseRecord({
    marketPlaybookSelectionJson: JSON.stringify({
      selectedPlaybookId: 'market-2026-04-male-xiuxian-v1',
      selectionMode: 'locked',
      lockedAt: '2026-04-25T00:00:00Z',
      selectedVersion: 'v1',
      selectedSourceMonth: '2026-04'
    })
  })

  const summary = mapProjectSummary(record)
  assert.ok(summary.marketPlaybookSelection)
  assert.equal(summary.marketPlaybookSelection?.selectedPlaybookId, 'market-2026-04-male-xiuxian-v1')
  assert.equal(summary.marketPlaybookSelection?.selectionMode, 'locked')
  assert.equal(summary.marketPlaybookSelection?.selectedVersion, 'v1')
  assert.equal(summary.marketPlaybookSelection?.selectedSourceMonth, '2026-04')
})

test('mapper: marketPlaybookSelectionJson 缺失时返回 null', () => {
  const record = createBaseRecord({
    marketPlaybookSelectionJson: undefined
  })

  const summary = mapProjectSummary(record)
  assert.equal(summary.marketPlaybookSelection, null)
})

test('mapper: marketPlaybookSelectionJson 为 null 时返回 null', () => {
  const record = createBaseRecord({
    marketPlaybookSelectionJson: null
  })

  const summary = mapProjectSummary(record)
  assert.equal(summary.marketPlaybookSelection, null)
})

test('mapper: marketPlaybookSelectionJson 在 snapshot 中正确解析', () => {
  const record = createBaseRecord({
    marketPlaybookSelectionJson: JSON.stringify({
      selectedPlaybookId: 'market-2026-04-female-ceo-v1',
      selectionMode: 'manual',
      selectedVersion: 'v1',
      selectedSourceMonth: '2026-04'
    })
  })

  const snapshot = mapProjectSnapshot(record, createEmptyStages())
  assert.ok(snapshot.marketPlaybookSelection)
  assert.equal(snapshot.marketPlaybookSelection?.selectedPlaybookId, 'market-2026-04-female-ceo-v1')
  assert.equal(snapshot.marketPlaybookSelection?.selectionMode, 'manual')
})

test('mapper: marketPlaybookSelectionJson 非法 JSON 时返回 null', () => {
  const record = createBaseRecord({
    marketPlaybookSelectionJson: '{invalid json!!!'
  })

  const summary = mapProjectSummary(record)
  assert.equal(summary.marketPlaybookSelection, null)
})

test('mapper: marketPlaybookSelectionJson 和 marketProfileJson 独立解析', () => {
  const record = createBaseRecord({
    marketProfileJson: JSON.stringify({
      audienceLane: 'male',
      subgenre: '修仙逆袭'
    }),
    marketPlaybookSelectionJson: JSON.stringify({
      selectedPlaybookId: 'market-2026-04-male-xiuxian-v1',
      selectionMode: 'locked'
    })
  })

  const summary = mapProjectSummary(record)
  assert.ok(summary.marketProfile)
  assert.equal(summary.marketProfile?.audienceLane, 'male')
  assert.ok(summary.marketPlaybookSelection)
  assert.equal(summary.marketPlaybookSelection?.selectedPlaybookId, 'market-2026-04-male-xiuxian-v1')
})

test('mapper: marketPlaybookSelectionJson 已有对象格式直接返回', () => {
  // PocketBase json 字段有时直接返回解析后的对象而非字符串
  const selection = {
    selectedPlaybookId: 'market-2026-04-male-xiuxian-v1',
    selectionMode: 'locked' as const,
    selectedVersion: 'v1',
    selectedSourceMonth: '2026-04'
  }
  const record = createBaseRecord({
    marketPlaybookSelectionJson: selection as unknown as string
  })

  const summary = mapProjectSummary(record)
  assert.ok(summary.marketPlaybookSelection)
  assert.equal(summary.marketPlaybookSelection?.selectedPlaybookId, 'market-2026-04-male-xiuxian-v1')
})
