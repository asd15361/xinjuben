import type { ScriptStateLedgerDto } from '../../../shared/contracts/script-ledger'

function hashText(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

export function computeLedgerSemanticHash(input: {
  confirmedFormalFacts: string[]
  protectedFacts: string[]
  requiredAnchorNames: string[]
  missingAnchorNames: string[]
  heroineCovered: boolean
  openHooks: Array<{ hookText: string; urgency: string }>
  perspectiveCharacter: string | null
  nextRequiredBridge: string
  relationshipPressure: string[]
  unresolvedTraitBindings: string[]
  memoryEchoes: string[]
  hardAnchors: string[]
}): string {
  return hashText(
    JSON.stringify({
      confirmedFormalFacts: input.confirmedFormalFacts,
      protectedFacts: input.protectedFacts,
      requiredAnchorNames: input.requiredAnchorNames,
      missingAnchorNames: input.missingAnchorNames,
      heroineCovered: input.heroineCovered,
      openHooks: input.openHooks.map((hook) => ({ hookText: hook.hookText, urgency: hook.urgency })),
      perspectiveCharacter: input.perspectiveCharacter,
      nextRequiredBridge: input.nextRequiredBridge,
      relationshipPressure: input.relationshipPressure,
      unresolvedTraitBindings: input.unresolvedTraitBindings,
      memoryEchoes: input.memoryEchoes,
      hardAnchors: input.hardAnchors
    })
  )
}

export function getLedgerHashFromState(ledger: ScriptStateLedgerDto): string {
  return computeLedgerSemanticHash({
    confirmedFormalFacts: ledger.factState.confirmedFormalFacts,
    protectedFacts: ledger.factState.protectedFacts,
    requiredAnchorNames: ledger.anchorState.requiredAnchorNames,
    missingAnchorNames: ledger.anchorState.missingAnchorNames,
    heroineCovered: ledger.anchorState.heroineCovered,
    openHooks: ledger.openHooks,
    perspectiveCharacter: ledger.knowledgeBoundaries.perspectiveCharacter,
    nextRequiredBridge: ledger.storyMomentum.nextRequiredBridge,
    relationshipPressure: ledger.characters.flatMap((character) =>
      character.relationshipPressure.map((pressure) => `${character.name}:${pressure.targetName}:${pressure.currentTension}:${pressure.leverageType}`)
    ),
    unresolvedTraitBindings: ledger.characters.flatMap((character) =>
      character.traitBindings.filter((binding) => !binding.isBound).map((binding) => `${character.name}:${binding.trait}:${binding.landingType}`)
    ),
    memoryEchoes: ledger.storyMomentum.memoryEchoes,
    hardAnchors: ledger.storyMomentum.hardAnchors
  })
}
