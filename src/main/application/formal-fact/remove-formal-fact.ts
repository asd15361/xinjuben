import type { OutlineDraftDto } from '../../../shared/contracts/workflow'
import { canRemoveFormalFact } from '../../../shared/domain/formal-fact/authority-policy'

export function removeFormalFact(input: {
  actor: 'user' | 'system'
  stage: 'outline' | 'character' | 'detailed_outline' | 'script'
  factId: string
  outline: OutlineDraftDto
}): OutlineDraftDto {
  if (!canRemoveFormalFact(input.stage, input.actor)) {
    throw new Error('formal_fact_removal_not_allowed')
  }
  if (!input.outline.facts.some((fact) => fact.id === input.factId)) {
    throw new Error('formal_fact_not_found')
  }

  return {
    ...input.outline,
    facts: input.outline.facts.filter((fact) => fact.id !== input.factId)
  }
}
