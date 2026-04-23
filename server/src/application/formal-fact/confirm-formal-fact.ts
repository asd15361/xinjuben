import type { FormalFact } from '@shared/contracts/workflow'
import { canConfirmFormalFact } from '@shared/domain/formal-fact/authority-policy'

export function confirmFormalFact(input: {
  actor: 'user' | 'system'
  stage: 'outline' | 'character' | 'detailed_outline' | 'script'
  fact: FormalFact
}): FormalFact {
  if (!canConfirmFormalFact(input.stage, input.actor)) {
    throw new Error('formal_fact_confirmation_not_allowed')
  }

  return {
    ...input.fact,
    // Confirmation is an act of declaration by the creator.
    // Only user-declared + confirmed facts can enter the mainline inference chain.
    authorityType: 'user_declared',
    status: 'confirmed',
    declaredBy: 'user',
    declaredStage: 'outline',
    updatedAt: new Date().toISOString()
  }
}
