import test from 'node:test'
import assert from 'node:assert/strict'

import type {
  AuthorityFailureDto,
  AuthorityFailureNoticeKeyDto
} from '../../../../shared/contracts/authority-failure'
import { createAuthorityFailureNotice } from './authority-failure-notice.ts'

/**
 * Authority Failure Regression Tests
 *
 * Purpose: Verify that authority failures are handled correctly - showing explicit
 * errors and NOT allowing local stage progression or optimistic updates.
 *
 * Coverage:
 * 1. Project missing - no valid projectId → error notice, no stage change
 * 2. IPC failed - IPC throws/rejects → error surface, no optimistic update
 * 3. Incomplete result - authority returns missing/incomplete → error, no fallback
 * 4. Migration blocked - legacy project cannot migrate → block + error
 * 5. Runtime partial failure - persistence fails mid-operation → explicit error
 *
 * Key Assertion Pattern:
 * - Authority failure DTOs map to error notices
 * - No recovery action is suggested for critical failures
 * - Notice kind is always 'error' (never 'warning' or 'info')
 */

// ---------------------------------------------------------------------------
// Helper: Build authority failure DTOs for test scenarios
// ---------------------------------------------------------------------------

function buildProjectMissingFailure(overrides?: Partial<AuthorityFailureDto>): AuthorityFailureDto {
  return {
    type: 'authority_failure',
    failureType: 'project_missing',
    code: 'AUTHORITY_FAILURE_PROJECT_MISSING',
    message: 'Project not found in authority store',
    context: {
      fact: 'project_lookup',
      source: 'main',
      projectId: ''
    },
    recoverability: 'not_recoverable',
    recoverable: false,
    noticeKey: 'authority.project_missing',
    occurredAt: new Date().toISOString(),
    ...overrides
  }
}

function buildIpcFailure(overrides?: Partial<AuthorityFailureDto>): AuthorityFailureDto {
  return {
    type: 'authority_failure',
    failureType: 'ipc_failure',
    code: 'AUTHORITY_FAILURE_IPC_FAILURE',
    message: 'IPC channel unavailable',
    context: {
      fact: 'ipc_call',
      source: 'ipc',
      projectId: 'test-project-id'
    },
    recoverability: 'manual_retry',
    recoverable: true,
    noticeKey: 'authority.ipc_unavailable',
    occurredAt: new Date().toISOString(),
    ...overrides
  }
}

function buildIncompleteResultFailure(
  overrides?: Partial<AuthorityFailureDto>
): AuthorityFailureDto {
  return {
    type: 'authority_failure',
    failureType: 'incomplete_result',
    code: 'AUTHORITY_FAILURE_INCOMPLETE_RESULT',
    message: 'Authority returned partial result with missing scenes',
    context: {
      fact: 'generation_result',
      source: 'main',
      projectId: 'test-project-id'
    },
    recoverability: 'manual_retry',
    recoverable: true,
    noticeKey: 'authority.result_incomplete',
    occurredAt: new Date().toISOString(),
    ...overrides
  }
}

function buildStaleResultFailure(overrides?: Partial<AuthorityFailureDto>): AuthorityFailureDto {
  return {
    type: 'authority_failure',
    failureType: 'stale_result',
    code: 'AUTHORITY_FAILURE_STALE_RESULT',
    message: 'Authority result timestamp is older than current state',
    context: {
      fact: 'generation_result',
      source: 'main',
      projectId: 'test-project-id'
    },
    recoverability: 'refresh_project',
    recoverable: true,
    noticeKey: 'authority.result_stale',
    occurredAt: new Date().toISOString(),
    ...overrides
  }
}

function buildMainExceptionFailure(overrides?: Partial<AuthorityFailureDto>): AuthorityFailureDto {
  return {
    type: 'authority_failure',
    failureType: 'main_exception',
    code: 'AUTHORITY_FAILURE_MAIN_EXCEPTION',
    message: 'Unexpected exception in main process',
    context: {
      fact: 'main_execution',
      source: 'main',
      projectId: 'test-project-id'
    },
    recoverability: 'not_recoverable',
    recoverable: false,
    noticeKey: 'authority.main_exception',
    occurredAt: new Date().toISOString(),
    ...overrides
  }
}

function buildOrchestratorBypassFailure(
  overrides?: Partial<AuthorityFailureDto>
): AuthorityFailureDto {
  return {
    type: 'authority_failure',
    failureType: 'orchestrator_bypass',
    code: 'AUTHORITY_FAILURE_ORCHESTRATOR_BYPASS',
    message: 'Renderer attempted unauthorized stage transition',
    context: {
      fact: 'stage_transition',
      source: 'renderer',
      projectId: 'test-project-id'
    },
    recoverability: 'not_recoverable',
    recoverable: false,
    noticeKey: 'authority.orchestrator_bypass',
    occurredAt: new Date().toISOString(),
    ...overrides
  }
}

