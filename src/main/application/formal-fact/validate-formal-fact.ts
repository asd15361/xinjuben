import type { FormalFactValidationDto } from '../../../shared/contracts/formal-fact'
import { validateFormalFactDefinition } from '../../../shared/domain/formal-fact/definition-engine'

export function validateFormalFact(input: {
  description: string
  mainPlotContext: string
  theme: string
}): FormalFactValidationDto {
  return validateFormalFactDefinition(input.description, input.mainPlotContext, input.theme)
}
