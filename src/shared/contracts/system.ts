import type { WorkflowStage } from './workflow'
import type { AppError } from './app-error'

export interface AppInfoDto {
  name: string
  version: string
  stageOptions: WorkflowStage[]
}

export interface ValidationResultDto {
  isValid: boolean
  score: number
  suggestions: string[]
}

export interface ValidationResponseDto {
  ok: true
  data: ValidationResultDto
}

export interface ErrorResponseDto {
  ok: false
  error: AppError
}
