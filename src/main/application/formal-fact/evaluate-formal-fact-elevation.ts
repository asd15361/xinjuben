import type { FormalFactElevationEvaluationDto } from '../../../shared/contracts/formal-fact.ts'
import { evaluateFormalFactElevation } from '../../../shared/domain/formal-fact/elevation-engine.ts'

export function evaluateFormalFactElevationUseCase(input: {
  formalFactLabel: string
  conflictText: string
  emotionText: string
  themeText: string
}): FormalFactElevationEvaluationDto {
  return evaluateFormalFactElevation(input)
}
