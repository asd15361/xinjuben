import test from 'node:test'
import assert from 'node:assert/strict'

import type { ScriptGenerationExecutionPlanDto } from '../../../../../shared/contracts/script-generation'
import type { OutlineDraftDto, ScriptSegmentDto } from '../../../../../shared/contracts/workflow.ts'
import {
  buildRewriteScriptEpisodeRequest,
  buildStartScriptGenerationRequest,
  buildScriptCharactersSummary,
  resolveEffectiveScriptGenerationPlan,
  resolveRequestedScriptGenerationMeta
} from './script-stage-actions.ts'

function createPlan(input?: Partial<ScriptGenerationExecutionPlanDto>): ScriptGenerationExecutionPlanDto {
  return {
    mode: 'resume',
    ready: true,
    blockedBy: [],
    contract: {} as ScriptGenerationExecutionPlanDto['contract'],
    targetEpisodes: 10,
    existingSceneCount: 2,
    recommendedPrimaryLane: 'deepseek',
    recommendedFallbackLane: 'deepseek',
    runtimeProfile: {
      contextPressureScore: 0,
      shouldCompactContextFirst: false,
      maxStoryIntentChars: 1600,
      maxCharacterChars: 1200,
      maxSegmentChars: 1200,
      recommendedBatchSize: 5,
      profileLabel: 'test',
      reason: 'test'
    },
    episodePlans: [],
    ...input
  }
}

function createOutline(): OutlineDraftDto {
  return {
    title: '修仙传',
    genre: '玄幻',
    theme: '命',
    protagonist: '黎明',
    mainConflict: '钥匙要不要交',
    summary: '摘要',
    summaryEpisodes: [],
    facts: []
  }
}

function createScript(sceneNos: number[]): ScriptSegmentDto[] {
  return sceneNos.map((sceneNo) => ({
    sceneNo,
    screenplay: `第${sceneNo}集`,
    action: `动作${sceneNo}`,
    dialogue: `对白${sceneNo}`,
    emotion: `情绪${sceneNo}`,
    screenplayScenes: []
  }))
}

test('resolveRequestedScriptGenerationMeta clamps to target episodes and switches to rewrite after coverage is full', () => {
  const result = resolveRequestedScriptGenerationMeta(createScript([1, 2, 3, 4, 5, 6]), 5)

  assert.equal(result.normalizedTargetEpisodes, 5)
  assert.equal(result.coveredEpisodeCount, 5)
  assert.equal(result.requestedMode, 'rewrite')
  assert.deepEqual(
    result.normalizedScript.map((scene) => scene.sceneNo),
    [1, 2, 3, 4, 5]
  )
})

test('resolveEffectiveScriptGenerationPlan reuses the current plan when the fresh lookup returns null but the contract still matches', async () => {
  const generationPlan = createPlan({
    mode: 'resume',
    targetEpisodes: 10,
    existingSceneCount: 3
  })

  const result = await resolveEffectiveScriptGenerationPlan({
    generationPlan,
    requestedMode: 'resume',
    normalizedTargetEpisodes: 10,
    scriptPlanBase: createScript([1, 2, 3]),
    storyIntent: null,
    outline: createOutline(),
    characters: [],
    segments: [],
    runtimeFailureHistory: [],
    getPlan: async () => null
  })

  assert.equal(result, generationPlan)
})

test('resolveEffectiveScriptGenerationPlan drops a stale cached plan when the covered episode count no longer matches', async () => {
  const generationPlan = createPlan({
    mode: 'resume',
    targetEpisodes: 10,
    existingSceneCount: 2
  })

  const result = await resolveEffectiveScriptGenerationPlan({
    generationPlan,
    requestedMode: 'resume',
    normalizedTargetEpisodes: 10,
    scriptPlanBase: createScript([1, 2, 3]),
    storyIntent: null,
    outline: createOutline(),
    characters: [],
    segments: [],
    runtimeFailureHistory: [],
    getPlan: async () => null
  })

  assert.equal(result, null)
})

test('buildScriptCharactersSummary keeps the same character summary口径 for generation and rewrite', () => {
  const result = buildScriptCharactersSummary([
    { name: '黎明', goal: '护住钥匙', protectTarget: '小柔', fear: '失手' },
    { name: '李科', goal: '', protectTarget: '自己', fear: '失势' }
  ] as any)

  assert.deepEqual(result, ['黎明:护住钥匙', '李科:自己'])
})

test('buildStartScriptGenerationRequest carries projectId and entityStore into runtime input', () => {
  const entityStore = {
    characters: [
      {
        id: 'char_li-ke',
        projectId: 'proj-1',
        type: 'character' as const,
        name: '李科',
        aliases: ['恶霸'],
        summary: '当前批次反派',
        tags: ['反派'],
        roleLayer: 'active' as const,
        goals: ['逼出钥匙'],
        pressures: ['拿人施压'],
        linkedFactionIds: [],
        linkedLocationIds: [],
        linkedItemIds: [],
        provenance: {
          provenanceTier: 'user_declared',
          originAuthorityType: 'user_declared',
          originDeclaredBy: 'user',
          sourceStage: 'outline',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z'
        }
      }
    ],
    factions: [],
    locations: [],
    items: [],
    relations: []
  }

  const request = buildStartScriptGenerationRequest({
    projectId: 'proj-1',
    plan: createPlan(),
    outline: createOutline(),
    characters: [],
    segments: [],
    existingScript: createScript([1, 2]),
    storyIntent: null,
    projectEntityStore: entityStore,
    charactersSummary: ['黎明:护住钥匙']
  })

  assert.equal(request.projectId, 'proj-1')
  assert.equal(request.entityStore, entityStore)
  assert.equal(request.outlineTitle, '修仙传')
  assert.equal(request.theme, '命')
  assert.equal(request.mainConflict, '钥匙要不要交')
})

test('buildRewriteScriptEpisodeRequest carries projectId and entityStore into manual rewrite input', () => {
  const entityStore = {
    characters: [],
    factions: [],
    locations: [],
    items: [],
    relations: []
  }

  const request = buildRewriteScriptEpisodeRequest({
    projectId: 'proj-1',
    episodeNo: 2,
    plan: createPlan(),
    outline: createOutline(),
    characters: [],
    segments: [],
    existingScript: createScript([1, 2]),
    storyIntent: null,
    projectEntityStore: entityStore,
    charactersSummary: ['黎明:护住钥匙']
  })

  assert.equal(request.episodeNo, 2)
  assert.equal(request.entityStore, entityStore)
  assert.equal(request.outlineTitle, '修仙传')
})
