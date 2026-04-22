import type {
  ScriptLedgerEventDto,
  ScriptLedgerOpenHookDto,
  ScriptStateLedgerDto
} from '../../../../shared/contracts/script-ledger.ts'

export function buildLedgerEvents(input: {
  confirmedFormalFacts: string[]
  missingAnchorNames: string[]
  openHooks: ScriptLedgerOpenHookDto[]
  semanticHash: string
  characters: ScriptStateLedgerDto['characters']
  memoryEchoes: string[]
}): ScriptLedgerEventDto[] {
  const events: ScriptLedgerEventDto[] = []

  input.confirmedFormalFacts.slice(0, 2).forEach((fact) => {
    events.push({
      type: 'formal_fact_confirmed',
      detail: `账本当前围绕正式事实“${fact}”继续推进。`,
      sceneNo: null
    })
  })

  input.openHooks.slice(0, 2).forEach((hook) => {
    events.push({
      type: 'hook_opened',
      detail: hook.hookText,
      sceneNo: hook.sourceSceneNo
    })
  })

  if (input.missingAnchorNames.length > 0) {
    events.push({
      type: 'anchor_missing',
      detail: `当前仍缺这些锚点：${input.missingAnchorNames.join('、')}。`,
      sceneNo: null
    })
  }

  input.characters
    .flatMap((character) =>
      character.relationshipPressure.slice(0, 1).map((pressure) => ({
        type: 'pressure_shift' as const,
        detail: `${character.name} -> ${pressure.targetName}：${pressure.currentTension}/${pressure.leverageType}/${pressure.pressureMode}`,
        sceneNo: character.continuityStatus.lastSeenSceneNo
      }))
    )
    .slice(0, 2)
    .forEach((event) => events.push(event))

  input.characters
    .flatMap((character) =>
      character.traitBindings
        .filter((binding) => !binding.isBound)
        .slice(0, 1)
        .map((binding) => ({
          type: 'trait_binding_weak' as const,
          detail: `${character.name} 的特质“${binding.trait}”还没落成 ${binding.landingType}`,
          sceneNo: character.continuityStatus.lastSeenSceneNo
        }))
    )
    .slice(0, 2)
    .forEach((event) => events.push(event))

  const hasMemoryEcho = input.memoryEchoes.length > 0
  if (!hasMemoryEcho) {
    events.push({
      type: 'memory_echo_missing',
      detail: '当前还没形成稳定记忆回声，后续批次要优先补历史回响。',
      sceneNo: null
    })
  }

  const pendingHardAnchor = input.confirmedFormalFacts[0]
  if (pendingHardAnchor) {
    events.push({
      type: 'hard_anchor_pending',
      detail: `下一轮优先承接硬锚点：${pendingHardAnchor}`,
      sceneNo: null
    })
  }

  events.push({
    type: 'semantic_shift',
    detail: `当前账本语义指纹：${input.semanticHash}`,
    sceneNo: null
  })

  return events
}
