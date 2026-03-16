export type IntakeMode = 'free_chat' | 'onboarding' | 'manual_requirement'

export interface IntakeAnswer {
  questionId: string
  questionLabel: string
  answer: string
}

export interface StoryIntentPackageDto {
  titleHint?: string
  genre?: string
  tone?: string
  audience?: string
  sellingPremise?: string
  coreDislocation?: string
  emotionalPayoff?: string
  protagonist?: string
  antagonist?: string
  coreConflict?: string
  endingDirection?: string
  officialKeyCharacters: string[]
  lockedCharacterNames: string[]
  themeAnchors: string[]
  worldAnchors: string[]
  relationAnchors: string[]
  dramaticMovement: string[]
  manualRequirementNotes?: string
  freeChatFinalSummary?: string
  generationBriefText?: string
}