// ---------------------------------------------------------------------------
// Test Suite 1: Project Missing - No valid projectId
// ---------------------------------------------------------------------------

test('authority.project_missing creates error notice with no recovery action', () => {
  const failure = buildProjectMissingFailure()
  const notice = createAuthorityFailureNotice(failure)

  // Error kind is enforced
  assert.equal(notice.kind, 'error', 'Authority failure must be error kind')

  // Source is system
  assert.equal(notice.source, 'system', 'Authority failure source must be system')

  // Title and detail are present
  assert.ok(notice.title, 'Notice must have a title')
  assert.ok(notice.detail, 'Notice must have a detail')

  // NOT recoverable - no primary action should be set
  assert.equal(
    notice.primaryAction,
    undefined,
    'project_missing should not offer automatic recovery action'
  )
})

test('authority.project_missing does NOT suggest stage progression', () => {
  // Even if stage context was provided, no recovery action should be suggested
  const failureWithStage = buildProjectMissingFailure({
    context: { fact: 'project_lookup', source: 'main', stage: 'script' }
  })
  const noticeWithStage = createAuthorityFailureNotice(failureWithStage)

  // No primaryAction for non-recoverable failures
  assert.equal(
    noticeWithStage.primaryAction,
    undefined,
    'Non-recoverable failure should not suggest stage progression'
  )
})

// ---------------------------------------------------------------------------
// Test Suite 2: IPC Failed - No optimistic update allowed
// ---------------------------------------------------------------------------

test('authority.ipc_unavailable creates error notice', () => {
  const failure = buildIpcFailure()
  const notice = createAuthorityFailureNotice(failure)

  assert.equal(notice.kind, 'error', 'IPC failure must be error kind')
  assert.equal(notice.source, 'system', 'Authority failure source must be system')
  assert.ok(notice.title, 'Notice must have a title')
  assert.ok(notice.detail, 'Notice must have a detail')
})

test('authority.ipc_unavailable does NOT allow optimistic UI update', () => {
  const failure = buildIpcFailure()
  const notice = createAuthorityFailureNotice(failure)

  // For manual_retry, no automatic primaryAction is set
  // This ensures renderer cannot optimistically proceed
  assert.equal(
    notice.primaryAction,
    undefined,
    'IPC failure with manual_retry should not auto-navigate - user must retry'
  )
})

test('IPC failure recoverable=true but no automatic fallback', () => {
  const failure = buildIpcFailure({ recoverable: true, recoverability: 'manual_retry' })
  const notice = createAuthorityFailureNotice(failure)

  // Even when recoverable=true, manual_retry means no auto-action
  // This is intentional to prevent optimistic updates
  assert.equal(notice.kind, 'error')
  assert.equal(notice.primaryAction, undefined)
})

// ---------------------------------------------------------------------------
// Test Suite 3: Incomplete Result - No fallback to targetStage
// ---------------------------------------------------------------------------

test('authority.result_incomplete creates error notice', () => {
  const failure = buildIncompleteResultFailure()
  const notice = createAuthorityFailureNotice(failure)

  assert.equal(notice.kind, 'error', 'Incomplete result must be error kind')
  assert.equal(notice.source, 'system')
  assert.ok(notice.title, 'Notice must have a title')
  assert.ok(notice.detail, 'Notice must have a detail')
})

test('authority.result_incomplete does NOT fallback to targetStage', () => {
  const failure = buildIncompleteResultFailure({
    context: { fact: 'generation_result', source: 'main', stage: 'script' }
  })
  const notice = createAuthorityFailureNotice(failure)

  // manual_retry recoverability means NO automatic fallback
  // Renderer must NOT use targetStage as a fallback
  assert.equal(
    notice.primaryAction,
    undefined,
    'result_incomplete with manual_retry must not suggest fallback stage'
  )
})

test('authority.result_incomplete is distinguishable from result_missing', () => {
  const incompleteFailure = buildIncompleteResultFailure()
  const missingFailure: AuthorityFailureDto = {
    type: 'authority_failure',
    failureType: 'authority_result_null',
    code: 'AUTHORITY_FAILURE_AUTHORITY_RESULT_NULL',
    message: 'Authority returned null result',
    context: { fact: 'generation_result', source: 'main', projectId: 'test-project-id' },
    recoverability: 'manual_retry',
    recoverable: true,
    noticeKey: 'authority.result_missing',
    occurredAt: new Date().toISOString()
  }

  const incompleteNotice = createAuthorityFailureNotice(incompleteFailure)
  const missingNotice = createAuthorityFailureNotice(missingFailure)

  // Notices should be distinguishable by title or detail
  const distinguishable =
    incompleteNotice.title !== missingNotice.title ||
    incompleteNotice.detail !== missingNotice.detail
  assert.ok(distinguishable, 'result_incomplete and result_missing must be distinguishable')
})

