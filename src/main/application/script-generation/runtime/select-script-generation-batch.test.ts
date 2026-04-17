import test from 'node:test'
import assert from 'node:assert/strict'
import { selectBatchEpisodesForRun } from './select-script-generation-batch.ts'
import type {
  ScriptGenerationExecutionPlanDto,
  ScriptGenerationProgressBoardDto
} from '../../../../shared/contracts/script-generation.ts'

function createPlan(): ScriptGenerationExecutionPlanDto {
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
      profileLabel: 'full:episodes-10:pressure-0:fresh',
      reason: '测试'
    },
    episodePlans: Array.from({ length: 10 }, (_, index) => ({
      episodeNo: index + 1,
      status: 'ready' as const,
      lane: 'deepseek' as const,
      reason: 'ready'
    }))
  }
}

test('selectBatchEpisodesForRun picks the current 5-episode batch from pending statuses', () => {
  const board: ScriptGenerationProgressBoardDto = {
    episodeStatuses: Array.from({ length: 10 }, (_, index) => ({
      episodeNo: index + 1,
      status: index < 5 ? ('completed' as const) : ('pending' as const),
      batchIndex: index < 5 ? 1 : 2,
      reason: '测试'
    })),
    batchContext: {
      batchSize: 5,
      currentBatchIndex: 2,
      startEpisode: 6,
      endEpisode: 10,
      status: 'running',
      resumeFromEpisode: 6,
      reason: '测试',
      stageContractFingerprint: null,
      updatedAt: new Date().toISOString()
    }
  }

  const episodes = selectBatchEpisodesForRun(createPlan(), board)
  assert.deepEqual(
    episodes.map((episode) => episode.episodeNo),
    [6, 7, 8, 9, 10]
  )
})

test('selectBatchEpisodesForRun returns empty when no pending episodes remain', () => {
  const board: ScriptGenerationProgressBoardDto = {
    episodeStatuses: Array.from({ length: 5 }, (_, index) => ({
      episodeNo: index + 1,
      status: 'completed',
      batchIndex: 1,
      reason: '测试'
    })),
    batchContext: {
      batchSize: 5,
      currentBatchIndex: 1,
      startEpisode: 1,
      endEpisode: 5,
      status: 'completed',
      resumeFromEpisode: null,
      reason: '测试',
      stageContractFingerprint: null,
      updatedAt: new Date().toISOString()
    }
  }

  const episodes = selectBatchEpisodesForRun(createPlan(), board)
  assert.equal(episodes.length, 0)
})
