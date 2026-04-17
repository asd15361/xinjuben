import type { InputContractIssueDto } from '../../../../shared/contracts/input-contract'
import type { InputContractIssueDisplayDto } from '../../../../shared/domain/workflow/input-contract-issue'
import type { WorkflowStage } from '../../../../shared/contracts/workflow'

export interface InputContractDisplayState {
  title: string
  detail: string
  stage: WorkflowStage
  actionLabel: string
}

type InputContractIssueWithDisplay = InputContractIssueDto & {
  display?: InputContractIssueDisplayDto
}

export function getInputContractDisplayState(
  issue: InputContractIssueWithDisplay | undefined
): InputContractDisplayState {
  if (issue?.display) {
    return issue.display
  }

  return {
    title: '现在还不能继续这一页',
    detail: issue?.message || '先回上一页把关键信息补齐，再继续。',
    stage: 'outline',
    actionLabel: '回上一页检查'
  }
}

export function getInputContractDisplayDetail(
  issue: InputContractIssueWithDisplay | undefined
): string {
  return getInputContractDisplayState(issue).detail
}
