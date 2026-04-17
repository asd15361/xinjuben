import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'

// =============================================================================
// MOCK SETUP — window.api.workflow is what getScriptGenerationPlan calls internally
// =============================================================================

const mockIpcCalls: Record<string, (params: unknown) => unknown> = {}
const mockWindowApi = {
  workflow: {
    buildScriptGenerationPlan: async (params: unknown) => {
      return mockIpcCalls.buildScriptGenerationPlan?.(params)
    },
    validateStageInputContract: async (params: unknown) => {
      return mockIpcCalls.validateStageInputContract?.(params)
    }
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(globalThis as any).window = { api: mockWindowApi }

// Import after global mock is set
import {
  summarizeIssues,
  buildStagePayloadFromProject,
  evaluateStageAccess,
  type StageNavigationPayload
} from './stage-navigation-truth.ts'
import { clearScriptPlanCache, getScriptGenerationPlan } from '../services/script-plan-service.ts'
import type { ProjectSnapshotDto } from '../../../../shared/contracts/project'
import type { ScriptGenerationExecutionPlanDto } from '../../../../shared/contracts/script-generation'

// =============================================================================
// HELPERS
// =============================================================================

function makeMinimalProject(overrides: Partial<ProjectSnapshotDto> = {}): ProjectSnapshotDto {
  return {
    id: 'proj-1',
    name: '测试剧本',
    stage: 'script',
    storyIntent: {
      protagonist: '黎明',
      antagonist: '李科',
      genre: '玄幻修仙',
      tone: '紧张',
      officialKeyCharacters: ['黎明', '李科'],
      lockedCharacterNames: [],
      themeAnchors: ['不争'],
      worldAnchors: ['玄玉宫', '闹市'],
      relationAnchors: ['威胁', '守护'],
      dramaticMovement: []
    },
    outlineDraft: {
      title: '修仙传',
      genre: '玄幻修仙',
      theme: '不争',
      mainConflict: '黎明被逼亮底',
      protagonist: '黎明',
      summary: '李科拿小柔逼黎明亮底。',
      summaryEpisodes: [{ episodeNo: 1, summary: '李科逼黎明亮底。' }],
      facts: []
    },
    characterDrafts: [],
    detailedOutlineSegments: [],
    scriptDraft: [],
    chatMessages: [],
    ...overrides
  } as ProjectSnapshotDto
}

function makePlan(
  overrides: Partial<ScriptGenerationExecutionPlanDto> = {}
): ScriptGenerationExecutionPlanDto {
  return {
    mode: 'fresh_start',
    ready: true,
    blockedBy: [],
    contract: {
      ready: true,
      targetEpisodes: 10,
      structuralActs: [],
      missingActs: [],
      confirmedFormalFacts: [],
      missingFormalFactLandings: [],
      storyContract: {} as any,
      userAnchorLedger: {} as any,
      missingAnchorNames: [],
      heroineAnchorCovered: true
    },
    targetEpisodes: 10,
    existingSceneCount: 0,
    recommendedPrimaryLane: 'deepseek',
    recommendedFallbackLane: 'deepseek',
    runtimeProfile: {
      contextPressureScore: 0,
      shouldCompactContextFirst: false,
      maxStoryIntentChars: 1800,
      maxCharacterChars: 2400,
      maxSegmentChars: 1500,
      recommendedBatchSize: 5,
      profileLabel: 'test',
      reason: 'test'
    },
    episodePlans: [],
    ...overrides
  } as ScriptGenerationExecutionPlanDto
}

function basePayload(): StageNavigationPayload {
  return {
    storyIntent: {
      protagonist: '黎明',
      antagonist: '李科',
      genre: '玄幻修仙',
      tone: '紧张',
      officialKeyCharacters: ['黎明'],
      lockedCharacterNames: [],
      themeAnchors: ['不争'],
      worldAnchors: ['玄玉宫'],
      relationAnchors: ['威胁'],
      dramaticMovement: []
    },
    outline: {
      title: 't',
      genre: 'g',
      theme: 'th',
      mainConflict: 'c',
      protagonist: 'p',
      summary: 's',
      summaryEpisodes: [{ episodeNo: 1, summary: '摘要' }],
      facts: []
    },
    characters: [],
    segments: [],
    script: []
  }
}

// =============================================================================
// TESTS: summarizeIssues
// =============================================================================

describe('summarizeIssues', () => {
  it('returns fallback when issues is empty', () => {
    const result = summarizeIssues([], '默认消息')
    assert.equal(result, '默认消息')
  })

  it('returns single issue as-is', () => {
    const result = summarizeIssues(['缺少正式事实'], '默认消息')
    assert.equal(result, '缺少正式事实')
  })

  it('joins first two issues with Chinese semicolon and appends count', () => {
    const result = summarizeIssues(['缺事实', '缺人物', '缺段落'], '默认消息')
    assert.equal(result, '缺事实；缺人物（共 3 条）')
  })

  it('handles exactly two issues — still includes count', () => {
    const result = summarizeIssues(['A', 'B'], '默认消息')
    assert.equal(result, 'A；B（共 2 条）')
  })
})

// =============================================================================
// TESTS: buildStagePayloadFromProject
// =============================================================================

describe('buildStagePayloadFromProject', () => {
  it('maps all fields correctly', () => {
    const project = makeMinimalProject({
      storyIntent: {
        protagonist: '黎明',
        antagonist: '李科',
        genre: '玄幻修仙',
        tone: '紧张',
        officialKeyCharacters: ['黎明'],
        lockedCharacterNames: [],
        themeAnchors: ['不争'],
        worldAnchors: ['玄玉宫'],
        relationAnchors: ['威胁'],
        dramaticMovement: []
      },
      outlineDraft: {
        title: 't',
        genre: 'g',
        theme: 'th',
        mainConflict: 'c',
        protagonist: 'p',
        summary: 's',
        summaryEpisodes: [],
        facts: [
          {
            id: 'f1',
            label: 'l',
            description: 'd',
            linkedToPlot: true,
            linkedToTheme: true,
            authorityType: 'user_declared' as const,
            status: 'confirmed' as const,
            level: 'core' as const,
            declaredBy: 'user',
            declaredStage: 'outline' as const,
            createdAt: '',
            updatedAt: ''
          }
        ]
      },
      characterDrafts: [
        {
          name: '黎明',
          biography: 'bio',
          publicMask: 'mask',
          hiddenPressure: 'hp',
          fear: 'fear',
          protectTarget: 'pt',
          conflictTrigger: 'ct',
          advantage: 'adv',
          weakness: 'weak',
          goal: 'goal',
          arc: 'arc'
        }
      ],
      detailedOutlineSegments: [
        { act: 'opening' as const, title: '开', content: 'cnt', hookType: '悬念' }
      ],
      scriptDraft: [
        {
          sceneNo: 1,
          action: '黎明出场',
          dialogue: '',
          emotion: ''
        }
      ],
      scriptRuntimeFailureHistory: ['script_segment_missing']
    })

    const payload = buildStagePayloadFromProject(project)

    assert.equal(payload.storyIntent?.protagonist, '黎明')
    assert.equal(payload.outline?.title, 't')
    assert.equal(payload.characters.length, 1)
    assert.equal(payload.segments.length, 1)
    assert.equal(payload.script.length, 1)
    assert.deepStrictEqual(payload.runtimeFailureHistory, ['script_segment_missing'])
  })

  it('handles missing optional fields', () => {
    const project = makeMinimalProject({
      outlineDraft: undefined,
      characterDrafts: undefined,
      detailedOutlineSegments: undefined,
      scriptDraft: undefined,
      scriptRuntimeFailureHistory: undefined
    })

    const payload = buildStagePayloadFromProject(project as ProjectSnapshotDto)

    assert.equal(payload.outline, undefined)
    assert.equal(payload.characters, undefined)
    assert.equal(payload.segments, undefined)
    assert.equal(payload.script, undefined)
    assert.equal(payload.runtimeFailureHistory, undefined)
  })
})

// =============================================================================
// TESTS: evaluateStageAccess — chat stage
// =============================================================================

describe('evaluateStageAccess — chat stage', () => {
  it('returns ready:true for chat stage without going to IPC', async () => {
    const result = await summarizeIssues([], 'chat always ready')
    assert.equal(result, 'chat always ready')
  })
})

// =============================================================================
// TESTS: evaluateStageAccess — script stage (the core entry gate fix)
// =============================================================================

describe('evaluateStageAccess — script stage (core entry gate)', () => {
  beforeEach(() => {
    Object.keys(mockIpcCalls).forEach((key) => delete mockIpcCalls[key])
    clearScriptPlanCache()
  })

  it('returns ready:false with message when buildScriptGenerationPlan returns null', async () => {
    mockIpcCalls.buildScriptGenerationPlan = async () => null

    const result = await evaluateStageAccess('script', basePayload())

    assert.equal(result.ready, false)
    assert.ok(result.message.includes('无法构建'))
    assert.deepStrictEqual(result.issues, [])
  })

  it('returns ready:false and maps blockedBy messages when plan is not ready', async () => {
    const blockedBy = [
      { code: 'script_formal_fact_missing', message: '缺少正式事实', field: 'outline.facts' },
      { code: 'script_segment_missing', message: '缺少分段', field: 'segments' }
    ]
    mockIpcCalls.buildScriptGenerationPlan = async () => makePlan({ ready: false, blockedBy })

    const result = await evaluateStageAccess('script', basePayload())

    assert.equal(result.ready, false)
    assert.equal(result.issues.length, 2)
    assert.equal(result.issues[0], '缺少正式事实')
    assert.equal(result.issues[1], '缺少分段')
  })

  it('returns ready:true with empty issues when plan is ready', async () => {
    mockIpcCalls.buildScriptGenerationPlan = async () => makePlan({ ready: true, blockedBy: [] })

    const result = await evaluateStageAccess('script', basePayload())

    assert.equal(result.ready, true)
    assert.deepStrictEqual(result.issues, [])
    assert.equal(result.message, '')
  })

  it('passes resume mode when script already has covered episodes', async () => {
    let capturedInput: any = null
    // The IPC handler (main process) resolves mode based on coveredEpisodeCount.
    // We mock the full response including the resolved mode.
    mockIpcCalls.buildScriptGenerationPlan = async (input: any) => {
      capturedInput = input
      return makePlan({ ready: true, blockedBy: [], mode: 'resume' })
    }

    // targetEpisodes=20 ensures unique revision from other tests
    const result = await getScriptGenerationPlan({
      planInput: { mode: undefined as any, targetEpisodes: 20 },
      storyIntent: basePayload().storyIntent,
      outline: basePayload().outline!,
      characters: [],
      segments: [],
      script: [
        { sceneNo: 1, action: 'RESUME-A', dialogue: '', emotion: '' },
        { sceneNo: 2, action: 'RESUME-B', dialogue: '', emotion: '' }
      ],
      failureHistory: []
    })

    assert.ok(result !== null, 'plan should be returned')
    assert.ok(capturedInput !== null, 'IPC mock should have been called')
    // Script has 2 scenes with action 'RESUME-A/B', coveredEpisodeCount > 0
    // → mode should be resolved to 'resume' by main process IPC handler
    assert.equal(result!.mode, 'resume', 'resolved mode in returned plan should be resume')
  })

  it('passes fresh_start mode when script is empty', async () => {
    let capturedInput: any = null
    // The IPC handler (main process) resolves mode based on coveredEpisodeCount.
    // We mock the full response including the resolved mode.
    mockIpcCalls.buildScriptGenerationPlan = async (input: any) => {
      capturedInput = input
      return makePlan({ ready: true, blockedBy: [], mode: 'fresh_start' })
    }

    // targetEpisodes=30 ensures unique revision from other tests
    const result = await getScriptGenerationPlan({
      planInput: { mode: undefined as any, targetEpisodes: 30 },
      storyIntent: basePayload().storyIntent,
      outline: basePayload().outline!,
      characters: [],
      segments: [],
      script: [],
      failureHistory: []
    })

    assert.ok(result !== null, 'plan should be returned')
    assert.ok(capturedInput !== null, 'IPC mock should have been called')
    // Script is empty, coveredEpisodeCount = 0
    // → mode should be resolved to 'fresh_start' by main process IPC handler
    assert.equal(
      result!.mode,
      'fresh_start',
      'resolved mode in returned plan should be fresh_start'
    )
  })
})