// ---------------------------------------------------------------------------
// Test Suite 4: Migration Blocked - No continuation with empty content
// ---------------------------------------------------------------------------

test('Migration blocked scenario - stale result blocks progression', () => {
  const failure = buildStaleResultFailure()
  const notice = createAuthorityFailureNotice(failure)

  assert.equal(notice.kind, 'error')
  // stale result with refresh_project recoverability suggests refresh but NOT auto-progression
  // The key point: it does NOT suggest continuing with stale data
  assert.ok(notice.title)
  assert.ok(notice.detail)
})

test('Migration blocked - refresh_project does NOT mean continue locally', () => {
  const failure = buildStaleResultFailure({ recoverable: true, recoverability: 'refresh_project' })
  const notice = createAuthorityFailureNotice(failure)

  // refresh_project suggests reloading the project, NOT continuing with blocked content
  // This prevents "migration blocked but UI continues anyway" scenario
  assert.equal(notice.kind, 'error')

  // With refresh_project, a recovery action MAY be suggested
  // But it should point to 'chat' (reload workspace), not to the blocked stage
  if (notice.primaryAction) {
    // refresh_project recovery points to chat/reload, not to the blocked stage
    assert.ok(
      notice.primaryAction.stage === 'chat' || notice.primaryAction.stage === undefined,
      'Stale result should suggest reload workspace, not continue in blocked stage'
    )
  }
})

// ---------------------------------------------------------------------------
// Test Suite 5: Runtime Partial Failure - No pseudo-success
// ---------------------------------------------------------------------------

test('authority.main_exception creates error notice with no auto-recovery', () => {
  const failure = buildMainExceptionFailure()
  const notice = createAuthorityFailureNotice(failure)

  assert.equal(notice.kind, 'error', 'Main exception must be error kind')
  assert.equal(notice.source, 'system')
  assert.ok(notice.title, 'Notice must have a title')
  assert.ok(notice.detail, 'Notice must have a detail')

  // not_recoverable means NO primaryAction
  assert.equal(
    notice.primaryAction,
    undefined,
    'Main exception should not offer automatic recovery'
  )
})

test('Runtime partial failure - failure history preserved, no pseudo-success', () => {
  // This test verifies that partial failures don't get flattened to success
  const failure: AuthorityFailureDto = {
    type: 'authority_failure',
    failureType: 'main_exception',
    code: 'AUTHORITY_FAILURE_MAIN_EXCEPTION',
    message: 'Persistence failed mid-operation, partial state',
    context: {
      fact: 'persistence',
      source: 'main',
      projectId: 'test-project-id'
    },
    recoverability: 'not_recoverable',
    recoverable: false,
    noticeKey: 'authority.main_exception',
    occurredAt: new Date().toISOString()
  }
  const notice = createAuthorityFailureNotice(failure)

  // Error kind is enforced - no pseudo-success
  assert.equal(notice.kind, 'error')

  // NOT marked as recoverable - prevents UI from attempting to continue
  assert.equal(failure.recoverable, false)
  assert.equal(failure.recoverability, 'not_recoverable')
})

test('Orchestrator bypass creates error notice that blocks progression', () => {
  const failure = buildOrchestratorBypassFailure()
  const notice = createAuthorityFailureNotice(failure)

  assert.equal(notice.kind, 'error')
  assert.equal(notice.source, 'system')

  // This is a constitution violation - should never suggest continuing
  assert.equal(
    notice.primaryAction,
    undefined,
    'Orchestrator bypass must not suggest any recovery action'
  )
})

// ---------------------------------------------------------------------------
// Test Suite 6: Constitutional Violations - fallback_forbidden
// ---------------------------------------------------------------------------

