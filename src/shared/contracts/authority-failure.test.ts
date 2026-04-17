import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AUTHORITY_FAILURE_TYPES,
  AUTHORITY_FAILURE_CODES,
  AUTHORITY_FAILURE_RECOVERABILITY,
  AUTHORITY_FAILURE_NOTICE_KEYS,
  AUTHORITY_FAILURE_NOTICE_MAP,
  type AuthorityFailureTypeDto,
  type AuthorityFailureCodeDto,
  type AuthorityFailureNoticeKeyDto,
  type AuthorityFailureDto,
  type AuthorityFailureContextDto
} from './authority-failure.ts'

test('AUTHORITY_FAILURE_TYPES contains all expected failure types', () => {
  const expectedTypes = [
    'ipc_failure',
    'project_missing',
    'authority_result_null',
    'incomplete_result',
    'stale_result',
    'main_exception',
    'orchestrator_bypass'
  ] as const

  assert.deepEqual(AUTHORITY_FAILURE_TYPES, expectedTypes)
})

test('AUTHORITY_FAILURE_CODES contains both AUTHORITY_FAILURE_* and AUTHORITY_CONSTITUTION_* codes', () => {
  const codes = AUTHORITY_FAILURE_CODES

  // Should have 7 AUTHORITY_FAILURE_* codes
  const authorityFailureCodes = codes.filter(
    (c) => c.startsWith('AUTHORITY_FAILURE_') && !c.startsWith('AUTHORITY_CONSTITUTION_')
  )
  assert.equal(authorityFailureCodes.length, 7)

  // Should have 8 AUTHORITY_CONSTITUTION_* codes
  const constitutionCodes = codes.filter((c) => c.startsWith('AUTHORITY_CONSTITUTION_'))
  assert.equal(constitutionCodes.length, 8)

  // Total should be 15
  assert.equal(codes.length, 15)
})

test('AUTHORITY_FAILURE_NOTICE_KEYS contains all expected notice keys', () => {
  const expectedKeys = [
    'authority.ipc_unavailable',
    'authority.project_missing',
    'authority.result_missing',
    'authority.result_incomplete',
    'authority.result_stale',
    'authority.main_exception',
    'authority.orchestrator_bypass',
    'authority.fallback_forbidden'
  ] as const

  assert.deepEqual(AUTHORITY_FAILURE_NOTICE_KEYS, expectedKeys)
})

test('AUTHORITY_FAILURE_RECOVERABILITY contains all expected recoverability options', () => {
  const expected = [
    'manual_retry',
    'refresh_project',
    'fix_contract_input',
    'reload_workspace',
    'not_recoverable'
  ] as const
  assert.deepEqual(AUTHORITY_FAILURE_RECOVERABILITY, expected)
})

test('AUTHORITY_FAILURE_NOTICE_MAP maps authority codes to notice keys correctly', () => {
  // IPC failure types should map to authority.ipc_unavailable or specific notice keys
  assert.equal(
    AUTHORITY_FAILURE_NOTICE_MAP['AUTHORITY_FAILURE_IPC_FAILURE'],
    'authority.ipc_unavailable'
  )

  // PROJECT_MISSING should map to authority.project_missing
  assert.equal(
    AUTHORITY_FAILURE_NOTICE_MAP['AUTHORITY_FAILURE_PROJECT_MISSING'],
    'authority.project_missing'
  )

  // RESULT_NULL should map to authority.result_missing
  assert.equal(
    AUTHORITY_FAILURE_NOTICE_MAP['AUTHORITY_FAILURE_AUTHORITY_RESULT_NULL'],
    'authority.result_missing'
  )

  // INCOMPLETE_RESULT should map to authority.result_incomplete
  assert.equal(
    AUTHORITY_FAILURE_NOTICE_MAP['AUTHORITY_FAILURE_INCOMPLETE_RESULT'],
    'authority.result_incomplete'
  )

  // All constitution violation codes should map to fallback_forbidden
  const constitutionCodes: AuthorityFailureCodeDto[] = [
    'AUTHORITY_CONSTITUTION_CATCH_SET_STAGE',
    'AUTHORITY_CONSTITUTION_MISSING_RESULT',
    'AUTHORITY_CONSTITUTION_STALE_STATE',
    'AUTHORITY_CONSTITUTION_IPC_FAILURE',
    'AUTHORITY_CONSTITUTION_INCOMPLETE_RESULT',
    'AUTHORITY_CONSTITUTION_UNKNOWN_DEFAULT',
    'AUTHORITY_CONSTITUTION_RENDERER_DERIVED',
    'AUTHORITY_CONSTITUTION_IPC_RETRY'
  ]

  for (const code of constitutionCodes) {
    assert.equal(
      AUTHORITY_FAILURE_NOTICE_MAP[code],
      'authority.fallback_forbidden',
      `Expected ${code} to map to authority.fallback_forbidden`
    )
  }
})

