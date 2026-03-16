import type { FormalFactElevationEvaluationDto } from '../../../shared/contracts/formal-fact'
import { evaluateFormalFactElevation } from '../../../shared/domain/formal-fact/elevation-engine'

export function evaluateFormalFactElevationUseCase(input: {
  formalFactLabel: string
  conflictText: string
  emotionText: string
  themeText: string
}): FormalFactElevationEvaluationDto {
  return evaluateFormalFactElevation(input)
}
