import test from 'node:test'
import assert from 'node:assert/strict'

import type { AuthorityFailureDto } from '../../../../shared/contracts/authority-failure.ts'
import type { WorkflowAuthorityErrorEnvelopeDto } from '../../../../shared/contracts/workflow.ts'
import { createAuthorityFailureNotice } from './authority-failure-notice.ts'

function buildAuthorityFailureDto(
  noticeKey: AuthorityFailureDto['noticeKey'],
  overrides?: Partial<AuthorityFailureDto>
): AuthorityFailureDto {
  return {
    type: 'authority_failure',
    failureType: 'ipc_failure',
    code: 'AUTHORITY_FAILURE_IPC_FAILURE',
    message: 'IPC failed',
    context: {
      fact: 'test',
      source: 'ipc'
    },
    recoverability: 'manual_retry',
    recoverable: true,
    noticeKey,
    occurredAt: new Date().toISOString(),
    ...overrides
  }
}

test('maps authority.ipc_unavailable to GenerationNotice with ipc_unavailable semantics', () => {
  const dto = buildAuthorityFailureDto('authority.ipc_unavailable')
  const notice = createAuthorityFailureNotice(dto)

  assert.equal(notice.kind, 'error')
  assert.ok(notice.title)
  assert.ok(notice.detail)
})

test('maps authority.project_missing to GenerationNotice with project_missing semantics', () => {
  const dto = buildAuthorityFailureDto('authority.project_missing')
  const notice = createAuthorityFailureNotice(dto)

  assert.equal(notice.kind, 'error')
  assert.ok(notice.title)
  assert.ok(notice.detail)
})

test('maps authority.result_missing to GenerationNotice with result_missing semantics', () => {
  const dto = buildAuthorityFailureDto('authority.result_missing')
  const notice = createAuthorityFailureNotice(dto)

  assert.equal(notice.kind, 'error')
  assert.ok(notice.title)
})

test('maps authority.result_incomplete to GenerationNotice with result_incomplete semantics', () => {
  const dto = buildAuthorityFailureDto('authority.result_incomplete')
  const notice = createAuthorityFailureNotice(dto)

  assert.equal(notice.kind, 'error')
  assert.ok(notice.title)
})

test('maps authority.result_stale to GenerationNotice with result_stale semantics', () => {
  const dto = buildAuthorityFailureDto('authority.result_stale')
  const notice = createAuthorityFailureNotice(dto)

  assert.equal(notice.kind, 'error')
  assert.ok(notice.title)
})

test('maps authority.main_exception to GenerationNotice with main_exception semantics', () => {
  const dto = buildAuthorityFailureDto('authority.main_exception')
  const notice = createAuthorityFailureNotice(dto)

  assert.equal(notice.kind, 'error')
  assert.ok(notice.title)
})

test('maps authority.orchestrator_bypass to GenerationNotice with orchestrator_bypass semantics', () => {
  const dto = buildAuthorityFailureDto('authority.orchestrator_bypass')
  const notice = createAuthorityFailureNotice(dto)

  assert.equal(notice.kind, 'error')
  assert.ok(notice.title)
})

test('maps authority.fallback_forbidden to GenerationNotice with fallback_forbidden semantics', () => {
  const dto = buildAuthorityFailureDto('authority.fallback_forbidden')
  const notice = createAuthorityFailureNotice(dto)

  assert.equal(notice.kind, 'error')
  assert.ok(notice.title)
})

test('extracts error from WorkflowAuthorityErrorEnvelopeDto', () => {
  const envelope: WorkflowAuthorityErrorEnvelopeDto = {
    error: buildAuthorityFailureDto('authority.ipc_unavailable')
  }
  const notice = createAuthorityFailureNotice(envelope)

  assert.equal(notice.kind, 'error')
})

test('does not set primaryAction when not_recoverable', () => {
  const dto = buildAuthorityFailureDto('authority.main_exception', {
    recoverability: 'not_recoverable',
    recoverable: false
  })
  const notice = createAuthorityFailureNotice(dto)

  assert.equal(notice.primaryAction, undefined)
})

test('produces distinct notices for infrastructure vs business gate failures', () => {
  const ipcNotice = createAuthorityFailureNotice(
    buildAuthorityFailureDto('authority.ipc_unavailable')
  )
  const businessNotice = createAuthorityFailureNotice(
    buildAuthorityFailureDto('authority.result_incomplete')
  )

  assert.equal(ipcNotice.kind, 'error')
  assert.equal(businessNotice.kind, 'error')

  // The notices should be distinguishable by content
  const ipcDistinct =
    ipcNotice.title !== businessNotice.title || ipcNotice.detail !== businessNotice.detail
  assert.ok(ipcDistinct)
})