test('AUTHORITY_FAILURE_NOTICE_MAP has entries for all codes', () => {
  for (const code of AUTHORITY_FAILURE_CODES) {
    const noticeKey = AUTHORITY_FAILURE_NOTICE_MAP[code]
    assert.ok(
      AUTHORITY_FAILURE_NOTICE_KEYS.includes(
        noticeKey as (typeof AUTHORITY_FAILURE_NOTICE_KEYS)[number]
      ),
      `Notice key "${noticeKey}" for code "${code}" is not a valid notice key`
    )
  }
})

test('Authority failure types are distinguishable by notice semantics', () => {
  // Authority UNAVAILABLE situations (notice: authority.ipc_unavailable, authority.project_missing, authority.result_missing)
  const authorityUnavailableTypes: AuthorityFailureTypeDto[] = [
    'ipc_failure',
    'project_missing',
    'authority_result_null'
  ]

  // Business GATE BLOCKED situations (notice: authority.result_incomplete, authority.result_stale)
  const gateBlockedTypes: AuthorityFailureTypeDto[] = ['incomplete_result', 'stale_result']

  // System EXCEPTION situations (notice: authority.main_exception, authority.orchestrator_bypass)
  const systemExceptionTypes: AuthorityFailureTypeDto[] = ['main_exception', 'orchestrator_bypass']

  // Verify all types are categorized
  const allTypes = [...authorityUnavailableTypes, ...gateBlockedTypes, ...systemExceptionTypes]
  assert.equal(allTypes.length, AUTHORITY_FAILURE_TYPES.length)

  // Verify no overlap between categories
  const overlap1 = authorityUnavailableTypes.filter((t) => gateBlockedTypes.includes(t))
  const overlap2 = gateBlockedTypes.filter((t) => systemExceptionTypes.includes(t))
  const overlap3 = authorityUnavailableTypes.filter((t) => systemExceptionTypes.includes(t))
  assert.equal(
    overlap1.length,
    0,
    'authorityUnavailableTypes and gateBlockedTypes should not overlap'
  )
  assert.equal(overlap2.length, 0, 'gateBlockedTypes and systemExceptionTypes should not overlap')
  assert.equal(
    overlap3.length,
    0,
    'authorityUnavailableTypes and systemExceptionTypes should not overlap'
  )
})

test('AuthorityFailureContextDto can represent different sources', () => {
  const sources: AuthorityFailureContextDto['source'][] = [
    'ipc',
    'main',
    'renderer',
    'orchestrator'
  ]

  for (const source of sources) {
    const context: AuthorityFailureContextDto = {
      fact: 'stage',
      source,
      projectId: 'test-project-id'
    }
    assert.equal(context.source, source)
  }
})

test('AuthorityFailureDto structure is correct for IPC communication', () => {
  const dto: AuthorityFailureDto = {
    type: 'authority_failure',
    failureType: 'ipc_failure',
    code: 'AUTHORITY_FAILURE_IPC_FAILURE',
    message: 'IPC call failed',
    context: {
      fact: 'stage',
      source: 'ipc',
      projectId: 'test-project-id'
    },
    recoverability: 'manual_retry',
    recoverable: true,
    noticeKey: 'authority.ipc_unavailable',
    occurredAt: new Date().toISOString()
  }

  assert.equal(dto.type, 'authority_failure')
  assert.equal(dto.failureType, 'ipc_failure')
  assert.equal(dto.code, 'AUTHORITY_FAILURE_IPC_FAILURE')
  assert.equal(dto.noticeKey, 'authority.ipc_unavailable')
  assert.equal(dto.recoverable, true)
  assert.ok(AUTHORITY_FAILURE_TYPES.includes(dto.failureType))
  assert.ok(AUTHORITY_FAILURE_CODES.includes(dto.code))
  assert.ok(AUTHORITY_FAILURE_NOTICE_KEYS.includes(dto.noticeKey))
  assert.ok(AUTHORITY_FAILURE_RECOVERABILITY.includes(dto.recoverability))
})

test('notice key distinguishes authority unavailable from business gate blocked', () => {
  // These notice keys indicate authority system is unavailable
  const authorityUnavailableKeys: AuthorityFailureNoticeKeyDto[] = [
    'authority.ipc_unavailable',
    'authority.project_missing',
    'authority.result_missing'
  ]

  // These notice keys indicate business validation gate not passed
  const gateBlockedKeys: AuthorityFailureNoticeKeyDto[] = [
    'authority.result_incomplete',
    'authority.result_stale',
    'authority.main_exception',
    'authority.orchestrator_bypass'
  ]

  // fallback_forbidden is a special case - it indicates a constitutional violation
  const forbiddenKey: AuthorityFailureNoticeKeyDto = 'authority.fallback_forbidden'

  // Verify that authority unavailable keys are distinct from gate blocked keys
  const overlap = authorityUnavailableKeys.filter((k) => gateBlockedKeys.includes(k))
  assert.equal(overlap.length, 0, 'authorityUnavailableKeys and gateBlockedKeys should not overlap')

  // Verify forbidden key is separate
  const forbiddenInUnavailable = authorityUnavailableKeys.includes(forbiddenKey)
  const forbiddenInBlocked = gateBlockedKeys.includes(forbiddenKey)
  assert.equal(
    forbiddenInUnavailable || forbiddenInBlocked,
    false,
    'forbiddenKey should be distinct'
  )
})
