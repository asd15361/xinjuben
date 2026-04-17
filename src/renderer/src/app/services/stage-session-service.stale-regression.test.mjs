import test from 'node:test'
import assert from 'node:assert/strict'

import { openProjectSession, switchStageSession } from './stage-session-service.ts'
import { useWorkflowStore } from '../store/useWorkflowStore.ts'
import { useStageStore } from '../../store/useStageStore.ts'

function createProjectSnapshot(overrides = {}) {
  return {
    id: 'project-stale-open',
    name: '修仙传',
    workflowType: 'ai_write',
    stage: 'script',
    genre: '仙侠',
    updatedAt: '2026-03-24T00:00:00.000Z',
    chatMessages: [{ role: 'user', text: '测试消息', createdAt: 1 }],
    generationStatus: {
      task: 'script',
      stage: 'script',
      title: '正在生成剧本',
      detail: '已处理 71944 秒',
      startedAt: Date.now() - 71_944_000,
      estimatedSeconds: 120,
      scope: 'project'
    },
    storyIntent: { concept: '修仙', theme: '逆天改命', coreConflict: '宗门追杀' },
    outlineDraft: {
      title: '修仙传',
      genre: '仙侠',
      theme: '逆天改命',
      mainConflict: '宗门追杀',
      protagonist: '林玄',
      summary: '少年踏上修仙路',
      summaryEpisodes: [],
      facts: []
    },
    characterDrafts: [
      {
        name: '林玄',
        biography: '出身寒门',
        publicMask: '沉稳',
        hiddenPressure: '被追杀',
        fear: '失去亲人',
        protectTarget: '妹妹',
        conflictTrigger: '仇家上门',
        advantage: '悟性高',
        weakness: '经验浅',
        goal: '活下去',
        arc: '从苟活到反击'
      }
    ],
    detailedOutlineSegments: [
      {
        act: 'opening',
        content: '林玄逃亡',
        hookType: '追杀',
        episodeBeats: []
      }
    ],
    scriptDraft: [{ sceneNo: 1, action: '逃', dialogue: '快走', emotion: '紧张' }],
    scriptProgressBoard: {
      episodeStatuses: [
        {
          episodeNo: 1,
          status: 'failed',
          batchIndex: 0,
          reason: '请求超时'
        }
      ],
      batchContext: {
        batchSize: 3,
        currentBatchIndex: 0,
        startEpisode: 1,
        endEpisode: 3,
        status: 'failed',
        resumeFromEpisode: 1,
        reason: '请求超时',
        stageContractFingerprint: 'fp-script',
        updatedAt: '2026-03-24T00:00:00.000Z'
      }
    },
    scriptResumeResolution: {
      canResume: true,
      resumeEpisode: 1,
      nextBatchStatus: 'failed',
      reason: '请求超时'
    },
    scriptFailureResolution: {
      kind: 'failed',
      reason: '真实生成过程中发生失败。',
      errorMessage: 'ai_request_timeout:45000ms',
      board: {
        episodeStatuses: [
          {
            episodeNo: 1,
            status: 'failed',
            batchIndex: 0,
            reason: '请求超时'
          }
        ],
        batchContext: {
          batchSize: 3,
          currentBatchIndex: 0,
          startEpisode: 1,
          endEpisode: 3,
          status: 'failed',
          resumeFromEpisode: 1,
          reason: '请求超时',
          stageContractFingerprint: 'fp-script',
          updatedAt: '2026-03-24T00:00:00.000Z'
        }
      },
      lockRecoveryAttempted: false
    },
    scriptRuntimeFailureHistory: ['runtime_interrupted'],
    scriptStateLedger: null,
    visibleResult: {
      status: 'visible',
      description: '剧本已有可见结果',
      payload: [{ sceneNo: 1, action: '逃', dialogue: '快走', emotion: '紧张' }],
      failureResolution: null,
      updatedAt: '2026-03-24T00:00:00.000Z'
    },
    formalRelease: {
      status: 'blocked',
      description: '正式验收未通过',
      blockedBy: [{ code: 'UNKNOWN_BLOCKED', message: '待正式验收', category: 'process' }],
      evaluatedAt: '2026-03-24T00:00:00.000Z'
    },
    ...overrides
  }
}

function resetStores() {
  useWorkflowStore.getState().reset()
  useStageStore.getState().reset()
}

