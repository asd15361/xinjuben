import type { GenerationBriefCharacterCard } from './generation-brief-template'

export type FallbackSummaryFacts = {
  episodeCount: number
  protagonist: string
  antagonist: string
  protectTarget: string
  worldThreat: string
  keyAsset: string
  genreAndStyle: string
  projectTitle: string
  keyCharacters: string[]
  worldAndBackground: string
  coreConflict: string
  chainSynopsis: string
  characterCards: GenerationBriefCharacterCard[]
}
