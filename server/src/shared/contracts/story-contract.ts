export interface StoryContractCharacterSlotsDto {
  protagonist: string
  antagonist: string
  heroine: string
  mentor: string
}

export interface StoryContractEventSlotsDto {
  finalePayoff: string
  antagonistPressure: string
  antagonistLoveConflict: string
  relationshipShift: string
  healingTechnique: string
  themeRealization: string
}

export interface StoryContractRequirementsDto {
  requireFinalePayoff: boolean
  requireHiddenCapabilityForeshadow: boolean
  requireAntagonistContinuity: boolean
  requireAntagonistLoveConflict: boolean
  requireRelationshipShift: boolean
  requireHealingTechnique: boolean
  requireThemeRealization: boolean
}

export interface StoryContractDto {
  characterSlots: StoryContractCharacterSlotsDto
  eventSlots: StoryContractEventSlotsDto
  requirements: StoryContractRequirementsDto
  hardFacts: string[]
  softFacts: string[]
}

export interface UserAnchorLedgerDto {
  anchorNames: string[]
  protectedFacts: string[]
  heroineRequired: boolean
  heroineHint: string
}
