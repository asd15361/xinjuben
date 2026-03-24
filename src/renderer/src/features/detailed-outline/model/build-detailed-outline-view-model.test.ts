import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildDetailedOutlineViewModel } from './build-detailed-outline-view-model'

describe('buildDetailedOutlineViewModel', () => {
  it('empty blocks returns empty sectionInputs', () => {
    const outline = {
      id: 'test-outline',
      summaryEpisodes: [
        { episodeNo: 1, summary: 'Episode 1', sceneByScene: [] },
        { episodeNo: 2, summary: 'Episode 2', sceneByScene: [] }
      ],
      planningUnitEpisodes: 10
    } as any
    const detailedOutlineBlocks: any[] = []

    const result = buildDetailedOutlineViewModel(outline, detailedOutlineBlocks)

    assert.deepStrictEqual(result.sectionInputs, [])
  })

  it('basic block with sections produces sectionInputs', () => {
    const outline = {
      id: 'test-outline',
      summaryEpisodes: [
        { episodeNo: 1, summary: 'Episode 1', sceneByScene: [] },
        { episodeNo: 2, summary: 'Episode 2', sceneByScene: [] }
      ],
      planningUnitEpisodes: 10,
      outlineBlocks: [
        {
          blockNo: 1,
          label: '开局',
          startEpisode: 1,
          endEpisode: 2,
          scenes: []
        }
      ]
    } as any
    const detailedOutlineBlocks: any[] = [
      {
        blockNo: 1,
        startEpisode: 1,
        endEpisode: 2,
        sections: [
          {
            sectionNo: 1,
            title: '第一段',
            startEpisode: 1,
            endEpisode: 2,
            summary: '测试段落',
            episodeBeats: []
          }
        ]
      }
    ]

    const result = buildDetailedOutlineViewModel(outline, detailedOutlineBlocks)

    assert.strictEqual(result.sectionInputs.length, 1)
    assert.strictEqual(result.sectionInputs[0].blockNo, 1)
    assert.strictEqual(result.sectionInputs[0].sectionNo, 1)
    assert.strictEqual(result.sectionInputs[0].label, '第1段：开局 / 第一段')
  })

  it('blockLabels are pre-computed correctly', () => {
    const outline = {
      id: 'test-outline',
      summaryEpisodes: [
        { episodeNo: 1, summary: 'Episode 1', sceneByScene: [] },
        { episodeNo: 2, summary: 'Episode 2', sceneByScene: [] },
        { episodeNo: 3, summary: 'Episode 3', sceneByScene: [] }
      ],
      planningUnitEpisodes: 10,
      outlineBlocks: [
        { blockNo: 1, label: '开局', startEpisode: 1, endEpisode: 2, scenes: [] },
        { blockNo: 2, label: '发展', startEpisode: 3, endEpisode: 3, scenes: [] }
      ]
    } as any
    const detailedOutlineBlocks: any[] = []

    const result = buildDetailedOutlineViewModel(outline, detailedOutlineBlocks)

    assert.strictEqual(result.blockLabels[1], '开局')
    assert.strictEqual(result.blockLabels[2], '发展')
  })

  it('filledCount calculation', () => {
    const outline = {
      id: 'test-outline',
      summaryEpisodes: [
        { episodeNo: 1, summary: 'Episode 1', sceneByScene: [] },
        { episodeNo: 2, summary: 'Episode 2', sceneByScene: [] }
      ],
      planningUnitEpisodes: 10
    } as any
    const detailedOutlineBlocks: any[] = [
      {
        blockNo: 1,
        startEpisode: 1,
        endEpisode: 2,
        sections: [
          {
            sectionNo: 1,
            episodeBeats: [
              { episodeNo: 1, summary: 'Beat 1', sceneByScene: [{ id: '1' }] },
              { episodeNo: 2, summary: 'Beat 2', sceneByScene: [] }
            ]
          }
        ]
      }
    ]

    const result = buildDetailedOutlineViewModel(outline, detailedOutlineBlocks)

    assert.strictEqual(result.filledCount, 1)
  })
})
