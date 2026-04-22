import type {
  AuthorityFailureDto,
  AuthorityFailureNoticeKeyDto,
  AuthorityFailureLikeDto,
  LegacyFailureShapeDto
} from '../../../../shared/contracts/authority-failure.ts'
export type WorkflowAuthorityErrorEnvelopeDto = {
  error: AuthorityFailureDto
}
import type { GenerationNotice } from '../store/useWorkflowStore.ts'

/**
 * Canonical renderer mapping from authority failure DTO to GenerationNotice.
 *
 * Path: AuthorityFailureDto.noticeKey -> GenerationNotice
 *
 * This is the single canonical path for mapping authority failures to UI notices.
 * All renderer authority-failure notice creation should flow through this function.
 */

interface AuthorityNoticeDisplay {
  title: string
  detail: string
}

const AUTHORITY_NOTICE_DISPLAY_MAP: Record<AuthorityFailureNoticeKeyDto, AuthorityNoticeDisplay> = {
  'authority.ipc_unavailable': {
    title: '服务暂时不可用',
    detail: '无法连接到后台服务，请检查网络连接后重试。'
  },
  'authority.project_missing': {
    title: '项目未找到',
    detail: '该项目可能已被删除或移动，请回到项目列表重新选择。'
  },
  'authority.result_missing': {
    title: '生成结果缺失',
    detail: '后台没有返回有效结果，请重新尝试生成。'
  },
  'authority.result_incomplete': {
    title: '生成结果不完整',
    detail: '后台返回了不完整的结果，请重新尝试生成。'
  },
  'authority.result_stale': {
    title: '生成结果已过期',
    detail: '当前看到的结果不是最新状态，请刷新后重试。'
  },
  'authority.main_exception': {
    title: '后台处理异常',
    detail: '后台遇到了意外错误，请稍后重试。如果问题持续，请联系技术支持。'
  },
  'authority.orchestrator_bypass': {
    title: '操作被拒绝',
    detail: '当前操作不被允许，请检查是否在正确的阶段执行了正确的操作。'
  },
  'authority.fallback_forbidden': {
    title: '本地回退被禁止',
    detail: '不允许在本地进行回退操作。请通过正常流程重新尝试，或回到上一个有效阶段。'
  }
}

/**
 * Extracts the inner error DTO from an envelope if present.
 */
function extractAuthorityFailure(
  errorOrEnvelope: AuthorityFailureDto | WorkflowAuthorityErrorEnvelopeDto
): AuthorityFailureDto | AuthorityFailureLikeDto {
  if ('error' in errorOrEnvelope && errorOrEnvelope.error) {
    return errorOrEnvelope.error
  }
  return errorOrEnvelope as AuthorityFailureDto
}

/**
 * Returns true if the value is a proper AuthorityFailureDto (has noticeKey).
 */
function hasNoticeKey(
  error: AuthorityFailureDto | AuthorityFailureLikeDto
): error is AuthorityFailureDto {
  return 'noticeKey' in error && typeof error.noticeKey === 'string'
}

/**
 * Creates a GenerationNotice from an authority failure DTO or envelope.
 *
 * This is the canonical renderer mapper for authority failures -> UI notices.
 *
 * @param errorOrEnvelope - AuthorityFailureDto or WorkflowAuthorityErrorEnvelopeDto
 * @returns GenerationNotice suitable for setGenerationNotice()
 */
export function createAuthorityFailureNotice(
  errorOrEnvelope: AuthorityFailureDto | WorkflowAuthorityErrorEnvelopeDto
): GenerationNotice {
  const error = extractAuthorityFailure(errorOrEnvelope)

  // Handle legacy failure shapes that don't have noticeKey
  if (!hasNoticeKey(error)) {
    const legacyError = error as LegacyFailureShapeDto
    return {
      kind: 'error',
      title: '操作未能完成',
      detail: legacyError.errorMessage || legacyError.reason || '发生了未知错误，请稍后重试。'
    }
  }

  const display = AUTHORITY_NOTICE_DISPLAY_MAP[error.noticeKey] ?? {
    title: '操作未能完成',
    detail: error.message || '发生了未知错误，请稍后重试。'
  }

  // Determine if we can offer a recovery action based on recoverability
  const primaryAction = getRecoveryAction(error)

  return {
    kind: 'error',
    title: display.title,
    detail: display.detail,
    ...(primaryAction && { primaryAction })
  }
}

function getRecoveryAction(
  error: AuthorityFailureDto
): GenerationNotice['primaryAction'] | undefined {
  if (!error.recoverable) {
    return undefined
  }

  switch (error.recoverability) {
    case 'manual_retry':
      // For manual retry, we don't auto-navigate - just show the notice
      // The user can manually retry the action
      return undefined
    case 'refresh_project':
      return {
        label: '刷新项目',
        stage: error.context.stage ?? 'chat'
      }
    case 'reload_workspace':
      return {
        label: '重新加载',
        stage: 'chat'
      }
    case 'fix_contract_input':
      // Can't auto-fix - user needs to correct input
      return undefined
    case 'not_recoverable':
    default:
      return undefined
  }
}
