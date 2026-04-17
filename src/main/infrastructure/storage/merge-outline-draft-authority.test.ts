import test from 'node:test'
import assert from 'node:assert/strict'

import type { OutlineDraftDto } from '../../../shared/contracts/workflow.ts'
import { mergeOutlineDraftAuthorityForSave } from './merge-outline-draft-authority.ts'

function createOutlineDraft(overrides: Partial<OutlineDraftDto> = {}): OutlineDraftDto {
  return {
    title: '修仙传',
    genre: '玄幻',
    theme: '藏锋',
    mainConflict: '李科步步紧逼',
    protagonist: '黎明',
    summary: '',
    summaryEpisodes: [],
    facts: [],
    ...overrides
  }
}

test('mergeOutlineDraftAuthorityForSave keeps confirmed seven questions blocks when incoming outline omits outlineBlocks', () => {
  const existing = createOutlineDraft({
    outlineBlocks: [
      {
        blockNo: 1,
        label: '第一篇章',
        sectionTitle: '第一篇章',
        startEpisode: 1,
        endEpisode: 10,
        summary: '',
        episodes: [],
        sevenQuestions: {
          goal: '守住钥匙',
          obstacle: '李科施压',
          effort: '黎明继续藏锋',
          result: '局势更险',
          twist: '蛇子异动',
          turnaround: '被迫反咬',
          ending: '形成第一轮对撞'
        }
      }
    ]
  })
  const incoming = createOutlineDraft({
    title: '修仙传·改',
    outlineBlocks: undefined
  })

  const merged = mergeOutlineDraftAuthorityForSave({
    existing,
    incoming
  })

  assert.equal(merged.title, '修仙传·改')
  assert.equal(merged.outlineBlocks?.length, 1)
  assert.equal(merged.outlineBlocks?.[0]?.sevenQuestions?.turnaround, '被迫反咬')
})

test('mergeOutlineDraftAuthorityForSave respects explicit incoming outlineBlocks', () => {
  const existing = createOutlineDraft({
    outlineBlocks: [
      {
        blockNo: 1,
        label: '旧篇章',
        sectionTitle: '旧篇章',
        startEpisode: 1,
        endEpisode: 10,
        summary: '',
        episodes: [],
        sevenQuestions: {
          goal: '旧目标',
          obstacle: '旧阻碍',
          effort: '旧努力',
          result: '旧结果',
          twist: '旧意外',
          turnaround: '旧转折',
          ending: '旧结局'
        }
      }
    ]
  })
  const incoming = createOutlineDraft({
    outlineBlocks: [
      {
        blockNo: 2,
        label: '新篇章',
        sectionTitle: '新篇章',
        startEpisode: 11,
        endEpisode: 20,
        summary: '',
        episodes: [],
        sevenQuestions: {
          goal: '新目标',
          obstacle: '新阻碍',
          effort: '新努力',
          result: '新结果',
          twist: '新意外',
          turnaround: '新转折',
          ending: '新结局'
        }
      }
    ]
  })

  const merged = mergeOutlineDraftAuthorityForSave({
    existing,
    incoming
  })

  assert.equal(merged.outlineBlocks?.length, 1)
  assert.equal(merged.outlineBlocks?.[0]?.blockNo, 2)
  assert.equal(merged.outlineBlocks?.[0]?.sevenQuestions?.goal, '新目标')
})
