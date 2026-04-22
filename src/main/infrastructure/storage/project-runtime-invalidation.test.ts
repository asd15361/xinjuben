import test from 'node:test'
import assert from 'node:assert/strict'

import type { ProjectSnapshotDto } from '../../../shared/contracts/project.ts'
import {
  createFormalReleasedState,
  createVisibleSuccessState
} from '../../../shared/contracts/visible-release-state.ts'
import { invalidateScriptRuntimeState } from './project-runtime-invalidation.ts'

function createProject(): ProjectSnapshotDto {
  return {
    id: 'project-1',
    name: 'demo',
    workflowType: 'ai_write',
    stage: 'script',
    genre: '剧情',
    updatedAt: new Date().toISOString(),
    chatMessages: [],
    generationStatus: {
      task: 'script',
      stage: 'script',
      title: '正在生成剧本',
      detail: '',
      startedAt: Date.now(),
      estimatedSeconds: 20,
      scope: 'project'
    },
    storyIntent: null,
    entityStore: {
      characters: [],
      factions: [],
      locations: [],
      items: [],
      relations: []
    },
    outlineDraft: null,
    characterDrafts: [],
    activeCharacterBlocks: [],
    detailedOutlineSegments: [
      {
        act: 'opening',
        blockNo: 1,
        title: 'old',
        content: 'old',
        startEpisode: 1,
        endEpisode: 5,
        hookType: '推进',
        episodeBeats: []
      }
    ],
    detailedOutlineBlocks: [
      { blockNo: 1, startEpisode: 1, endEpisode: 5, summary: 'old', sections: [], episodeBeats: [] }
    ],
    scriptDraft: [{ sceneNo: 1, screenplay: '第1集', action: '', dialogue: '', emotion: '' }],
    scriptProgressBoard: {
      episodeStatuses: [],
      batchContext: {
        currentBatchIndex: 1,
        batchSize: 5,
        startEpisode: 1,
        endEpisode: 5,
        status: 'running',
        resumeFromEpisode: 1,
        reason: '',
        stageContractFingerprint: 'fingerprint',
        updatedAt: new Date().toISOString()
      }
    },
    scriptFailureResolution: {
      kind: 'failed',
      reason: 'error',
      errorMessage: 'bad',
      lockRecoveryAttempted: false
    },
    scriptRuntimeFailureHistory: ['runtime_interrupted'],
    scriptStateLedger: {
      semanticHash: 'hash',
      sceneCount: 1,
      latestHook: 'hook',
      recentSceneNos: [1],
      unresolvedSignals: [],
      characters: [],
      factState: {
        theme: '',
        mainConflict: '',
        confirmedFormalFacts: [],
        protectedFacts: [],
        lastUpdatedAt: new Date().toISOString()
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
        previousCliffhanger: '',
        nextRequiredBridge: '',
        activeConflictLine: '',
        pendingCost: '',
        memoryEchoes: [],
        hardAnchors: []
      },
      knowledgeBoundaries: {
        perspectiveCharacter: null,
        publicFacts: [],
        hiddenFacts: [],
        forbiddenOmniscienceRules: []
      },
      eventLog: [],
      preflight: { issues: [], assertionBlock: '' },
      postflight: {
        issues: [{ severity: 'low', code: 'issue', detail: 'detail' }],
        summary: '',
        patch: {
          previousSemanticHash: null,
          nextSemanticHash: 'next',
          updates: []
        }
      }
    },
    visibleResult: createVisibleSuccessState(
      [{ sceneNo: 1, screenplay: '第1集', action: '', dialogue: '', emotion: '' }],
      'Visible before invalidation'
    ),
    formalRelease: createFormalReleasedState('Released before invalidation')
  }
}

test('invalidateScriptRuntimeState clears all downstream script runtime assets', () => {
  const result = invalidateScriptRuntimeState(createProject())

  assert.equal(result.generationStatus, null)
  assert.deepEqual(result.detailedOutlineSegments, [])
  assert.deepEqual(result.detailedOutlineBlocks, [])
  assert.deepEqual(result.scriptDraft, [])
  assert.equal(result.scriptProgressBoard, null)
  assert.equal(result.scriptFailureResolution, null)
  assert.deepEqual(result.scriptRuntimeFailureHistory, [])
  assert.equal(result.scriptStateLedger, null)
  assert.equal(result.visibleResult.status, 'none')
  assert.equal(result.formalRelease.status, 'blocked')
  assert.equal(result.stage, 'outline')
})
