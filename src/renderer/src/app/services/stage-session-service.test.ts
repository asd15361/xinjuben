/**
 * stage-session-service.test.ts
 *
 * MODULE ASSESSMENT:
 * Most functions depend on browser-only runtime (window.api IPC + Zustand stores).
 * We can write LIMITED behavior tests by mocking window.api + Zustand stores.
 *
 * CORE BUG BEING TESTED:
 * switchStageSession() was previously using renderer-local targetStage as nextStage,
 * violating "main derives, renderer consumes" — nextStage MUST come from project.stage.
 */
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// =============================================================================
// MOCK SETUP
// =============================================================================

const savedStatuses: Array<{ projectId: string; generationStatus: unknown }> = []

const mockWindowApi = {
  system: {
    appendDiagnosticLog: async () => undefined
  },
  workspace: {
    getProject: async (projectId: string) => {
      if (projectId === 'proj-script-stage') {
        return {
          id: 'proj-script-stage',
          name: '测试剧本',
          stage: 'script', // Project is at 'script' stage in main
          workflowType: 'ai_write',
          genre: '玄幻',
          updatedAt: '2026-03-27T00:00:00.000Z',
          chatMessages: [],
          storyIntent: {
            protagonist: '黎明',
            antagonist: '李科',
            genre: '玄幻',
            tone: '紧张',
            officialKeyCharacters: ['黎明'],
            lockedCharacterNames: [],
            themeAnchors: ['不争'],
            worldAnchors: ['玄玉宫'],
            relationAnchors: ['威胁'],
            dramaticMovement: []
          },
          outlineDraft: {
            title: '修仙传',
            genre: '玄幻',
            theme: '不争',
            mainConflict: 'c',
            protagonist: '黎明',
            summary: 's',
            summaryEpisodes: [],
            facts: []
          },
          characterDrafts: [],
          detailedOutlineSegments: [],
          scriptDraft: [],
          scriptProgressBoard: null,
          scriptFailureResolution: null,
          scriptRuntimeFailureHistory: [],
          scriptStateLedger: null,
          visibleResult: null,
          formalRelease: null
        }
      }
      return null
    },
    saveGenerationStatus: async (input: { projectId: string; generationStatus: unknown }) => {
      savedStatuses.push(input)
      return undefined
    }
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).window = { api: mockWindowApi }

// Mock Zustand stores to prevent hydrateStagePayload from throwing
let mockWorkflowStoreState: Record<string, unknown> = {}
let mockStageStoreState: Record<string, unknown> = {}

const mockUseWorkflowStore = {
  getState: () => ({
    ...mockWorkflowStoreState,
    setProjectId: (id: string) => {
      mockWorkflowStoreState['projectId'] = id
    },
    setProjectName: (name: string) => {
      mockWorkflowStoreState['projectName'] = name
    },
    setChatMessages: (msgs: unknown) => {
      mockWorkflowStoreState['chatMessages'] = msgs
    },
    setGenerationStatus: (status: unknown) => {
      mockWorkflowStoreState['generationStatus'] = status
    },
    clearGenerationNotice: () => {},
    setStoryIntent: (si: unknown) => {
      mockWorkflowStoreState['storyIntent'] = si
    },
    setScriptRuntimeFailureHistory: (h: unknown) => {
      mockWorkflowStoreState['failureHistory'] = h
    },
    setScriptProgressBoard: (b: unknown) => {
      mockWorkflowStoreState['board'] = b
    },
    setScriptFailureResolution: (r: unknown) => {
      mockWorkflowStoreState['resolution'] = r
    },
    setVisibleResult: (v: unknown) => {
      mockWorkflowStoreState['visibleResult'] = v
    },
    setFormalRelease: (f: unknown) => {
      mockWorkflowStoreState['formalRelease'] = f
    },
    setStage: (s: unknown) => {
      mockWorkflowStoreState['stage'] = s
    }
  }),
  setState: () => {}
}

const mockUseStageStore = {
  getState: () => ({
    ...mockStageStoreState,
    hydrateProjectDrafts: () => {}
  }),
  setState: () => {}
}

// Override module-level store imports
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).__STORES_MOCK__ = { workflow: mockUseWorkflowStore, stage: mockUseStageStore }

const mod = await import('./stage-session-service.ts')

beforeEach(() => {
  savedStatuses.length = 0
  mockWorkflowStoreState = {}
  mockStageStoreState = {}
})

// =============================================================================
// TESTS
// =============================================================================

describe('stage-session-service — smoke test', () => {
  it('module loads and exports expected functions', () => {
    assert.strictEqual(typeof mod.openProjectSession, 'function')
    assert.strictEqual(typeof mod.switchStageSession, 'function')
    assert.strictEqual(typeof mod.createStageSessionFailureNotice, 'function')
  })

  it('StageSessionResult interface is used by exported functions', () => {
    assert.ok(mod.openProjectSession.length >= 1, 'openProjectSession accepts projectId')
    assert.ok(
      mod.switchStageSession.length >= 2,
      'switchStageSession accepts projectId and targetStage'
    )
    assert.ok(
      mod.createStageSessionFailureNotice.length >= 1,
      'createStageSessionFailureNotice accepts params'
    )
  })
})

describe('switchStageSession — core bug fix verification', () => {
  it('nextStage comes from project.stage (main-derived), NOT from targetStage argument', async () => {
    // The bug was: switchStageSession(targetStage) used targetStage as nextStage
    // The fix: nextStage must come from project.stage (main-derived authoritative source)
    const result = await mod.switchStageSession('proj-script-stage', 'chat' as any)

    assert.ok(result !== null, 'switchStageSession should return a result')
    // Project is at 'script' stage — nextStage should be 'script', NOT 'chat' (the targetStage)
    assert.equal(
      result.nextStage,
      'script',
      'nextStage must come from project.stage (main), not the renderer-passed targetStage'
    )
    // Verify the result also has the correct project reference
    assert.equal(result.project?.stage, 'script')
    assert.equal(result.project?.id, 'proj-script-stage')
  })

  it('switchStageSession returns null for non-existent project', async () => {
    const result = await mod.switchStageSession('non-existent-id', 'chat' as any)
    assert.equal(result, null)
  })
})
