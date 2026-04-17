import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCompactedSegmentBlock } from './compact-script-context.ts'

// ─────────────────────────────────────────────────────────────────────────────
// Helper: build a minimal DetailedOutlineSegmentDto with episodeBeats
// ─────────────────────────────────────────────────────────────────────────────

function makeSegment(
  act: 'opening' | 'midpoint' | 'climax' | 'ending',
  episodeBeats: { episodeNo: number; summary: string }[]
) {
  return { act, content: act, hookType: '', episodeBeats }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test: 10-episode story — all episodes must appear in output (first pass coverage)
// ─────────────────────────────────────────────────────────────────────────────

test('buildCompactedSegmentBlock: all 10 target episodes appear even with small budget', () => {
  // 4 segments covering 10 episodes total
  const segments = [
    makeSegment('opening', [
      { episodeNo: 1, summary: '第1集摘要' },
      { episodeNo: 2, summary: '第2集摘要' },
      { episodeNo: 3, summary: '第3集摘要' }
    ]),
    makeSegment('midpoint', [
      { episodeNo: 4, summary: '第4集摘要' },
      { episodeNo: 5, summary: '第5集摘要' },
      { episodeNo: 6, summary: '第6集摘要' }
    ]),
    makeSegment('climax', [
      { episodeNo: 7, summary: '第7集摘要' },
      { episodeNo: 8, summary: '第8集摘要' },
      { episodeNo: 9, summary: '第9集摘要' }
    ]),
    makeSegment('ending', [{ episodeNo: 10, summary: '第10集摘要' }])
  ]

  // Very small budget (760 chars) — old code would drop episodes 5-10
  const result = buildCompactedSegmentBlock({
    segments,
    maxChars: 760,
    targetEpisodes: 10
  })

  // Every episode must appear at least once
  for (let ep = 1; ep <= 10; ep++) {
    assert.match(result, new RegExp(`第${ep}集`), `episode ${ep} must appear in output`)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// Test: no segments — gracefully returns placeholder
// ─────────────────────────────────────────────────────────────────────────────

test('buildCompactedSegmentBlock: empty segments returns placeholder', () => {
  const result = buildCompactedSegmentBlock({
    segments: [],
    maxChars: 500,
    targetEpisodes: 10
  })
  assert.ok(result.includes('详纲压缩包'), 'should include header')
  assert.ok(result.includes('待补'), 'should show 待补 for missing episodes')
})

// ─────────────────────────────────────────────────────────────────────────────
// Test: partial episode coverage — missing episodes get "待补"
// ─────────────────────────────────────────────────────────────────────────────

test('buildCompactedSegmentBlock: missing episodes fallback to 待补', () => {
  // Only 3 episodes covered, but target is 10
  const segments = [
    makeSegment('opening', [
      { episodeNo: 1, summary: '第1集' },
      { episodeNo: 2, summary: '第2集' },
      { episodeNo: 3, summary: '第3集' }
    ])
  ]

  const result = buildCompactedSegmentBlock({
    segments,
    maxChars: 300,
    targetEpisodes: 10
  })

  // Episodes 1-3 have content
  assert.match(result, /第1集/)
  assert.match(result, /第2集/)
  assert.match(result, /第3集/)
  // Missing stretches should still be covered
  for (let ep = 4; ep <= 10; ep++) {
    assert.match(result, new RegExp(`第${ep}集=待补`))
  }
})

test('buildCompactedSegmentBlock: sparse long tails collapse into a single missing range', () => {
  const segments = [makeSegment('ending', [{ episodeNo: 60, summary: '第60集收束' }])]

  const result = buildCompactedSegmentBlock({
    segments,
    maxChars: 220,
    targetEpisodes: 60
  })

  assert.match(result, /第1-59集=待补/)
  assert.match(result, /第60集=第60集收束/)
  const placeholderRows = result.split('\n').filter((line) => line.includes('待补'))
  assert.equal(placeholderRows.length, 1)
})

test('buildCompactedSegmentBlock: dense 30-episode coverage keeps every episode visible instead of collapsing into ranges', () => {
  const segments = Array.from({ length: 6 }, (_, batchIndex) =>
    makeSegment(
      batchIndex < 2
        ? 'opening'
        : batchIndex < 4
          ? 'midpoint'
          : batchIndex === 4
            ? 'climax'
            : 'ending',
      Array.from({ length: 5 }, (_, offset) => {
        const episodeNo = batchIndex * 5 + offset + 1
        return {
          episodeNo,
          summary: `第${episodeNo}集摘要：关键推进${episodeNo}`
        }
      })
    )
  )

  const result = buildCompactedSegmentBlock({
    segments,
    maxChars: 760,
    targetEpisodes: 30
  })

  for (let ep = 1; ep <= 30; ep++) {
    assert.match(
      result,
      new RegExp(`第${ep}集=`),
      `episode ${ep} must stay visible in compact block`
    )
  }
  assert.doesNotMatch(result, /第\d+-\d+集=待补/)
})
