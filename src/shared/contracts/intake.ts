import type { MarketProfileDto } from './project'

export type IntakeMode = 'free_chat' | 'onboarding' | 'manual_requirement'

export interface IntakeAnswer {
  questionId: string
  questionLabel: string
  answer: string
}

export interface ShortDramaIncitingIncidentDto {
  timingRequirement: string
  disruption: string
  mainLine: string
}

export interface ShortDramaProtagonistArcDto {
  flawBelief: string
  growthMode: string
  payoff: string
}

export interface ShortDramaPovPolicyDto {
  mode: 'single_protagonist' | 'controlled_multi'
  allowedAuxiliaryViewpoints: string[]
  restriction: string
}

export interface ShortDramaClimaxPolicyDto {
  episodeHookRule: string
  finalePayoffRule: string
  callbackRequirement: string
}

export interface ShortDramaCharacterPolicyDto {
  stateDrivenConflictRule: string
  noForcedStupidityRule: string
  noAbruptMutationRule: string
}

export interface ShortDramaConstitutionDto {
  corePrinciple: string
  coreEmotion: string
  worldViewBrief?: string
  macGuffinDefinition?: string
  villainCoreMotivation?: string
  protagonistHiddenTrumpCard?: string
  themeAndValue?: string
  pacingLevel?: '极高' | '高' | '中'
  episodeTotal?: number
  incitingIncident: ShortDramaIncitingIncidentDto
  protagonistArc: ShortDramaProtagonistArcDto
  povPolicy: ShortDramaPovPolicyDto
  climaxPolicy: ShortDramaClimaxPolicyDto
  characterPolicy?: ShortDramaCharacterPolicyDto
  forbiddenContent?: string
}

export interface StorySynopsisDto {
  logline: string
  openingPressureEvent: string
  protagonistCurrentDilemma: string
  firstFaceSlapEvent: string
  antagonistForce: string
  antagonistPressureMethod: string
  corePayoff: string
  stageGoal: string
  keyFemaleCharacterFunction?: string
  episodePlanHint?: string
  finaleDirection: string
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
  shortDramaConstitution?: ShortDramaConstitutionDto | null
  manualRequirementNotes?: string
  freeChatFinalSummary?: string
  generationBriefText?: string
  confirmedChatTranscript?: string
  marketProfile?: MarketProfileDto | null
  /** 聊天摘要（创作信息总结），不是正式故事梗概 */
  creativeSummary?: string
  /** 结构化故事梗概，经质量门检测后才是真下游输入 */
  storySynopsis?: StorySynopsisDto | null
}
