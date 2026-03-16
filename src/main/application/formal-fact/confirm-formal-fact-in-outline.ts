import type { OutlineDraftDto } from '../../../shared/contracts/workflow'
import { confirmFormalFact } from './confirm-formal-fact'

export function confirmFormalFactInOutline(input: {
  actor: 'user' | 'system'
  stage: 'outline' | 'character' | 'detailed_outline' | 'script'
  factId: string
  outline: OutlineDraftDto
}): OutlineDraftDto {
  const target = input.outline.facts.find((fact) => fact.id === input.factId)
  if (!target) {
    throw new Error('formal_fact_not_found')
  }

  return {
    ...input.outline,
    facts: input.outline.facts.map((fact) =>
      fact.id === input.factId
        ? confirmFormalFact({
            actor: input.actor,
            stage: input.stage,
            fact
          })
        : fact
    )
  }
}
