import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { buildDetailedOutlineStageViewModel } from './build-detailed-outline-view-model.ts'

function loadReal30EpisodeDetailedOutlineFixture() {
  const fixtureDir = path.resolve(
    process.cwd(),
    'tools/e2e/out/userdata-xiuxian-full-real-30ep-mncz0qkz/workspace/projects/project_mncz0sno'
  )
  const outlineFixture = JSON.parse(
    readFileSync(path.join(fixtureDir, 'outline.json'), 'utf8')
  ) as {
    outlineDraft: {
      summaryEpisodes: Array<{ episodeNo: number; summary: string }>
    }
  }
  const detailedOutlineFixture = JSON.parse(
    readFileSync(path.join(fixtureDir, 'detailed-outline.json'), 'utf8')
  ) as {
    detailedOutlineSegments: Array<{
      act: string
      content: string
      hookType: string
      episodeBeats: Array<{
        episodeNo: number
        summary: string
        sceneByScene?: Array<Record<string, unknown>>
      }>
    }>
  }

  return {
    outline: outlineFixture.outlineDraft,
    detailedOutlineBlocks: detailedOutlineFixture.detailedOutlineSegments
  }
}

describe('buildDetailedOutlineStageViewModel', () => {
  it('builds episode-first editors for DetailedOutlineStage render', () => {
    const outline = {
      id: 'test-outline',
      summaryEpisodes: [
        { episodeNo: 1, summary: 'Episode 1', sceneByScene: [] },
        { episodeNo: 2, summary: 'Episode 2', sceneByScene: [] },
        { episodeNo: 3, summary: 'Episode 3', sceneByScene: [] },
        { episodeNo: 4, summary: 'Episode 4', sceneByScene: [] }
      ],
      planningUnitEpisodes: 10
    } as any
    const detailedOutlineBlocks: any[] = [
      {
        act: 'opening',
        content: '开局主冲突',
        hookType: '把第一下代价立住',
        episodeBeats: [
          { episodeNo: 1, summary: '第1集 beats' },
          { episodeNo: 2, summary: '第2集 beats', sceneByScene: [{ id: 's-2' }] }
        ]
      },
      {
        act: 'midpoint',
        content: '中段升级',
        hookType: '',
        episodeBeats: [{ episodeNo: 3, summary: '第3集 beats' }]
      }
    ]

    const result = buildDetailedOutlineStageViewModel(outline, detailedOutlineBlocks)

    assert.strictEqual(result.totalEpisodes, 4)
    assert.strictEqual(result.filledCount, 3)
    assert.strictEqual(result.episodeEditors.length, 4)
    assert.strictEqual(result.episodeEditors[0].summary, '第1集 beats')
    assert.strictEqual(result.episodeEditors[1].summary, '第2集 beats')
    assert.deepStrictEqual(result.episodeEditors[1].sceneByScene, [{ id: 's-2' }])
    assert.strictEqual(result.episodeEditors[2].summary, '第3集 beats')
    assert.strictEqual(result.episodeEditors[3].summary, '')
  })

  it('builds episode-first editors for the main detailed outline editing area', () => {
    const outline = {
      id: 'test-outline',
      summaryEpisodes: [
        { episodeNo: 1, summary: 'Episode 1', sceneByScene: [] },
        { episodeNo: 2, summary: 'Episode 2', sceneByScene: [] },
        { episodeNo: 3, summary: 'Episode 3', sceneByScene: [] },
        { episodeNo: 4, summary: 'Episode 4', sceneByScene: [] }
      ],
      planningUnitEpisodes: 10
    } as any
    const detailedOutlineBlocks: any[] = [
      {
        act: 'opening',
        content: '开局阶段摘要',
        hookType: '把第一下代价立住',
        episodeBeats: [
          { episodeNo: 1, summary: '第1集 beats' },
          { episodeNo: 2, summary: '第2集 beats' }
        ]
      },
      {
        act: 'midpoint',
        content: '中段阶段摘要',
        hookType: '局面开始升级',
        episodeBeats: [{ episodeNo: 3, summary: '第3集 beats' }]
      }
    ]

    const result = buildDetailedOutlineStageViewModel(outline, detailedOutlineBlocks)

    assert.strictEqual(result.episodeEditors.length, 4)
    assert.deepStrictEqual(
      result.episodeEditors.map((item) => item.episodeNo),
      [1, 2, 3, 4]
    )
    assert.strictEqual(result.episodeEditors[0].summary, '第1集 beats')
    assert.strictEqual(result.episodeEditors[0].actLabel, '开局')
    assert.strictEqual(result.episodeEditors[0].segmentContent, '开局阶段摘要')
    assert.deepStrictEqual(result.episodeEditors[0].sceneByScene, [])
    assert.strictEqual(result.episodeEditors[2].actLabel, '中段')
    assert.strictEqual(result.episodeEditors[3].actLabel, '收束')
    assert.strictEqual(result.episodeEditors[3].summary, '')
  })

  it('builds a non-empty 30 episode view-model from real detailed outline data', () => {
    const { outline, detailedOutlineBlocks } = loadReal30EpisodeDetailedOutlineFixture()
    const sourceEpisodeNos = detailedOutlineBlocks.flatMap((segment) =>
      segment.episodeBeats.map((beat) => beat.episodeNo)
    )

    const result = buildDetailedOutlineStageViewModel(outline as any, detailedOutlineBlocks as any)

    assert.strictEqual(result.totalEpisodes, 30)
    assert.deepStrictEqual(
      sourceEpisodeNos,
      Array.from({ length: 30 }, (_, index) => index + 1)
    )
    assert.deepStrictEqual(
      result.episodeEditors.map((item) => item.episodeNo),
      Array.from({ length: 30 }, (_, index) => index + 1)
    )
    assert.deepStrictEqual(
      [...new Set(result.episodeEditors.map((item) => item.actKey))],
      ['opening', 'midpoint', 'climax', 'ending']
    )
    assert.deepStrictEqual(
      result.episodeEditors
        .filter((item, index, arr) => index === 0 || item.actKey !== arr[index - 1]?.actKey)
        .map((item) => item.actKey),
      ['opening', 'midpoint', 'climax', 'ending']
    )
    assert.deepStrictEqual(
      result.episodeEditors
        .filter((item, index, arr) => index === 0 || item.actKey !== arr[index - 1]?.actKey)
        .map((item) => item.episodeNo),
      [1, 8, 15, 23]
    )
    assert.ok(result.episodeEditors.slice(10).every((item) => item.summary.trim().length > 0))
    assert.ok(result.episodeEditors.slice(10).every((item) => item.sceneByScene.length > 0))
    assert.ok(result.episodeEditors[29].segmentContent.includes('蛇子封印持续松动'))
  })
})
