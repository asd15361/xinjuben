import type { FactionMatrixDto } from './faction-matrix.ts'

export interface WorldBibleDto {
  definition: string
  worldType: string
  eraAndSpace: string
  socialOrder: string
  historicalWound: string
  powerOrRuleSystem: string
  coreResources: string[]
  taboosAndCosts: string[]
  shootableLocations: string[]
  source: 'user_confirmed' | 'derived_from_story_intent' | 'ai_generated'
}

export type CharacterRosterLayer = 'core' | 'active' | 'functional' | 'crowd'

export interface CharacterRosterEntryDto {
  id: string
  name: string
  layer: CharacterRosterLayer
  identityMode: 'named' | 'slot'
  factionName?: string
  fieldName?: string
  duty: string
  needsFullProfile: boolean
  dialoguePotential: 'none' | 'one_line' | 'recurring'
  sourceEntityId?: string
}

export interface CharacterRosterDto {
  totalEpisodes: number
  minimumRoleSlots: number
  standardRoleSlots: number
  actualRoleSlots: number
  entries: CharacterRosterEntryDto[]
  scaleWarning?: string
}

export interface StoryFoundationDto {
  worldBible: WorldBibleDto
  factionMatrix: FactionMatrixDto | null
  characterRoster: CharacterRosterDto
}
