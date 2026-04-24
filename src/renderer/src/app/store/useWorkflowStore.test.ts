import test from 'node:test'
import assert from 'node:assert/strict'

import type { ProjectSnapshotDto } from '../../../../shared/contracts/project.ts'
import { useWorkflowStore } from './useWorkflowStore.ts'
import { useStageStore } from '../../store/useStageStore.ts'

function createProjectSnapshot(stage: ProjectSnapshotDto['stage']): ProjectSnapshotDto {
  return {
    id: 'project-1',
    name: '测试项目',
    workflowType: 'ai_write',
    stage,
    genre: '悬疑',
    marketProfile: null,
    updatedAt: '2026-03-24T00:00:00.000Z',
    chatMessages: [{ role: 'user', text: 'hello', createdAt: Date.now() }],
    generationStatus: {
      task: 'script',
      stage: 'script',
      title: '正在生成',
      detail: '处理中',
      startedAt: Date.now(),
      estimatedSeconds: 30
    },
    storyIntent: {
      titleHint: '意图标题',
      genre: '悬疑',
      tone: '强冲突',
      audience: '女性向',
      sellingPremise: '故事前提',
      coreDislocation: '错位',
      emotionalPayoff: '情绪回报',
      protagonist: '主角',
      antagonist: '反派',
      coreConflict: '冲突',
      endingDirection: '逆转',
      officialKeyCharacters: ['主角'],
      lockedCharacterNames: ['主角'],
      themeAnchors: ['主题'],
      worldAnchors: ['世界观'],
      relationAnchors: ['关系'],
      dramaticMovement: ['升级']
    },
    outlineDraft: null,
    characterDrafts: [],
    activeCharacterBlocks: [],
    detailedOutlineSegments: [],
    detailedOutlineBlocks: [],
    scriptDraft: [],
    scriptProgressBoard: {
      episodeStatuses: [
        {
          episodeNo: 1,
          status: 'running',
          batchIndex: 0,
          reason: '处理中'
        }
      ],
      batchContext: {
        batchSize: 5,
        currentBatchIndex: 0,
        startEpisode: 1,
        endEpisode: 5,
        status: 'running',
        resumeFromEpisode: null,
        reason: '处理中',
        stageContractFingerprint: 'fp-1',
        updatedAt: '2026-03-24T00:00:00.000Z'
      }
    },
    scriptFailureResolution: {
      kind: 'retry',
      reason: 'need retry',
      board: {
        episodeStatuses: [],
        batchContext: {
          batchSize: 5,
          currentBatchIndex: 0,
          startEpisode: 1,
          endEpisode: 5,
          status: 'failed',
          resumeFromEpisode: 1,
          reason: 'need retry',
          stageContractFingerprint: 'fp-1',
          updatedAt: '2026-03-24T00:00:00.000Z'
        }
      },
      lockRecoveryAttempted: false
    },
    scriptRuntimeFailureHistory: ['parse_interrupted'],
    scriptStateLedger: {
      semanticHash: 'hash-1',
      sceneCount: 1,
      latestHook: 'hook',
      recentSceneNos: [1],
      unresolvedSignals: ['signal'],
      characters: [],
      factState: {
        theme: '主题',
        mainConflict: '冲突',
        confirmedFormalFacts: [],
        protectedFacts: [],
        lastUpdatedAt: '2026-03-24T00:00:00.000Z'
      },
      anchorState: {
        requiredAnchorNames: [],
        missingAnchorNames: [],
        heroineRequired: false,
        heroineHint: '',
        heroineCovered: false
      },
      openHooks: [],
      storyMomentum: {
        previousCliffhanger: '上一钩子',
        nextRequiredBridge: '下一桥接',
        activeConflictLine: '冲突线',
        pendingCost: '代价',
        memoryEchoes: [],
        hardAnchors: []
      },
      knowledgeBoundaries: {
        perspectiveCharacter: '主角',
        publicFacts: [],
        hiddenFacts: [],
        forbiddenOmniscienceRules: []
      },
      eventLog: [],
      preflight: {
        issues: [],
        assertionBlock: 'assertion'
      }
    },
    visibleResult: {
      status: 'visible',
      description: 'visible',
      payload: [],
      failureResolution: null,
      updatedAt: '2026-03-24T00:00:00.000Z'
    },
    formalRelease: {
      status: 'blocked',
      description: 'blocked',
      blockedBy: [],
      evaluatedAt: '2026-03-24T00:00:00.000Z'
    }
  }
}

