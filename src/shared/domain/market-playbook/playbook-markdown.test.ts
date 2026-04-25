import test from 'node:test'
import assert from 'node:assert/strict'

import type { ProjectSnapshotDto } from '../../contracts/project.ts'
import { buildPlaybookSectionMarkdown } from './playbook-markdown.ts'

function createProject(overrides?: Partial<ProjectSnapshotDto>): ProjectSnapshotDto {
  return {
    id: 'proj-1',
    name: '测试项目',
    workflowType: 'ai_write',
    stage: 'chat',
    genre: '玄幻',
    marketProfile: null,
    updatedAt: new Date().toISOString(),
    chatMessages: [],
    generationStatus: null,
    storyIntent: null,
    entityStore: { characters: [], factions: [], locations: [], items: [], relations: [] },
    outlineDraft: null,
    characterDrafts: [],
    activeCharacterBlocks: [],
    detailedOutlineBlocks: [],
    detailedOutlineSegments: [],
    scriptDraft: [],
    scriptProgressBoard: null,
    scriptFailureResolution: null,
    scriptRuntimeFailureHistory: [],
    scriptStateLedger: null,
    visibleResult: {
      status: 'pending',
      description: '',
      payload: null,
      failureResolution: null,
      updatedAt: new Date().toISOString()
    },
    formalRelease: {
      status: 'blocked',
      description: '',
      blockedBy: [],
      evaluatedAt: new Date().toISOString()
    },
    ...overrides
  }
}

// ============================================================
// 测试
// ============================================================

test('P7: 无 selection 时导出"当前未锁定市场打法包"', () => {
  const project = createProject({ marketPlaybookSelection: null })
  const md = buildPlaybookSectionMarkdown(project)

  assert.ok(md.includes('## 市场打法包'))
  assert.ok(md.includes('当前未锁定市场打法包'))
  assert.ok(!md.includes('当前打法包：'))
})

test('P7: 无 selection 字段时导出"当前未锁定市场打法包"', () => {
  const project = createProject()
  // marketPlaybookSelection is undefined
  const md = buildPlaybookSectionMarkdown(project)

  assert.ok(md.includes('当前未锁定市场打法包'))
})

test('P7: 有 selection 时导出 playbook id/version/month/mode', () => {
  const project = createProject({
    marketPlaybookSelection: {
      selectedPlaybookId: 'market-2026-04-male-xiuxian-v1',
      selectionMode: 'locked',
      lockedAt: '2026-04-25T00:00:00Z',
      selectedVersion: 'v1',
      selectedSourceMonth: '2026-04'
    }
  })

  const md = buildPlaybookSectionMarkdown(project)

  assert.ok(md.includes('## 市场打法包'))
  assert.ok(md.includes('market-2026-04-male-xiuxian-v1'))
  assert.ok(md.includes('v1'))
  assert.ok(md.includes('2026-04'))
  assert.ok(md.includes('已锁定'))
  assert.ok(md.includes('2026-04-25T00:00:00Z'))
})

test('P7: manual 模式显示"手动指定"', () => {
  const project = createProject({
    marketPlaybookSelection: {
      selectedPlaybookId: 'market-2026-04-female-ceo-v1',
      selectionMode: 'manual',
      selectedVersion: 'v1',
      selectedSourceMonth: '2026-04'
    }
  })

  const md = buildPlaybookSectionMarkdown(project)
  assert.ok(md.includes('手动指定'))
})

test('P7: auto_latest 模式显示"自动选择"', () => {
  const project = createProject({
    marketPlaybookSelection: {
      selectedPlaybookId: 'market-2026-04-male-xiuxian-v1',
      selectionMode: 'auto_latest',
      selectedVersion: 'v1',
      selectedSourceMonth: '2026-04'
    }
  })

  const md = buildPlaybookSectionMarkdown(project)
  assert.ok(md.includes('自动选择'))
})

test('P7: selection 缺少可选字段时显示"未记录"', () => {
  const project = createProject({
    marketPlaybookSelection: {
      selectedPlaybookId: 'some-id',
      selectionMode: 'locked'
    }
  })

  const md = buildPlaybookSectionMarkdown(project)
  assert.ok(md.includes('some-id'))
  assert.ok(md.includes('未记录'))
})

test('P7: ProjectSnapshotDto 能携带 marketPlaybookSelection', () => {
  const project = createProject({
    marketPlaybookSelection: {
      selectedPlaybookId: 'test-id',
      selectionMode: 'locked',
      selectedVersion: 'v1',
      selectedSourceMonth: '2026-04',
      lockedAt: '2026-04-25T00:00:00Z'
    }
  })

  assert.ok(project.marketPlaybookSelection)
  assert.equal(project.marketPlaybookSelection?.selectedPlaybookId, 'test-id')
  assert.equal(project.marketPlaybookSelection?.selectionMode, 'locked')
  assert.equal(project.marketPlaybookSelection?.selectedVersion, 'v1')
  assert.equal(project.marketPlaybookSelection?.selectedSourceMonth, '2026-04')
  assert.equal(project.marketPlaybookSelection?.lockedAt, '2026-04-25T00:00:00Z')
})
