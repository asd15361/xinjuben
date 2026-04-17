import test from 'node:test'
import assert from 'node:assert/strict'

import {
  createFormalBlockedState,
  createFormalReleasedState,
  createInitialVisibleResult,
  createVisibleSuccessState
} from '../../../../shared/contracts/visible-release-state.ts'
import { buildPersistedGenerationResult } from './generation-result-truth.ts'

test('buildPersistedGenerationResult returns null when persisted dual-state truth is absent', () => {
  assert.equal(
    buildPersistedGenerationResult({
      visibleResult: null,
      formalRelease: null
    }),
    null
  )
})

test('buildPersistedGenerationResult preserves blocked formal release even when visible result exists', () => {
  const visibleResult = createVisibleSuccessState([], 'Visible draft exists')
  const formalRelease = createFormalBlockedState([
    {
      code: 'QUALITY_NOT_PASSED',
      message: 'Still blocked by independent gate',
      category: 'quality'
    }
  ])

  const result = buildPersistedGenerationResult({ visibleResult, formalRelease })

  assert.ok(result)
  assert.equal(result?.visibleResult.status, 'visible')
  assert.equal(result?.formalRelease.status, 'blocked')
  assert.equal(result?.isVisible, true)
  assert.equal(result?.isReleased, false)
})

test('buildPersistedGenerationResult preserves independently released formal truth', () => {
  const result = buildPersistedGenerationResult({
    visibleResult: {
      ...createInitialVisibleResult(),
      status: 'pending',
      description: 'Visible result still pending'
    },
    formalRelease: createFormalReleasedState('Released by stored gate verdict')
  })

  assert.ok(result)
  assert.equal(result?.visibleResult.status, 'pending')
  assert.equal(result?.formalRelease.status, 'released')
  assert.equal(result?.isVisible, false)
  assert.equal(result?.isReleased, true)
})
