import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import type {
  ScriptGenerationExecutionPlanDto,
  ScriptGenerationProgressBoardDto
} from '../../../shared/contracts/script-generation.ts'
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow.ts'
import { startScriptGeneration } from './start-script-generation.ts'

function createPlan(targetEpisodes = 4): ScriptGenerationExecutionPlanDto {
  return {
    mode: 'fresh_start',
    ready: true,
    blockedBy: [],
    contract: {
      ready: true,
      targetEpisodes,
      structuralActs: [],
      missingActs: [],
      confirmedFormalFacts: [],
      missingFormalFactLandings: [],
      storyContract: {} as ScriptGenerationExecutionPlanDto['contract']['storyContract'],
      userAnchorLedger: {} as ScriptGenerationExecutionPlanDto['contract']['userAnchorLedger'],
      missingAnchorNames: [],
      heroineAnchorCovered: true
    },
    targetEpisodes,
    existingSceneCount: 0,
    recommendedPrimaryLane: 'deepseek',
    recommendedFallbackLane: 'deepseek',
    runtimeProfile: {
      contextPressureScore: 0,
      shouldCompactContextFirst: false,
      maxStoryIntentChars: 1600,
      maxCharacterChars: 1200,
      maxSegmentChars: 1200,
      recommendedBatchSize: 2,
      profileLabel: 'test',
      reason: 'test'
    },
    episodePlans: Array.from({ length: targetEpisodes }, (_, index) => ({
      episodeNo: index + 1,
      status: 'ready' as const,
      lane: 'deepseek' as const,
      reason: 'ready',
      runtimeHints: {
        episode: index + 1,
        totalEpisodes: targetEpisodes,
        estimatedContextTokens: 1000,
        strictness: 'normal' as const,
        hasP0Risk: false,
        hasHardAlignerRisk: false,
        isRewriteMode: false,
        recoveryMode: 'fresh' as const
      }
    }))
  }
}

function createBoard(targetEpisodes = 4): ScriptGenerationProgressBoardDto {
  return {
    episodeStatuses: Array.from({ length: targetEpisodes }, (_, index) => ({
      episodeNo: index + 1,
      status: 'pending' as const,
      batchIndex: Math.floor(index / 2) + 1,
      reason: 'ready'
    })),
    batchContext: {
      batchSize: 2,
      currentBatchIndex: 1,
      startEpisode: 1,
      endEpisode: Math.min(2, targetEpisodes),
      status: 'idle',
      resumeFromEpisode: 1,
      reason: 'test',
      stageContractFingerprint: null,
      updatedAt: new Date().toISOString()
    }
  }
}

function createOutline(): OutlineDraftDto {
  return {
    title: '修仙传',
    genre: '玄幻修仙',
    theme: '不争',
    protagonist: '黎明',
    mainConflict: '黎明被逼亮底',
    summary: '李科拿小柔逼黎明亮底。',
    summaryEpisodes: [
      { episodeNo: 1, summary: '第1集' },
      { episodeNo: 2, summary: '第2集' }
    ],
    facts: []
  }
}

function createCharacters(): CharacterDraftDto[] {
  return [
    {
      name: '黎明',
      biography: '守钥匙的人。',
      publicMask: '低调',
      hiddenPressure: '要护小柔',
      fear: '小柔出事',
      protectTarget: '小柔',
      conflictTrigger: '被拿小柔逼时亮底',
      advantage: '会忍也会算',
      weakness: '太在意小柔',
      goal: '守住钥匙',
      arc: '从隐忍到反咬'
    },
    {
      name: '李科',
      biography: '恶霸。',
      publicMask: '凶狠',
      hiddenPressure: '怕自己输',
      fear: '失势',
      protectTarget: '自己',
      conflictTrigger: '拿不到钥匙就加压',
      advantage: '敢压人',
      weakness: '自负',
      goal: '逼出钥匙',
      arc: '越压越失控'
    }
  ]
}

function createScene(episodeNo: number): ScriptSegmentDto {
  return {
    sceneNo: episodeNo,
    action: `第${episodeNo}集动作`,
    dialogue: `第${episodeNo}集对白`,
    emotion: `第${episodeNo}集情绪`,
    screenplay: `第${episodeNo}集\n${episodeNo}-1 日\n人物：黎明\n△第${episodeNo}集动作\n黎明：第${episodeNo}集对白`,
    screenplayScenes: []
  }
}

