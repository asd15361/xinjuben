import type { FormalFact, OutlineDraftDto } from '../../contracts/workflow'
import { canInferFormalFactIntoMainline } from './authority-policy'

export function getConfirmedFormalFacts(outline: OutlineDraftDto): FormalFact[] {
  return outline.facts.filter((fact) => canInferFormalFactIntoMainline(fact))
}

export function getConfirmedFormalFactLabels(outline: OutlineDraftDto): string[] {
  return getConfirmedFormalFacts(outline).map((fact) => fact.label)
}
