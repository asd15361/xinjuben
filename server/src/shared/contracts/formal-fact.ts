export type FormalFactAuthorityType = 'user_declared' | 'ai_suggested' | 'system_inferred'
export type FormalFactStatus = 'draft' | 'confirmed' | 'rejected'
export type FormalFactLevel = 'core' | 'supporting'
export type FormalFactDeclaredStage = 'outline'
export type FormalFactDeclaredBy = 'user' | 'system'
export type FormalFactProvenanceTier =
  | 'explicit'
  | 'derived'
  | 'assumed'
  | 'user_declared'
  | 'ai_suggested'
  | 'system_inferred'

export interface FormalFactAuthorityDto {
  authorityType: FormalFactAuthorityType
  status: FormalFactStatus
  level: FormalFactLevel
  declaredBy: FormalFactDeclaredBy
  declaredStage: FormalFactDeclaredStage
  createdAt: string
  updatedAt: string
}

export interface DeclareFormalFactInputDto {
  label: string
  description: string
  level?: FormalFactLevel
}

export interface ConfirmFormalFactInputDto {
  factId: string
}

export interface RemoveFormalFactInputDto {
  factId: string
}

export interface FormalFactValidationDto {
  isValid: boolean
  score: number
  suggestions: string[]
}

export interface FormalFactElevationEvaluationDto {
  qualifies: boolean
  score: number
  reasons: string[]
}
