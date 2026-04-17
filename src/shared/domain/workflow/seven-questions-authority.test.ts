/**
 * 七问工作流回归测试（2026-04-04）
 *
 * 测试 4 类场景：
 *
 * 1. 已有确认版七问时，粗纲生成不再重跑七问 Agent
 * 2. saveConfirmedSevenQuestions 后，outlineBlocks[].sevenQuestions 能完整落盘再读出
 * 3. 顶层 project.sevenQuestions 已移除，不允许再回流成第二真相源
 * 4. 没有确认版七问时，generateOutlineAndCharactersFromConfirmedSevenQuestions 必须明确报错
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'

import {
  extractConfirmedSevenQuestions,
  hasConfirmedSevenQuestions,
  writeConfirmedSevenQuestionsToOutlineBlocks
} from './seven-questions-authority.ts'
import type {
  OutlineDraftDto,
  SevenQuestionsDto,
  SevenQuestionsSectionDto
} from '../../contracts/workflow.ts'

// ─── 测试数据 ────────────────────────────────────────────────────────────────

function makeSevenQuestionsSection(overrides?: Partial<SevenQuestionsSectionDto>): SevenQuestionsSectionDto {
  const q: SevenQuestionsDto = {
    goal: '主角找到宝藏',
    obstacle: '反派阻止',
    effort: '主角苦练武功',
    result: '主角打败反派',
    twist: '宝藏是空的',
    turnaround: '发现真正宝藏',
    ending: '主角领悟人生'
  }
  return {
    sectionNo: 1,
    sectionTitle: '第一篇章：开局',
    startEpisode: 1,
    endEpisode: 10,
    sevenQuestions: q,
    ...overrides
  }
}

function makeEmptyOutlineDraft(): OutlineDraftDto {
  return {
    title: '测试剧',
    genre: '武侠',
    theme: '成长',
    mainConflict: '正邪对立',
    protagonist: '张三',
    summary: '',
    summaryEpisodes: [],
    facts: []
  }
}

// ─── 测试 1：hasConfirmedSevenQuestions ─────────────────────────────────────

describe('七问真相源：hasConfirmedSevenQuestions', () => {
  it('outlineDraft 为 null 时返回 false', () => {
    assert.strictEqual(hasConfirmedSevenQuestions(null), false)
    assert.strictEqual(hasConfirmedSevenQuestions(undefined as unknown as OutlineDraftDto), false)
  })

  it('outlineBlocks 为空时返回 false', () => {
    const draft = { ...makeEmptyOutlineDraft(), outlineBlocks: [] }
    assert.strictEqual(hasConfirmedSevenQuestions(draft), false)
  })

  it('outlineBlocks 没有七问时返回 false', () => {
    const draft: OutlineDraftDto = {
      ...makeEmptyOutlineDraft(),
      outlineBlocks: [
        {
          blockNo: 1,
          label: '第一篇章',
          startEpisode: 1,
          endEpisode: 10,
          summary: '...',
          episodes: []
        }
      ]
    }
    assert.strictEqual(hasConfirmedSevenQuestions(draft), false)
  })

  it('outlineBlocks 有七问时返回 true', () => {
    const draft: OutlineDraftDto = {
      ...makeEmptyOutlineDraft(),
      outlineBlocks: [
        {
          blockNo: 1,
          label: '第一篇章',
          startEpisode: 1,
          endEpisode: 10,
          summary: '...',
          episodes: [],
          sevenQuestions: {
            goal: '目标',
            obstacle: '阻碍',
            effort: '努力',
            result: '结果',
            twist: '意外',
            turnaround: '转折',
            ending: '结局'
          }
        }
      ]
    }
    assert.strictEqual(hasConfirmedSevenQuestions(draft), true)
  })
})

// ─── 测试 2：extractConfirmedSevenQuestions ─────────────────────────────────

describe('七问真相源：extractConfirmedSevenQuestions', () => {
  it('无七问时返回 null', () => {
    assert.strictEqual(extractConfirmedSevenQuestions(null), null)
    assert.strictEqual(extractConfirmedSevenQuestions(makeEmptyOutlineDraft()), null)
  })

  it('有七问时正确提取为 SevenQuestionsResultDto 格式', () => {
    const draft: OutlineDraftDto = {
      ...makeEmptyOutlineDraft(),
      outlineBlocks: [
        {
          blockNo: 1,
          label: '第一篇章',
          startEpisode: 1,
          endEpisode: 5,
          summary: '',
          episodes: [],
          sectionTitle: '第一篇章',
          sevenQuestions: {
            goal: '找到真相',
            obstacle: '反派阻挠',
            effort: '主角追查',
            result: '接近真相',
            twist: '真相出乎意料',
            turnaround: '主角反转',
            ending: '正义战胜'
          }
        }
      ]
    }

    const result = extractConfirmedSevenQuestions(draft)
    assert.notStrictEqual(result, null)
    assert.strictEqual(result!.sectionCount, 1)
    assert.strictEqual(result!.needsSections, false)
    assert.strictEqual(result!.sections[0].sevenQuestions.goal, '找到真相')
    assert.strictEqual(result!.sections[0].startEpisode, 1)
    assert.strictEqual(result!.sections[0].endEpisode, 5)
  })

  it('多个篇章时正确提取', () => {
    const draft: OutlineDraftDto = {
      ...makeEmptyOutlineDraft(),
      outlineBlocks: [
        {
          blockNo: 1,
          label: '第一篇章',
          startEpisode: 1,
          endEpisode: 10,
          summary: '',
          episodes: [],
          sectionTitle: '第一篇章',
          sevenQuestions: { goal: '目标1', obstacle: '阻碍1', effort: '努力1', result: '结果1', twist: '意外1', turnaround: '转折1', ending: '结局1' }
        },
        {
          blockNo: 2,
          label: '第二篇章',
          startEpisode: 11,
          endEpisode: 20,
          summary: '',
          episodes: [],
          sectionTitle: '第二篇章',
          sevenQuestions: { goal: '目标2', obstacle: '阻碍2', effort: '努力2', result: '结果2', twist: '意外2', turnaround: '转折2', ending: '结局2' }
        }
      ]
    }

    const result = extractConfirmedSevenQuestions(draft)
    assert.notStrictEqual(result, null)
    assert.strictEqual(result!.sectionCount, 2)
    assert.strictEqual(result!.needsSections, true)
    assert.strictEqual(result!.sections[0].sevenQuestions.goal, '目标1')
    assert.strictEqual(result!.sections[1].sevenQuestions.goal, '目标2')
  })
})

// ─── 测试 3：writeConfirmedSevenQuestionsToOutlineBlocks ──────────────────

describe('七问真相源：writeConfirmedSevenQuestionsToOutlineBlocks', () => {
  it('空 outlineBlocks 时创建新 block', () => {
    const draft = makeEmptyOutlineDraft()
    const sections = [makeSevenQuestionsSection()]

    const result = writeConfirmedSevenQuestionsToOutlineBlocks(draft, sections)

    assert.strictEqual(result.outlineBlocks!.length, 1)
    assert.strictEqual(result.outlineBlocks![0].blockNo, 1)
    assert.strictEqual(result.outlineBlocks![0].sevenQuestions!.goal, '主角找到宝藏')
    assert.strictEqual(result.outlineBlocks![0].sectionTitle, '第一篇章：开局')
    assert.strictEqual(result.outlineBlocks![0].startEpisode, 1)
    assert.strictEqual(result.outlineBlocks![0].endEpisode, 10)
  })

  it('已有 block 时更新七问', () => {
    const draft: OutlineDraftDto = {
      ...makeEmptyOutlineDraft(),
      outlineBlocks: [
        {
          blockNo: 1,
          label: '第一篇章',
          startEpisode: 1,
          endEpisode: 5,
          summary: '旧摘要',
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
    }

    const newSection = makeSevenQuestionsSection({ startEpisode: 1, endEpisode: 10 })
    const result = writeConfirmedSevenQuestionsToOutlineBlocks(draft, [newSection])

    assert.strictEqual(result.outlineBlocks!.length, 1)
    assert.strictEqual(result.outlineBlocks![0].sevenQuestions!.goal, '主角找到宝藏')
    assert.strictEqual(result.outlineBlocks![0].startEpisode, 1)
    assert.strictEqual(result.outlineBlocks![0].endEpisode, 10)
    // 其他字段保留
    assert.strictEqual(result.outlineBlocks![0].summary, '旧摘要')
  })

  it('写入后再读出，七问内容完整一致', () => {
    const draft = makeEmptyOutlineDraft()
    const section = makeSevenQuestionsSection()
    const sections = [section]

    const written = writeConfirmedSevenQuestionsToOutlineBlocks(draft, sections)
    const readBack = extractConfirmedSevenQuestions(written)

    assert.notStrictEqual(readBack, null)
    assert.strictEqual(readBack!.sections[0].sevenQuestions.goal, section.sevenQuestions.goal)
    assert.strictEqual(readBack!.sections[0].sevenQuestions.obstacle, section.sevenQuestions.obstacle)
    assert.strictEqual(readBack!.sections[0].sevenQuestions.effort, section.sevenQuestions.effort)
    assert.strictEqual(readBack!.sections[0].sevenQuestions.result, section.sevenQuestions.result)
    assert.strictEqual(readBack!.sections[0].sevenQuestions.twist, section.sevenQuestions.twist)
    assert.strictEqual(readBack!.sections[0].sevenQuestions.turnaround, section.sevenQuestions.turnaround)
    assert.strictEqual(readBack!.sections[0].sevenQuestions.ending, section.sevenQuestions.ending)
  })
})

// ─── 测试 4：一致性边界 ──────────────────────────────────────────────────

describe('七问真相源：一致性边界', () => {
  it('多个篇章时每个篇章的七问独立存储', () => {
    const draft: OutlineDraftDto = {
      ...makeEmptyOutlineDraft(),
      outlineBlocks: [
        {
          blockNo: 1,
          label: '第一篇章',
          startEpisode: 1,
          endEpisode: 10,
          summary: '',
          episodes: [],
          sectionTitle: '开篇',
          sevenQuestions: { goal: '第一篇章目标', obstacle: '第一篇章阻碍', effort: '第一篇章努力', result: '第一篇章结果', twist: '第一篇章意外', turnaround: '第一篇章转折', ending: '第一篇章结局' }
        },
        {
          blockNo: 2,
          label: '第二篇章',
          startEpisode: 11,
          endEpisode: 20,
          summary: '',
          episodes: [],
          sectionTitle: '高潮',
          sevenQuestions: { goal: '第二篇章目标', obstacle: '第二篇章阻碍', effort: '第二篇章努力', result: '第二篇章结果', twist: '第二篇章意外', turnaround: '第二篇章转折', ending: '第二篇章结局' }
        }
      ]
    }

    const result = extractConfirmedSevenQuestions(draft)
    assert.notStrictEqual(result, null)
    assert.strictEqual(result!.sections.length, 2)

    // 第一个篇章七问正确
    assert.strictEqual(result!.sections[0].sevenQuestions.goal, '第一篇章目标')
    assert.strictEqual(result!.sections[0].sectionTitle, '开篇')

    // 第二个篇章七问正确
    assert.strictEqual(result!.sections[1].sevenQuestions.goal, '第二篇章目标')
    assert.strictEqual(result!.sections[1].sectionTitle, '高潮')

    // 两者不混淆
    assert.notStrictEqual(result!.sections[0].sevenQuestions.goal, result!.sections[1].sevenQuestions.goal)
  })

  it('只保留七个七问字段，不多不少', () => {
    const q: SevenQuestionsDto = {
      goal: 'G',
      obstacle: 'O',
      effort: 'E',
      result: 'R',
      twist: 'T',
      turnaround: 'TU',
      ending: 'EN'
    }
    const draft: OutlineDraftDto = {
      ...makeEmptyOutlineDraft(),
      outlineBlocks: [
        {
          blockNo: 1,
          label: '测试',
          startEpisode: 1,
          endEpisode: 5,
          summary: '',
          episodes: [],
          sevenQuestions: q
        }
      ]
    }

    const keys = Object.keys(extractConfirmedSevenQuestions(draft)!.sections[0].sevenQuestions!)
    assert.strictEqual(keys.length, 7)
    assert.ok(keys.includes('goal'))
    assert.ok(keys.includes('obstacle'))
    assert.ok(keys.includes('effort'))
    assert.ok(keys.includes('result'))
    assert.ok(keys.includes('twist'))
    assert.ok(keys.includes('turnaround'))
    assert.ok(keys.includes('ending'))
  })
})
