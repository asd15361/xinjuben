import type { ScriptLedgerIssueDto, ScriptLedgerPostflightDto, ScriptStateLedgerDto } from '../../../shared/contracts/script-ledger'

export function collectLedgerCharacterPostflight(input: {
  previousLedger: ScriptStateLedgerDto
  nextLedger: ScriptStateLedgerDto
}): {
  issues: ScriptLedgerIssueDto[]
  updates: ScriptLedgerPostflightDto['patch']['updates']
} {
  const issues: ScriptLedgerIssueDto[] = []
  const updates: ScriptLedgerPostflightDto['patch']['updates'] = []

  const previousPressureCount = input.previousLedger.characters.reduce(
    (sum, character) => sum + character.relationshipPressure.length,
    0
  )
  const nextPressureCount = input.nextLedger.characters.reduce(
    (sum, character) => sum + character.relationshipPressure.length,
    0
  )
  if (previousPressureCount > 0 && nextPressureCount === 0) {
    issues.push({
      severity: 'medium',
      code: 'relationship_pressure_regressed',
      detail: '生成后账本丢失了最近关系施压信号，可能把关系线写平了。'
    })
  } else if (previousPressureCount !== nextPressureCount) {
    updates.push({
      path: 'characters.relationshipPressure',
      value: `before=${previousPressureCount},after=${nextPressureCount}`,
      evidence: '生成后关系施压密度发生变化。'
    })
  }

  const previousUnboundTraits = input.previousLedger.characters.flatMap((character) =>
    character.traitBindings.filter((binding) => !binding.isBound).map((binding) => `${character.name}:${binding.trait}`)
  )
  const nextUnboundTraits = input.nextLedger.characters.flatMap((character) =>
    character.traitBindings.filter((binding) => !binding.isBound).map((binding) => `${character.name}:${binding.trait}`)
  )
  if (nextUnboundTraits.length > previousUnboundTraits.length) {
    issues.push({
      severity: 'low',
      code: 'trait_binding_regressed',
      detail: '生成后反而新增了更多未落地的人物特质，说明行为表达没有跟上。'
    })
  } else if (nextUnboundTraits.join('|') !== previousUnboundTraits.join('|')) {
    updates.push({
      path: 'characters.traitBindings',
      value: nextUnboundTraits,
      evidence: '生成后人物特质落地情况发生变化。'
    })
  }

  return { issues, updates }
}
