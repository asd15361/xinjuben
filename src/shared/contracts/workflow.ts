import type {
  FormalFactAuthorityDto,
  FormalFactDeclaredBy,
  FormalFactDeclaredStage,
  FormalFactAuthorityType,
  FormalFactLevel,
  FormalFactStatus
} from './formal-fact'

// UI stages includes "chat" as the default in-project entrance.
export const WORKFLOW_STAGES = ['chat', 'outline', 'character', 'detailed_outline', 'script'] as const

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number]

export interface OutlineEpisodeDto {
  episodeNo: number
  summary: string
}

export interface FormalFact {
  id: string
  label: string
  description: string
  linkedToPlot: boolean
  linkedToTheme: boolean
  authorityType: FormalFactAuthorityType
  status: FormalFactStatus
  level: FormalFactLevel
  declaredBy: FormalFactDeclaredBy
  declaredStage: FormalFactDeclaredStage
  createdAt: string
  updatedAt: string
}

export interface FormalFactDeclarationDto extends FormalFactAuthorityDto {
  id: string
  label: string
  description: string
  linkedToPlot: boolean
  linkedToTheme: boolean
}

export interface OutlineDraftDto {
  title: string
  genre: string
  theme: string
  mainConflict: string
  protagonist: string
  summary: string
  summaryEpisodes: OutlineEpisodeDto[]
  facts: FormalFact[]
}

export interface CharacterDraftDto {
  name: string
  biography: string
  publicMask: string
  hiddenPressure: string
  fear: string
  protectTarget: string
  conflictTrigger: string
  advantage: string
  weakness: string
  goal: string
  arc: string
}

export interface DetailedOutlineEpisodeBeatDto {
  episodeNo: number
  summary: string
}

export interface DetailedOutlineSegmentDto {
  act: 'opening' | 'midpoint' | 'climax' | 'ending'
  content: string
  hookType: string
  episodeBeats?: DetailedOutlineEpisodeBeatDto[]
}

export interface ScriptSegmentDto {
  sceneNo: number
  action: string
  dialogue: string
  emotion: string
}
