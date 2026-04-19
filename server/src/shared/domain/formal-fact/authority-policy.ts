import type { FormalFact } from '../../contracts/workflow'

export function canDeclareFormalFact(stage: string, actor: 'user' | 'system'): boolean {
  return stage === 'outline' && actor === 'user'
}

export function canConfirmFormalFact(stage: string, actor: 'user' | 'system'): boolean {
  return stage === 'outline' && actor === 'user'
}

export function canRemoveFormalFact(stage: string, actor: 'user' | 'system'): boolean {
  return stage === 'outline' && actor === 'user'
}

export function canInferFormalFactIntoMainline(fact: FormalFact): boolean {
  return fact.status === 'confirmed' && fact.declaredStage === 'outline'
}
