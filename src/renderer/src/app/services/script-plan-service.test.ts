import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

// Mock window.api before importing the service
import type { BuildScriptGenerationPlanInputDto } from '../../../../shared/contracts/script-generation.ts'

const mockIpcCalls: Record<string, (params: unknown) => unknown> = {}
const mockWindowApi = {
  workflow: {
    buildScriptGenerationPlan: async (params: unknown) => {
      return mockIpcCalls.buildScriptGenerationPlan?.(params)
    }
  }
}

;(globalThis as typeof globalThis & { window: typeof mockWindowApi }).window = {
  api: mockWindowApi
}

import { getScriptGenerationPlan, clearScriptPlanCache } from './script-plan-service.ts'

describe('script-plan-service', () => {
  beforeEach(() => {
    clearScriptPlanCache()
  })

  afterEach(() => {
    Object.keys(mockIpcCalls).forEach((key) => delete mockIpcCalls[key])
  })

  it('exports getScriptGenerationPlan function', () => {
    assert.strictEqual(typeof getScriptGenerationPlan, 'function')
  })

  it('handles null IPC response and returns null', async () => {
    mockIpcCalls.buildScriptGenerationPlan = async () => null

    const result = await getScriptGenerationPlan({
      planInput: {
        mode: 'standard',
        targetEpisodes: 1
      } satisfies BuildScriptGenerationPlanInputDto,
      storyIntent: null,
      outline: null,
      characters: null,
      segments: null,
      script: null,
      failureHistory: []
    })

    assert.strictEqual(result, null)
  })

  it('returns cached plan when revision is unchanged', async () => {
    let calls = 0
    mockIpcCalls.buildScriptGenerationPlan = async () => {
      calls += 1
      return { ready: true, blockedBy: [], episodePlans: [] }
    }

    const input = {
      planInput: {
        mode: 'fresh_start',
        targetEpisodes: 10
      } satisfies BuildScriptGenerationPlanInputDto,
      storyIntent: null,
      outline: { summaryEpisodes: [{ episodeNo: 1, summary: '摘要' }] },
      characters: [],
      segments: [],
      script: [],
      failureHistory: []
    }

    const first = await getScriptGenerationPlan(input)
    const second = await getScriptGenerationPlan(input)

    assert.deepStrictEqual(first, second)
    assert.strictEqual(calls, 1)
  })

  it('rebuilds plan when detailed outline content changes even if segment count is unchanged', async () => {
    let calls = 0
    mockIpcCalls.buildScriptGenerationPlan = async () => {
      calls += 1
      return { ready: true, blockedBy: [], episodePlans: [], revision: calls }
    }

    const baseInput = {
      planInput: {
        mode: 'fresh_start',
        targetEpisodes: 10
      } satisfies BuildScriptGenerationPlanInputDto,
      storyIntent: null,
      outline: { summaryEpisodes: [{ episodeNo: 1, summary: '摘要' }], facts: [] },
      characters: [],
      segments: [{ act: 'opening', content: '旧内容', hookType: '', episodeBeats: [] }],
      script: [],
      failureHistory: []
    }

    const first = await getScriptGenerationPlan(baseInput)
    const second = await getScriptGenerationPlan({
      ...baseInput,
      segments: [{ act: 'opening', content: '新内容', hookType: '', episodeBeats: [] }]
    })

    assert.notDeepStrictEqual(first, second)
    assert.strictEqual(calls, 2)
  })

  it('rebuilds plan when covered script episodes change even if script length stays the same', async () => {
    let calls = 0
    mockIpcCalls.buildScriptGenerationPlan = async () => {
      calls += 1
      return { ready: true, blockedBy: [], episodePlans: [], revision: calls }
    }

    const baseInput = {
      planInput: {
        mode: 'fresh_start',
        targetEpisodes: 10
      } satisfies BuildScriptGenerationPlanInputDto,
      storyIntent: null,
      outline: { summaryEpisodes: [{ episodeNo: 1, summary: '摘要' }], facts: [] },
      characters: [],
      segments: [],
      script: [{ sceneNo: 10, action: '旧第10集' }],
      failureHistory: []
    }

    const first = await getScriptGenerationPlan(baseInput)
    const second = await getScriptGenerationPlan({
      ...baseInput,
      script: [{ sceneNo: 11, action: '越界第11集' }]
    })

    assert.notDeepStrictEqual(first, second)
    assert.strictEqual(calls, 2)
  })
})
