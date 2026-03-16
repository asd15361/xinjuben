import type { ScriptLedgerIssueDto, ScriptLedgerPreflightDto, ScriptStateLedgerDto } from '../../../../shared/contracts/script-ledger'

export function buildLedgerPreflight(input: {
  confirmedFormalFacts: string[]
  missingAnchorNames: string[]
  heroineRequired: boolean
  heroineCovered: boolean
  openHookCount: number
  forbiddenOmniscienceRules: string[]
  characters: ScriptStateLedgerDto['characters']
  memoryEchoes: string[]
}): ScriptLedgerPreflightDto {
  const issues: ScriptLedgerIssueDto[] = []

  if (input.confirmedFormalFacts.length === 0) {
    issues.push({
      severity: 'high',
      code: 'formal_fact_missing',
      detail: '当前账本没有已确认正式事实，后续生成容易下游自造主线。'
    })
  }

  if (input.missingAnchorNames.length > 0) {
    issues.push({
      severity: 'high',
      code: 'anchor_missing',
      detail: `当前账本仍缺这些用户锚点：${input.missingAnchorNames.join('、')}。`
    })
  }

  if (input.heroineRequired && !input.heroineCovered) {
    issues.push({
      severity: 'medium',
      code: 'heroine_anchor_missing',
      detail: '当前账本显示情感锚点还没有真正被角色层承接。'
    })
  }

  if (input.openHookCount >= 4) {
    issues.push({
      severity: 'medium',
      code: 'hook_overloaded',
      detail: '当前开放钩子偏多，下一轮要优先回收而不是继续加谜。'
    })
  }

  if (input.forbiddenOmniscienceRules.length === 0) {
    issues.push({
      severity: 'low',
      code: 'knowledge_boundary_weak',
      detail: '当前账本没有明确知识边界，容易出现全知透底。'
    })
  }

  const weakPressureCharacters = input.characters.filter((character) => character.relationshipPressure.length === 0).slice(0, 2)
  if (weakPressureCharacters.length > 0) {
    issues.push({
      severity: 'low',
      code: 'relationship_pressure_weak',
      detail: `这些角色最近缺少明确关系施压：${weakPressureCharacters.map((character) => character.name).join('、')}。`
    })
  }

  const unboundTraitRows = input.characters
    .flatMap((character) =>
      character.traitBindings.filter((binding) => !binding.isBound).map((binding) => `${character.name}:${binding.trait}`)
    )
    .slice(0, 3)
  if (unboundTraitRows.length > 0) {
    issues.push({
      severity: 'low',
      code: 'trait_binding_weak',
      detail: `最近还有人物特质没落地：${unboundTraitRows.join('、')}。`
    })
  }

  const missingMemoryEcho = input.memoryEchoes.length === 0
  if (missingMemoryEcho) {
    issues.push({
      severity: 'low',
      code: 'memory_echo_missing',
      detail: '最近场景还没有稳定的记忆回声，跨批次连续性容易发虚。'
    })
  }

  return {
    issues,
    assertionBlock:
      issues.length === 0
        ? '账本预检通过：继续承接当前正式事实、角色锚点和开放钩子。'
        : `账本预检警告：${issues.map((issue) => issue.detail).join('；')}`
  }
}
