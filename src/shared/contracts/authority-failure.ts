import type { WorkflowStage } from './workflow'

/**
 * Unified authority failure contract (T5)
 *
 * Goal:
 * - Stabilize failure semantics across IPC/main/renderer boundaries.
 * - Keep renderer as consumer-only: consume error DTO, no business fallback.
 */

export const AUTHORITY_FAILURE_TYPES = [
  'ipc_failure',
  'project_missing',
  'authority_result_null',
  'incomplete_result',
  'stale_result',
  'main_exception',
  'orchestrator_bypass'
] as const

export type AuthorityFailureTypeDto = (typeof AUTHORITY_FAILURE_TYPES)[number]

/**
 * Stable error code space for authority failures.
 * Mirrors constitution semantics while remaining contract-layer friendly.
 */
export const AUTHORITY_FAILURE_CODES = [
  'AUTHORITY_FAILURE_IPC_FAILURE',
  'AUTHORITY_FAILURE_PROJECT_MISSING',
  'AUTHORITY_FAILURE_AUTHORITY_RESULT_NULL',
  'AUTHORITY_FAILURE_INCOMPLETE_RESULT',
  'AUTHORITY_FAILURE_STALE_RESULT',
  'AUTHORITY_FAILURE_MAIN_EXCEPTION',
  'AUTHORITY_FAILURE_ORCHESTRATOR_BYPASS',
  'AUTHORITY_CONSTITUTION_CATCH_SET_STAGE',
  'AUTHORITY_CONSTITUTION_MISSING_RESULT',
  'AUTHORITY_CONSTITUTION_STALE_STATE',
  'AUTHORITY_CONSTITUTION_IPC_FAILURE',
  'AUTHORITY_CONSTITUTION_INCOMPLETE_RESULT',
  'AUTHORITY_CONSTITUTION_UNKNOWN_DEFAULT',
  'AUTHORITY_CONSTITUTION_RENDERER_DERIVED',
  'AUTHORITY_CONSTITUTION_IPC_RETRY'
] as const

export type AuthorityFailureCodeDto = (typeof AUTHORITY_FAILURE_CODES)[number]

export const AUTHORITY_FAILURE_RECOVERABILITY = [
  'manual_retry',
  'refresh_project',
  'fix_contract_input',
  'reload_workspace',
  'not_recoverable'
] as const

export type AuthorityFailureRecoverabilityDto = (typeof AUTHORITY_FAILURE_RECOVERABILITY)[number]

/**
 * User-facing notice key (renderer should map by key, not by ad-hoc fallback logic).
 */
export const AUTHORITY_FAILURE_NOTICE_KEYS = [
  'authority.ipc_unavailable',
  'authority.project_missing',
  'authority.result_missing',
  'authority.result_incomplete',
  'authority.result_stale',
  'authority.main_exception',
  'authority.orchestrator_bypass',
  'authority.fallback_forbidden'
] as const

export type AuthorityFailureNoticeKeyDto = (typeof AUTHORITY_FAILURE_NOTICE_KEYS)[number]

export interface AuthorityFailureContextDto {
  fact: string
  stage?: WorkflowStage
  projectId?: string
  source: 'ipc' | 'main' | 'renderer' | 'orchestrator'
  pattern?: string
  traceId?: string
  metadata?: Record<string, unknown>
}

export interface AuthorityFailureDto {
  type: 'authority_failure'
  failureType: AuthorityFailureTypeDto
  code: AuthorityFailureCodeDto
  message: string
  context: AuthorityFailureContextDto
  recoverability: AuthorityFailureRecoverabilityDto
  recoverable: boolean
  noticeKey: AuthorityFailureNoticeKeyDto
  occurredAt: string
}

/**
 * Minimal compatibility bridge for existing failure payloads.
 * Existing callers may still provide reason/kind/errorMessage while migrating.
 */
export interface LegacyFailureShapeDto {
  reason?: string
  kind?: 'retry' | 'stopped' | 'failed'
  errorMessage?: string
  code?: string
}

export type AuthorityFailureLikeDto = AuthorityFailureDto | LegacyFailureShapeDto

/**
 * Notice contract suggestion (code -> noticeKey)
 *
 * This mapping is intentionally colocated with DTO to enforce stable renderer consumption.
 */
export const AUTHORITY_FAILURE_NOTICE_MAP: Record<
  AuthorityFailureCodeDto,
  AuthorityFailureNoticeKeyDto
> = {
  AUTHORITY_FAILURE_IPC_FAILURE: 'authority.ipc_unavailable',
  AUTHORITY_FAILURE_PROJECT_MISSING: 'authority.project_missing',
  AUTHORITY_FAILURE_AUTHORITY_RESULT_NULL: 'authority.result_missing',
  AUTHORITY_FAILURE_INCOMPLETE_RESULT: 'authority.result_incomplete',
  AUTHORITY_FAILURE_STALE_RESULT: 'authority.result_stale',
  AUTHORITY_FAILURE_MAIN_EXCEPTION: 'authority.main_exception',
  AUTHORITY_FAILURE_ORCHESTRATOR_BYPASS: 'authority.orchestrator_bypass',
  AUTHORITY_CONSTITUTION_CATCH_SET_STAGE: 'authority.fallback_forbidden',
  AUTHORITY_CONSTITUTION_MISSING_RESULT: 'authority.fallback_forbidden',
  AUTHORITY_CONSTITUTION_STALE_STATE: 'authority.fallback_forbidden',
  AUTHORITY_CONSTITUTION_IPC_FAILURE: 'authority.fallback_forbidden',
  AUTHORITY_CONSTITUTION_INCOMPLETE_RESULT: 'authority.fallback_forbidden',
  AUTHORITY_CONSTITUTION_UNKNOWN_DEFAULT: 'authority.fallback_forbidden',
  AUTHORITY_CONSTITUTION_RENDERER_DERIVED: 'authority.fallback_forbidden',
  AUTHORITY_CONSTITUTION_IPC_RETRY: 'authority.fallback_forbidden'
}
