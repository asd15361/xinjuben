import type { ProjectEntityStoreDto } from './entities.ts'
import type { FactionMatrixDto } from './faction-matrix.ts'
import type { StoryIntentPackageDto } from './intake.ts'
import type { CharacterProfileV2Dto } from './character-profile-v2.ts'
import type { CharacterDraftDto, OutlineDraftDto, SevenQuestionsResultDto } from './workflow.ts'

export type OutlineCharacterGenerationStage =
  | 'authority_input'
  | 'faction_matrix'
  | 'character_profiles'
  | 'character_ledger'
  | 'character_projection'
  | 'rough_outline'
  | 'persistence'

export interface GenerationDiagnosticDto {
  stage: OutlineCharacterGenerationStage
  level: 'info' | 'warning' | 'error'
  code: string
  message: string
  createdAt: string
}

export interface GenerationWarningDto {
  stage: OutlineCharacterGenerationStage
  code: string
  message: string
}

export interface CharacterLedgerDto {
  factionMatrix?: FactionMatrixDto
  characterProfilesV2: CharacterProfileV2Dto[]
  normalizedDrafts: CharacterDraftDto[]
  fullProfileDrafts: CharacterDraftDto[]
  visibleCharacterDrafts: CharacterDraftDto[]
  entityStore: ProjectEntityStoreDto
}

export interface OutlineCharacterGenerationBundleDto {
  storyIntent: StoryIntentPackageDto
  outlineDraft: OutlineDraftDto
  sevenQuestions: SevenQuestionsResultDto | null
  characterLedger: CharacterLedgerDto
  diagnostics: GenerationDiagnosticDto[]
  warnings: GenerationWarningDto[]
  outlineGenerationError?: string
}
