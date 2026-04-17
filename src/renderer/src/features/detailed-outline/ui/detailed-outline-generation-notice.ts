import { createInputContractIssue } from '../../../../../shared/domain/workflow/input-contract-issue.ts'
import { createStageGateNotice } from '../../../app/utils/generation-notice.ts'
import { getInputContractDisplayState } from '../../../app/utils/input-contract-display.ts'

const DETAILED_OUTLINE_INPUT_CONTRACT_CODES = new Set([
  'detailed_outline_character_missing',
  'detailed_outline_character_contract_weak',
  'detailed_outline_anchor_roster_missing'
])

function stripRemoteInvokeNoise(raw: string): string {
  return raw
    .trim()
    .replace(/^Error invoking remote method '[^']+':\s*(?:\w*Error:\s*)?/i, '')
    .replace(/^detailed_outline_generation_failed:/i, '')
}

export function buildDetailedOutlineFailureNotice(
  error: unknown
): ReturnType<typeof createStageGateNotice> {
  const raw =
    error instanceof Error ? error.message : typeof error === 'string' ? error : String(error || '')
  const normalized = stripRemoteInvokeNoise(raw)

  if (DETAILED_OUTLINE_INPUT_CONTRACT_CODES.has(normalized)) {
    const display = getInputContractDisplayState(createInputContractIssue(normalized, normalized))
    return createStageGateNotice({
      title: display.title,
      detail: display.detail,
      primaryAction: {
        label: display.actionLabel,
        stage: display.stage
      },
      secondaryAction: {
        label: '留在详细大纲页',
        stage: 'detailed_outline'
      }
    })
  }

  const timeoutMatch = normalized.match(/^ai_request_timeout:(\d+)ms$/i)
  if (timeoutMatch) {
    const seconds = Math.max(1, Math.round(Number(timeoutMatch[1]) / 1000))
    return createStageGateNotice({
      title: '详细大纲这次超时了',
      detail: `AI 请求超时（${seconds} 秒）。这一步还没有正式结果，直接重试即可。`,
      primaryAction: {
        label: '留在详细大纲页',
        stage: 'detailed_outline'
      }
    })
  }

  if (/^detailed_outline_model_incomplete$/i.test(normalized)) {
    return createStageGateNotice({
      title: '详细大纲这次没有补成功',
      detail: 'AI 已返回详细大纲，但结构没收完整，系统没法确认这版详纲。',
      primaryAction: {
        label: '留在详细大纲页',
        stage: 'detailed_outline'
      }
    })
  }

  if (/^workspace_generation_aborted:replaced$/i.test(normalized)) {
    return createStageGateNotice({
      title: '上一轮详细大纲请求已被新请求替换',
      detail: '同一项目的详细大纲任务又发起了一次，系统已自动取消旧请求，当前以后发起的那一轮为准。',
      primaryAction: {
        label: '留在详细大纲页',
        stage: 'detailed_outline'
      }
    })
  }

  return createStageGateNotice({
    title: '详细大纲这次没有补成功',
    detail: '这次是真失败。你可以直接重试，或者先手改当前材料再继续。',
    primaryAction: {
      label: '留在详细大纲页',
      stage: 'detailed_outline'
    }
  })
}