test('startScriptGeneration preserves completed episodes and real failure reason on later batch failure', async () => {
  const boards: ScriptGenerationProgressBoardDto[] = [
    {
      ...createBoard(),
      episodeStatuses: [
        { episodeNo: 1, status: 'completed', batchIndex: 1, reason: 'ok' },
        { episodeNo: 2, status: 'completed', batchIndex: 1, reason: 'ok' },
        { episodeNo: 3, status: 'pending', batchIndex: 2, reason: 'ready' },
        { episodeNo: 4, status: 'pending', batchIndex: 2, reason: 'ready' }
      ]
    },
    {
      ...createBoard(),
      episodeStatuses: [
        { episodeNo: 1, status: 'completed', batchIndex: 1, reason: 'ok' },
        { episodeNo: 2, status: 'completed', batchIndex: 1, reason: 'ok' },
        { episodeNo: 3, status: 'failed', batchIndex: 2, reason: 'terminated' },
        { episodeNo: 4, status: 'pending', batchIndex: 2, reason: 'ready' }
      ]
    }
  ]
  let callCount = 0

  const result = await startScriptGeneration(
    {
      plan: createPlan(),
      outlineTitle: '修仙传',
      theme: '不争',
      mainConflict: '黎明被逼亮底',
      charactersSummary: ['黎明:守住钥匙', '李科:逼出钥匙'],
      outline: createOutline(),
      characters: createCharacters(),
      existingScript: []
    },
    {} as RuntimeProviderConfig,
    createBoard(),
    {
      outline: createOutline(),
      characters: createCharacters(),
      existingScript: []
    },
    {
      batchRunner: async () => {
        callCount += 1
        if (callCount === 1) {
          return {
            board: boards[0]!,
            generatedScenes: [createScene(1), createScene(2)]
          }
        }
        return {
          board: boards[1]!,
          generatedScenes: [],
          failure: {
            episodeNo: 3,
            message: 'terminated'
          }
        }
      }
    }
  )

  assert.equal(result.success, false)
  assert.equal(result.generatedScenes.length, 2)
  assert.equal(result.generatedScenes[0]?.sceneNo, 1)
  assert.equal(result.generatedScenes[1]?.sceneNo, 2)
  assert.equal(result.failure?.errorMessage, 'terminated')
  assert.match(result.failure?.reason || '', /已保留当前已经写出的内容/)
})

test('startScriptGeneration still reports stalled batch when no episode output and no explicit failure', async () => {
  const stalledBoard: ScriptGenerationProgressBoardDto = {
    ...createBoard(),
    episodeStatuses: [
      { episodeNo: 1, status: 'pending', batchIndex: 1, reason: 'ready' },
      { episodeNo: 2, status: 'pending', batchIndex: 1, reason: 'ready' },
      { episodeNo: 3, status: 'pending', batchIndex: 2, reason: 'ready' },
      { episodeNo: 4, status: 'pending', batchIndex: 2, reason: 'ready' }
    ]
  }

  const result = await startScriptGeneration(
    {
      plan: createPlan(),
      outlineTitle: '修仙传',
      theme: '不争',
      mainConflict: '黎明被逼亮底',
      charactersSummary: ['黎明:守住钥匙', '李科:逼出钥匙'],
      outline: createOutline(),
      characters: createCharacters(),
      existingScript: []
    },
    {} as RuntimeProviderConfig,
    createBoard(),
    {
      outline: createOutline(),
      characters: createCharacters(),
      existingScript: []
    },
    {
      batchRunner: async () => ({
        board: stalledBoard,
        generatedScenes: []
      })
    }
  )

  assert.equal(result.success, false)
  assert.equal(result.generatedScenes.length, 0)
  assert.equal(result.failure?.errorMessage, 'script_generation_batch_stalled:no_episode_output')
})

test('startScriptGeneration returns the batch draft directly without auto-running a second repair chain', async () => {
  const completedBoard: ScriptGenerationProgressBoardDto = {
    ...createBoard(1),
    episodeStatuses: [{ episodeNo: 1, status: 'completed', batchIndex: 1, reason: 'ok' }],
    batchContext: {
      ...createBoard(1).batchContext,
      status: 'completed'
    }
  }

  const result = await startScriptGeneration(
    {
      plan: createPlan(1),
      outlineTitle: '修仙传',
      theme: '不争',
      mainConflict: '黎明被逼亮底',
      charactersSummary: ['黎明:守住钥匙', '李科:逼出钥匙'],
      outline: createOutline(),
      characters: createCharacters(),
      existingScript: []
    },
    {} as RuntimeProviderConfig,
    createBoard(1),
    {
      outline: createOutline(),
      characters: createCharacters(),
      existingScript: []
    },
    {
      batchRunner: async () => ({
        board: completedBoard,
        generatedScenes: [createScene(1)]
      }),
      waitForRepairBatch: true
    }
  )

  assert.equal(result.success, true)
  assert.equal(result.generatedScenes.length, 1)
  assert.match(result.generatedScenes[0]?.screenplay || '', /第1集对白/)
})

