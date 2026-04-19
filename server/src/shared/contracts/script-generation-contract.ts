import type { StoryContractDto, UserAnchorLedgerDto } from './story-contract'

export interface ScriptGenerationContractDto {
  ready: boolean
  targetEpisodes: number
  structuralActs: string[]
  missingActs: string[]
  confirmedFormalFacts: string[]
  missingFormalFactLandings: string[]
  storyContract: StoryContractDto
  userAnchorLedger: UserAnchorLedgerDto
  missingAnchorNames: string[]
  heroineAnchorCovered: boolean
}
