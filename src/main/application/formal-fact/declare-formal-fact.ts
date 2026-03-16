import type { DeclareFormalFactInputDto } from '../../../shared/contracts/formal-fact'
import type { FormalFact, OutlineDraftDto } from '../../../shared/contracts/workflow'
import { canDeclareFormalFact } from '../../../shared/domain/formal-fact/authority-policy'
import { validateFormalFactDefinition } from '../../../shared/domain/formal-fact/definition-engine'

function createFormalFact(input: {
  declaration: DeclareFormalFactInputDto
  outline: OutlineDraftDto
}): FormalFact {
  const now = new Date().toISOString()
  const validation = validateFormalFactDefinition(
    input.declaration.description,
    input.outline.mainConflict,
    input.outline.theme
  )

  return {
    id: `fact_${Date.now().toString(36)}`,
    label: input.declaration.label.trim(),
    description: input.declaration.description.trim(),
    linkedToPlot: validation.score >= 70,
    linkedToTheme: validation.score >= 70,
    authorityType: 'user_declared',
    status: validation.isValid ? 'confirmed' : 'draft',
    level: input.declaration.level || 'core',
    declaredBy: 'user',
    declaredStage: 'outline',
    createdAt: now,
    updatedAt: now
  }
}

export function declareFormalFact(input: {
  actor: 'user' | 'system'
  stage: 'outline' | 'character' | 'detailed_outline' | 'script'
  declaration: DeclareFormalFactInputDto
  outline: OutlineDraftDto
}): { outline: OutlineDraftDto; fact: FormalFact } {
  if (!canDeclareFormalFact(input.stage, input.actor)) {
    throw new Error('formal_fact_declaration_not_allowed')
  }

  const fact = createFormalFact(input)
  return {
    outline: {
      ...input.outline,
      facts: [...input.outline.facts, fact]
    },
    fact
  }
}