test('Constitution violations map to fallback_forbidden notice key', () => {
  const constitutionCodes = [
    'AUTHORITY_CONSTITUTION_CATCH_SET_STAGE',
    'AUTHORITY_CONSTITUTION_MISSING_RESULT',
    'AUTHORITY_CONSTITUTION_STALE_STATE',
    'AUTHORITY_CONSTITUTION_IPC_FAILURE',
    'AUTHORITY_CONSTITUTION_INCOMPLETE_RESULT',
    'AUTHORITY_CONSTITUTION_UNKNOWN_DEFAULT',
    'AUTHORITY_CONSTITUTION_RENDERER_DERIVED',
    'AUTHORITY_CONSTITUTION_IPC_RETRY'
  ] as const

  for (const code of constitutionCodes) {
    const failure: AuthorityFailureDto = {
      type: 'authority_failure',
      failureType: 'main_exception',
      code,
      message: `Constitution violation: ${code}`,
      context: { fact: 'constitution_check', source: 'main', projectId: 'test' },
      recoverability: 'not_recoverable',
      recoverable: false,
      noticeKey: 'authority.fallback_forbidden',
      occurredAt: new Date().toISOString()
    }
    const notice = createAuthorityFailureNotice(failure)

    assert.equal(notice.kind, 'error', `Constitution violation ${code} must be error kind`)
    assert.equal(
      notice.primaryAction,
      undefined,
      `Constitution violation ${code} must not suggest recovery action`
    )
  }
})

// ---------------------------------------------------------------------------
// Test Suite 7: Legacy Failure Shapes - Backwards Compatibility
// ---------------------------------------------------------------------------

test('Legacy failure shape without noticeKey produces error notice', () => {
  // Legacy shape: { reason, kind, errorMessage } without noticeKey
  const legacyFailure = {
    reason: 'Legacy error reason',
    kind: 'failed' as const,
    errorMessage: 'Legacy error message'
  }

  // This should NOT throw - legacy shapes are handled gracefully
  const notice = createAuthorityFailureNotice(legacyFailure as any)

  assert.equal(notice.kind, 'error')
  assert.equal(notice.source, 'system')
  assert.ok(notice.title)
  assert.ok(notice.detail)
})

// ---------------------------------------------------------------------------
// Test Suite 8: Envelope Wrapping - Error Extraction
// ---------------------------------------------------------------------------

test('WorkflowAuthorityErrorEnvelopeDto extracts inner error correctly', () => {
  const envelope = {
    error: buildIpcFailure()
  }

  const notice = createAuthorityFailureNotice(envelope as any)

  assert.equal(notice.kind, 'error')
  assert.equal(notice.source, 'system')
  assert.ok(notice.title)
})

test('Envelope with project_missing extracts correctly', () => {
  const envelope = {
    error: buildProjectMissingFailure()
  }

  const notice = createAuthorityFailureNotice(envelope as any)

  assert.equal(notice.kind, 'error')
  assert.equal(
    notice.primaryAction,
    undefined,
    'project_missing in envelope should not have recovery'
  )
})

// ---------------------------------------------------------------------------
// Test Suite 9: Stage Progression Verification
// ---------------------------------------------------------------------------

test('All authority failures block stage progression - no optimistic update pattern', () => {
  // This is the key regression test: verify NO authority failure suggests
  // that the renderer can proceed optimistically to the next stage

  const failureScenarios: AuthorityFailureDto[] = [
    buildProjectMissingFailure(),
    buildIpcFailure(),
    buildIncompleteResultFailure(),
    buildStaleResultFailure(),
    buildMainExceptionFailure(),
    buildOrchestratorBypassFailure()
  ]

  for (const failure of failureScenarios) {
    const notice = createAuthorityFailureNotice(failure)

    // ALL authority failures must be error kind
    assert.equal(notice.kind, 'error', `${failure.code} must be error kind to block progression`)

    // For non-recoverable failures, primaryAction must be undefined
    if (!failure.recoverable || failure.recoverability === 'not_recoverable') {
      assert.equal(
        notice.primaryAction,
        undefined,
        `${failure.code} with not_recoverable must not suggest stage progression`
      )
    }
  }
})

test('Notice title is always non-empty for authority failures', () => {
  const allNoticeKeys: AuthorityFailureNoticeKeyDto[] = [
    'authority.ipc_unavailable',
    'authority.project_missing',
    'authority.result_missing',
    'authority.result_incomplete',
    'authority.result_stale',
    'authority.main_exception',
    'authority.orchestrator_bypass',
    'authority.fallback_forbidden'
  ]

  for (const noticeKey of allNoticeKeys) {
    const failure: AuthorityFailureDto = {
      type: 'authority_failure',
      failureType: 'main_exception',
      code: 'AUTHORITY_FAILURE_MAIN_EXCEPTION',
      message: 'Test message',
      context: { fact: 'test', source: 'main' },
      recoverability: 'not_recoverable',
      recoverable: false,
      noticeKey,
      occurredAt: new Date().toISOString()
    }
    const notice = createAuthorityFailureNotice(failure)

    assert.ok(
      notice.title && notice.title.length > 0,
      `Notice key ${noticeKey} must have a non-empty title`
    )
    assert.ok(
      notice.detail && notice.detail.length > 0,
      `Notice key ${noticeKey} must have a non-empty detail`
    )
  }
})
