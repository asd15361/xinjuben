import test from 'node:test'
import assert from 'node:assert/strict'

import type {
  AtomicSaveGenerationStateInputDto,
  SaveScriptRuntimeStateInputDto
} from '../../../shared/contracts/workspace'
import { resolvePersistedGenerationTruth } from '../../../shared/domain/workflow/persisted-generation-truth.ts'

test('SaveScriptRuntimeStateInputDto does not require renderer-supplied persisted truth', () => {
  const input: SaveScriptRuntimeStateInputDto = {
    projectId: 'project-1',
    scriptProgressBoard: null,
    scriptFailureResolution: null,
    scriptStateLedger: null,
    scriptPostflight: null
  }

  assert.equal(input.scriptStateLedger, null)
  assert.equal(input.scriptPostflight, null)
})

test('AtomicSaveGenerationStateInputDto does not require renderer-supplied persisted truth', () => {
  const input: AtomicSaveGenerationStateInputDto = {
    projectId: 'project-1',
    scriptProgressBoard: null,
    scriptFailureResolution: null,
    scriptStateLedger: null,
    scriptRuntimeFailureHistory: [],
    scriptPostflight: null
  }

  assert.deepEqual(input.scriptRuntimeFailureHistory, [])
  assert.equal(input.scriptPostflight, null)
})

test('resolvePersistedGenerationTruth releases visible persisted script draft', () => {
  const result = resolvePersistedGenerationTruth({
    generationStatus: null,
    scriptFailureResolution: null,
    scriptDraft: [{ sceneNo: 1, screenplay: '第1集', action: '', dialogue: '', emotion: '' }]
  })

  assert.equal(result.visibleResult.status, 'visible')
  assert.equal(result.visibleResult.payload?.length, 1)
  assert.equal(result.formalRelease.status, 'released')
  assert.equal(result.formalRelease.blockedBy.length, 0)
})

test('persisted generation truth can be derived from authoritative runtime inputs without renderer truth fields', () => {
  const result = resolvePersistedGenerationTruth({
    generationStatus: null,
    scriptDraft: [{ sceneNo: 1, screenplay: '第1集', action: '', dialogue: '', emotion: '' }],
    scriptFailureResolution: null
  })

  assert.equal(result.visibleResult.status, 'visible')
  assert.equal(result.visibleResult.payload?.length, 1)
  assert.equal(result.formalRelease.status, 'released')
})

test('resolvePersistedGenerationTruth keeps visible result released even when quality signal is still false', () => {
  const result = resolvePersistedGenerationTruth({
    generationStatus: null,
    scriptFailureResolution: null,
    scriptDraft: [{ sceneNo: 1, screenplay: '第1集', action: '', dialogue: '', emotion: '' }],
    scriptStateLedger: {
      semanticHash: 'hash',
      sceneCount: 1,
      latestHook: '钩子',
      recentSceneNos: [1],
      unresolvedSignals: [],
      characters: [],
      factState: {
        theme: '主题',
        mainConflict: '冲突',
        confirmedFormalFacts: [],
        protectedFacts: [],
        lastUpdatedAt: new Date().toISOString()
      },
      anchorState: {
        requiredAnchorNames: [],
        missingAnchorNames: [],
        heroineRequired: false,
        heroineHint: '',
        heroineCovered: true
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
      preflight: {
        issues: [],
        assertionBlock: ''
      },
      postflight: {
        issues: [
          {
            severity: 'high',
            code: 'screenplay_quality_failed',
            detail: '第1集内容质量未过：字数低于850字合同'
          }
        ],
        pass: false,
        quality: {
          pass: false,
          episodeCount: 1,
          passedEpisodes: 0,
          averageCharCount: 640,
          weakEpisodes: [
            {
              sceneNo: 1,
              problems: ['字数低于850字合同'],
              charCount: 640,
              sceneCount: 2,
              hookLine: '待补'
            }
          ]
        },
        summary: '内容已经生成，但当前质量验收未通过。',
        patch: {
          previousSemanticHash: null,
          nextSemanticHash: 'next',
          updates: []
        }
      }
    }
  })

  assert.equal(result.visibleResult.status, 'visible')
  assert.equal(result.visibleResult.payload?.length, 1)
  assert.equal(result.formalRelease.status, 'released')
  assert.equal(result.formalRelease.blockedBy.length, 0)
})

test('resolvePersistedGenerationTruth keeps visible draft even when runtime failure exists', () => {
  const result = resolvePersistedGenerationTruth({
    generationStatus: null,
    scriptFailureResolution: {
      kind: 'failed',
      reason: '第3集请求超时',
      errorMessage: 'ai_request_timeout:120000ms',
      lockRecoveryAttempted: false
    },
    scriptDraft: [{ sceneNo: 1, screenplay: '第1集', action: '', dialogue: '', emotion: '' }]
  })

  assert.equal(result.visibleResult.status, 'visible')
  assert.equal(result.visibleResult.payload?.length, 1)
  assert.equal(result.formalRelease.status, 'blocked')
  assert.equal(result.formalRelease.blockedBy[0]?.code, 'UNKNOWN_BLOCKED')
})