test('startScriptGeneration should still produce postflight/ledger when later batch fails after visible draft exists', async () => {
  const boards: ScriptGenerationProgressBoardDto[] = [
    {
      ...createBoard(),
      episodeStatuses: [
        { episodeNo: 1, status: 'completed', batchIndex: 1, reason: 'ok' },
        { episodeNo: 2, status: 'completed', batchIndex: 1, reason: 'ok' },
        { episodeNo: 3, status: 'pending', batchIndex: 2, reason: 'ready' },
        { episodeNo: 4, status: 'pending', batchIndex: 2, reason: 'ready' }
      ]
    },
    {
      ...createBoard(),
      episodeStatuses: [
        { episodeNo: 1, status: 'completed', batchIndex: 1, reason: 'ok' },
        { episodeNo: 2, status: 'completed', batchIndex: 1, reason: 'ok' },
        { episodeNo: 3, status: 'failed', batchIndex: 2, reason: 'terminated' },
        { episodeNo: 4, status: 'pending', batchIndex: 2, reason: 'ready' }
      ]
    }
  ]
  let callCount = 0

  const result = await startScriptGeneration(
    {
      plan: createPlan(),
      outlineTitle: '修仙传',
      theme: '不争',
      mainConflict: '黎明被逼亮底',
      charactersSummary: ['黎明:守住钥匙', '李科:逼出钥匙'],
      outline: createOutline(),
      characters: createCharacters(),
      existingScript: []
    },
    {} as RuntimeProviderConfig,
    createBoard(),
    {
      outline: createOutline(),
      characters: createCharacters(),
      existingScript: []
    },
    {
      batchRunner: async () => {
        callCount += 1
        if (callCount === 1) {
          return {
            board: boards[0]!,
            generatedScenes: [createScene(1), createScene(2)]
          }
        }
        return {
          board: boards[1]!,
          generatedScenes: [],
          failure: {
            episodeNo: 3,
            message: 'terminated'
          }
        }
      }
    }
  )

  assert.equal(result.success, false)
  assert.equal(result.generatedScenes.length, 2)
  assert.ok(result.ledger, 'visible draft failure should still produce ledger')
  assert.ok(result.postflight, 'visible draft failure should still produce postflight')
})

test('startScriptGeneration should not block final result on awaited repair batch', async () => {
  const completedBoard: ScriptGenerationProgressBoardDto = {
    ...createBoard(1),
    episodeStatuses: [{ episodeNo: 1, status: 'completed', batchIndex: 1, reason: 'ok' }],
    batchContext: {
      ...createBoard(1).batchContext,
      status: 'completed'
    }
  }
  const result = await Promise.race([
    startScriptGeneration(
      {
        plan: createPlan(1),
        outlineTitle: '修仙传',
        theme: '不争',
        mainConflict: '黎明被逼亮底',
        charactersSummary: ['黎明:守住钥匙', '李科:逼出钥匙'],
        outline: createOutline(),
        characters: createCharacters(),
        existingScript: []
      },
      {} as RuntimeProviderConfig,
      createBoard(1),
      {
        outline: createOutline(),
        characters: createCharacters(),
        existingScript: []
      },
      {
        batchRunner: async () => ({
          board: completedBoard,
          generatedScenes: [createScene(1)]
        }),
        waitForRepairBatch: false
      }
    ).then(() => 'resolved' as const),
    new Promise<'timed_out'>((resolve) => setTimeout(() => resolve('timed_out'), 20))
  ])

  assert.equal(result, 'resolved', 'final result should not synchronously wait for repair batch')
})

test('startScriptGeneration emits stale warning and stops when characters fingerprint changes upstream', async () => {
  const warnings: string[] = []
  const originalWarn = console.warn
  console.warn = (message?: unknown, ...args: unknown[]) => {
    warnings.push([message, ...args].map((item) => String(item)).join(' '))
  }

  try {
    const result = await startScriptGeneration(
      {
        plan: createPlan(2),
        outlineTitle: '修仙传',
        theme: '不争',
        mainConflict: '黎明被逼亮底',
        charactersSummary: ['黎明:守住钥匙', '李科:逼出钥匙'],
        outline: createOutline(),
        characters: createCharacters(),
        existingScript: []
      },
      {} as RuntimeProviderConfig,
      createBoard(2),
      {
        outline: createOutline(),
        characters: createCharacters(),
        existingScript: []
      },
      {
        batchRunner: async () => ({
          board: createBoard(2),
          generatedScenes: []
        }),
        resolveLatestCharactersFingerprint: async () => 'charfp_changed_upstream'
      }
    )

    assert.equal(result.success, false)
    assert.equal(result.generatedScenes.length, 0)
    assert.match(
      result.failure?.errorMessage || '',
      /stale_warning:characters_fingerprint_changed/
    )
    assert.ok(
      warnings.some((message) => message.includes('Stale Warning')),
      'console should surface stale warning'
    )
  } finally {
    console.warn = originalWarn
  }
})
