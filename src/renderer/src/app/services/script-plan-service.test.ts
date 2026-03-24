import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'

// Mock window.api before importing the service
const mockIpcCalls: Record<string, any> = {}
const mockWindowApi = {
  workflow: {
    buildScriptGenerationPlan: async (params: any) => {
      return mockIpcCalls.buildScriptGenerationPlan?.(params)
    }
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).window = { api: mockWindowApi }

import { getScriptGenerationPlan, clearScriptPlanCache } from './script-plan-service'

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
      planInput: { mode: 'standard', targetEpisodes: 1 } as any,
      storyIntent: null,
      outline: null,
      characters: null,
      activeCharacterBlocks: null,
      detailedOutlineBlocks: null,
      script: null,
      failureHistory: []
    })

    assert.strictEqual(result, null)
  })
})
