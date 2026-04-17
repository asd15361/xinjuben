import type { InputContractIssueDto } from '../../../../../shared/contracts/input-contract'
import { getInputContractDisplayDetail, getInputContractDisplayState } from '../../../app/utils/input-contract-display'

export function getDetailedOutlineBlockedSummary(code: string | undefined, fallback: string | undefined): string {
  return getInputContractDisplayDetail(code ? ({ code, message: fallback } as InputContractIssueDto) : undefined)
}

export function getDetailedOutlineBlockedState(issue: InputContractIssueDto | undefined) {
  return getInputContractDisplayState(issue)
}