test('openProjectSession keeps full hydration when persisted generationStatus is stale', async () => {
  // P2-1: Stale generationStatus cleanup moved to main-side (workspace:get-project handler).
  // Renderer no longer calls saveGenerationStatus for stale cleanup.
  // The stale status is filtered out during hydration via getHydratableGenerationStatus.
  resetStores()
  const staleProject = createProjectSnapshot()
  const savedStatuses = []

  globalThis.window = {
    api: {
      system: {
        appendDiagnosticLog: async () => undefined
      },
      workspace: {
        getProject: async (projectId) => {
          assert.equal(projectId, 'project-stale-open')
          return staleProject
        },
        saveGenerationStatus: async (input) => {
          savedStatuses.push(input)
          staleProject.generationStatus = input.generationStatus
          return staleProject
        }
      }
    }
  }

  const result = await openProjectSession('project-stale-open')

  assert.ok(result)
  assert.equal(result.project?.id, 'project-stale-open')
  assert.equal(useWorkflowStore.getState().projectId, 'project-stale-open')
  assert.equal(useWorkflowStore.getState().projectName, '修仙传')
  assert.equal(useWorkflowStore.getState().currentStage, 'script')
  assert.equal(useWorkflowStore.getState().generationStatus, null)
  assert.equal(useWorkflowStore.getState().chatMessages.length, 1)
  assert.deepEqual(useWorkflowStore.getState().scriptRuntimeFailureHistory, ['runtime_interrupted'])
  assert.equal(useWorkflowStore.getState().scriptProgressBoard?.batchContext.status, 'failed')
  assert.equal(
    useWorkflowStore.getState().scriptFailureResolution?.errorMessage,
    'ai_request_timeout:45000ms'
  )
  assert.equal(useWorkflowStore.getState().visibleResult?.status, 'visible')
  assert.equal(useWorkflowStore.getState().formalRelease?.status, 'blocked')
  assert.equal(useStageStore.getState().outline.title, '修仙传')
  assert.equal(useStageStore.getState().characters.length, 1)
  assert.equal(useStageStore.getState().script.length, 1)
  // P2-1: saveGenerationStatus is no longer called by renderer for stale cleanup.
  // Main handles stale detection on workspace:get-project internally.
  assert.deepEqual(savedStatuses, [])
})

test('openProjectSession preserves persisted outline episodes instead of expanding them during hydration', async () => {
  resetStores()
  const project = createProjectSnapshot({
    stage: 'outline',
    generationStatus: null,
    outlineDraft: {
      title: '修仙传',
      genre: '仙侠',
      theme: '逆天改命',
      mainConflict: '宗门追杀',
      protagonist: '林玄',
      summary: '第1集：林玄逃亡。第2集：宗门逼近。',
      summaryEpisodes: [],
      facts: []
    },
    detailedOutlineSegments: [],
    scriptDraft: [],
    scriptProgressBoard: null,
    scriptResumeResolution: null,
    scriptFailureResolution: null,
    scriptRuntimeFailureHistory: []
  })
  const savedStatuses = []

  globalThis.window = {
    api: {
      system: {
        appendDiagnosticLog: async () => undefined
      },
      workspace: {
        getProject: async (projectId) => {
          assert.equal(projectId, 'project-stale-open')
          return project
        },
        saveGenerationStatus: async (input) => {
          savedStatuses.push(input)
          project.generationStatus = input.generationStatus
          return project
        }
      }
    }
  }

  const result = await openProjectSession('project-stale-open')

  assert.ok(result)
  assert.equal(useWorkflowStore.getState().currentStage, 'outline')
  assert.equal(useStageStore.getState().outline.summary, '第1集：林玄逃亡。第2集：宗门逼近。')
  assert.equal(useStageStore.getState().outline.summaryEpisodes.length, 0)
  assert.deepEqual(savedStatuses, [])
})

test('switchStageSession lets renderer inspect an earlier stage without mutating the project stage truth', async () => {
  resetStores()
  const project = createProjectSnapshot({
    stage: 'outline',
    generationStatus: null,
    outlineDraft: {
      title: '修仙传',
      genre: '仙侠',
      theme: '逆天改命',
      mainConflict: '宗门追杀',
      protagonist: '林玄',
      summary: '第1集：林玄逃亡。第2集：宗门逼近。',
      summaryEpisodes: [],
      facts: []
    },
    detailedOutlineSegments: [],
    scriptDraft: [],
    scriptProgressBoard: null,
    scriptFailureResolution: null,
    scriptRuntimeFailureHistory: []
  })

  globalThis.window = {
    api: {
      system: {
        appendDiagnosticLog: async () => undefined
      },
      workspace: {
        getProject: async (projectId) => {
          assert.equal(projectId, 'project-stale-open')
          return project
        }
      }
    }
  }

  const result = await switchStageSession('project-stale-open', 'chat')

  assert.ok(result)
  assert.equal(result.nextStage, 'outline')
  assert.equal(result.project?.stage, 'outline')
  assert.equal(
    useWorkflowStore.getState().currentStage,
    'chat',
    'renderer should show the stage the user clicked, even when project.stage stays authoritative'
  )
})
