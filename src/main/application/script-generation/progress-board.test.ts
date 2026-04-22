import test from 'node:test'
import assert from 'node:assert/strict'
import { createInitialProgressBoard, resolveResumeFromBoard } from './progress-board.ts'
import type { ScriptGenerationExecutionPlanDto } from '../../../shared/contracts/script-generation.ts'

function createPlan(
  input?: Partial<ScriptGenerationExecutionPlanDto>
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
      storyContract: {} as unknown,
      userAnchorLedger: {} as unknown,
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
      profileLabel: 'full:episodes-10:pressure-0:fresh',
      reason: '测试'
    },
    episodePlans: Array.from({ length: 10 }, (_, index) => ({
      episodeNo: index + 1,
      status: 'ready' as const,
      lane: 'deepseek' as const,
      reason: 'ready',
      runtimeHints: {
        episode: index + 1,
        totalEpisodes: 10,
        estimatedContextTokens: 1000,
        strictness: 'normal' as const,
        hasP0Risk: false,
        hasHardAlignerRisk: false,
        isRewriteMode: false,
        recoveryMode: 'fresh' as const
      }
    })),
    ...input
  }
}

test('createInitialProgressBoard uses 5-episode batch window for fresh runs', () => {
  const board = createInitialProgressBoard(createPlan(), null)

  assert.equal(board.batchContext.batchSize, 5)
  assert.equal(board.batchContext.startEpisode, 1)
  assert.equal(board.batchContext.endEpisode, 5)
  assert.equal(board.batchContext.resumeFromEpisode, 1)
})

test('createInitialProgressBoard marks historical prefix as skipped for resume runs', () => {
  const board = createInitialProgressBoard(
    createPlan({
      mode: 'resume',
      existingSceneCount: 1,
      episodePlans: Array.from({ length: 10 }, (_, index) => ({
        episodeNo: index + 1,
        status: index === 0 ? ('pending' as const) : ('ready' as const),
        lane: 'deepseek' as const,
        reason:
          index === 0 ? '该集视为前缀已存在，续跑从后续集数开始。' : '续跑模式从未覆盖集数继续。',
        runtimeHints: {
          episode: index + 1,
          totalEpisodes: 10,
          estimatedContextTokens: 1000,
          strictness: 'normal' as const,
          hasP0Risk: false,
          hasHardAlignerRisk: false,
          isRewriteMode: false,
          recoveryMode: 'fresh' as const
        }
      }))
    }),
    null
  )

  assert.equal(board.episodeStatuses[0]?.status, 'skipped')
  assert.equal(board.batchContext.resumeFromEpisode, 2)
  assert.equal(board.batchContext.startEpisode, 2)

  const resume = resolveResumeFromBoard(board)
  assert.equal(resume.resumeEpisode, 2)
})
