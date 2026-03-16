import type { StageContractType } from './stage-contract'
import type { StoryContractDto, UserAnchorLedgerDto } from './story-contract'

export interface InputContractIssueDto {
  code: string
  message: string
}

export interface InputContractValidationDto {
  targetStage: StageContractType
  ready: boolean
  issues: InputContractIssueDto[]
  storyContract?: StoryContractDto
  userAnchorLedger?: UserAnchorLedgerDto
}
