import type { StoryIntentPackageDto } from '../../contracts/intake'
import type { ScriptGenerationContractDto } from '../../contracts/script-generation-contract'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto
} from '../../contracts/workflow'
import { matchFormalFactLanding } from '../formal-fact/match-formal-fact-landing'
import { getConfirmedFormalFacts } from '../formal-fact/selectors'
import {
  buildStoryContract,
  buildUserAnchorLedger,
  collectMissingUserAnchorNames,
  hasHeroineAnchorCoverage
} from '../story-contract/story-contract-policy'

export function buildScriptGenerationContract(input: {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
  targetEpisodes: number
}): ScriptGenerationContractDto {
  const structuralActs = Array.from(
    new Set(
      input.segments.filter((segment) => segment.content.trim()).map((segment) => segment.act)
    )
  )
  const requiredActs: DetailedOutlineSegmentDto['act'][] = [
    'opening',
    'midpoint',
    'climax',
    'ending'
  ]
  const missingActs = requiredActs.filter((act) => !structuralActs.includes(act))
  const mergedSegments = input.segments.map((segment) => segment.content).join('\n')
  const confirmedFormalFacts = getConfirmedFormalFacts(input.outline)
  const missingFormalFactLandings = confirmedFormalFacts
    .filter((fact) => !matchFormalFactLanding(fact, mergedSegments))
    .map((fact) => fact.label)
  const storyContract = buildStoryContract({
    storyIntent: input.storyIntent,
    outline: input.outline,
    characters: input.characters
  })
  const userAnchorLedger = buildUserAnchorLedger({
    storyIntent: input.storyIntent,
    outline: input.outline,
    characters: input.characters
  })
  const missingAnchorNames = collectMissingUserAnchorNames(userAnchorLedger, input.characters)
  const heroineAnchorCovered = hasHeroineAnchorCoverage(userAnchorLedger, input.characters)

  return {
    ready:
      confirmedFormalFacts.length > 0 &&
      input.characters.length > 0 &&
      structuralActs.length >= 2 &&
      missingFormalFactLandings.length === 0 &&
      missingAnchorNames.length === 0 &&
      heroineAnchorCovered,
    targetEpisodes: input.targetEpisodes,
    structuralActs,
    missingActs,
    confirmedFormalFacts: confirmedFormalFacts.map((fact) => fact.label),
    missingFormalFactLandings,
    storyContract,
    userAnchorLedger,
    missingAnchorNames,
    heroineAnchorCovered
  }
}
