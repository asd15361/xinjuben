import type { FormalFactValidationDto } from '../../../shared/contracts/formal-fact.ts'
import { validateFormalFactDefinition } from '../../../shared/domain/formal-fact/definition-engine.ts'

export function validateFormalFact(input: {
  description: string
  mainPlotContext: string
  theme: string
}): FormalFactValidationDto {
  return validateFormalFactDefinition(input.description, input.mainPlotContext, input.theme)
}
