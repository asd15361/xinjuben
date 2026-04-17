import { randomUUID } from 'crypto'
import type { FormalFact } from '../../../shared/contracts/workflow'

export type OutlineFactCandidate = {
  label?: string
  description?: string
  level?: 'core' | 'supporting'
  linkedToPlot?: boolean
  linkedToTheme?: boolean
}

export function toDraftFacts(facts: OutlineFactCandidate[] | undefined): FormalFact[] {
  const now = new Date().toISOString()
  return (facts || [])
    .filter((f) => f.label?.trim() && f.description?.trim())
    .slice(0, 12)
    .map((fact) => ({
      id: randomUUID(),
      label: fact.label!.trim(),
      description: fact.description!.trim(),
      linkedToPlot: fact.linkedToPlot ?? true,
      linkedToTheme: fact.linkedToTheme ?? true,
      authorityType: 'ai_suggested',
      status: 'draft',
      level: fact.level ?? 'core',
      declaredBy: 'system',
      declaredStage: 'outline',
      createdAt: now,
      updatedAt: now
    }))
}