function resetWorkflowStore(): void {
  useWorkflowStore.getState().reset()
  useStageStore.getState().reset()
}

// Hydration is now done via hydrateStagePayload in stage-session-service,
// which calls individual store setters. We test the same behavior by
// calling the setters directly.

test('hydrating chat stage syncs chat data from project snapshot', () => {
  resetWorkflowStore()
  const snapshot = createProjectSnapshot('chat')

  // Simulate hydrateStagePayload for chat stage
  useWorkflowStore.getState().setProjectId(snapshot.id)
  useWorkflowStore.getState().setProjectName(snapshot.name)
  useWorkflowStore.getState().setChatMessages(snapshot.chatMessages ?? [])
  useWorkflowStore.getState().setStoryIntent(snapshot.storyIntent ?? null)
  useWorkflowStore.getState().setGenerationStatus(snapshot.generationStatus)
  useWorkflowStore.getState().setStage('chat')
  useStageStore.getState().hydrateProjectDrafts({
    outline: snapshot.outlineDraft,
    characters: snapshot.characterDrafts,
    segments: snapshot.detailedOutlineSegments,
    script: snapshot.scriptDraft
  })

  const state = useWorkflowStore.getState()
  assert.equal(state.currentStage, 'chat')
  assert.equal(state.chatMessages.length, 1)
  assert.equal(state.storyIntent?.titleHint, '意图标题')
  assert.equal(state.generationStatus?.title, '正在生成')
  assert.equal(state.scriptProgressBoard, null)
  assert.equal(state.scriptRuntimeFailureHistory.length, 0)
})

test('hydrating script stage keeps runtime truth for script stage', () => {
  resetWorkflowStore()
  const snapshot = createProjectSnapshot('script')

  // Simulate hydrateStagePayload for script stage
  useWorkflowStore.getState().setProjectId(snapshot.id)
  useWorkflowStore.getState().setProjectName(snapshot.name)
  useWorkflowStore.getState().setChatMessages(snapshot.chatMessages ?? [])
  useWorkflowStore.getState().setStoryIntent(snapshot.storyIntent ?? null)
  useWorkflowStore.getState().setGenerationStatus(snapshot.generationStatus)
  useWorkflowStore
    .getState()
    .setScriptRuntimeFailureHistory(snapshot.scriptRuntimeFailureHistory ?? [])
  useWorkflowStore.getState().setScriptProgressBoard(snapshot.scriptProgressBoard ?? null)
  useWorkflowStore.getState().setScriptFailureResolution(snapshot.scriptFailureResolution ?? null)
  useWorkflowStore.getState().setVisibleResult(snapshot.visibleResult ?? null)
  useWorkflowStore.getState().setFormalRelease(snapshot.formalRelease ?? null)
  useWorkflowStore.getState().setStage('script')
  useStageStore.getState().hydrateProjectDrafts({
    outline: snapshot.outlineDraft,
    characters: snapshot.characterDrafts,
    segments: snapshot.detailedOutlineSegments,
    script: snapshot.scriptDraft
  })

  const state = useWorkflowStore.getState()
  assert.equal(state.currentStage, 'script')
  assert.equal(state.generationStatus?.title, '正在生成')
  assert.equal(state.scriptProgressBoard?.batchContext.currentBatchIndex, 0)
  assert.deepEqual(state.scriptRuntimeFailureHistory, ['parse_interrupted'])
  assert.equal(state.visibleResult?.description, 'visible')
  assert.equal(state.formalRelease?.status, 'blocked')
})
