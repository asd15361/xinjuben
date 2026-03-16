import type { ScriptStateLedgerDto } from '../../../../shared/contracts/script-ledger'
import type { StoryIntentPackageDto } from '../../../../shared/contracts/intake'
import type { CharacterDraftDto, OutlineDraftDto, ScriptSegmentDto } from '../../../../shared/contracts/workflow'
import { getConfirmedFormalFacts } from '../../../../shared/domain/formal-fact/selectors'
import {
  buildUserAnchorLedger,
  collectMissingUserAnchorNames,
  hasHeroineAnchorCoverage
} from '../../../../shared/domain/story-contract/story-contract-policy'
import { buildCharacterStates } from './ledger-characters'
import { buildLedgerEvents } from './ledger-events'
import { buildOpenHooks } from './ledger-hooks'
import { buildKnowledgeBoundaries } from './ledger-knowledge-boundaries'
import { buildStoryMomentum } from './ledger-momentum'
import { buildLedgerPreflight } from './ledger-preflight'
import { computeLedgerSemanticHash } from './ledger-semantic-hash'

function nowIso(): string {
  return new Date().toISOString()
}

function buildUnresolvedSignals(script: ScriptSegmentDto[]): string[] {
  return script
    .filter((scene) => scene.dialogue.includes('？') || scene.dialogue.includes('?'))
    .slice(-5)
    .map((scene) => `第 ${scene.sceneNo} 场保留疑问或未解信号`)
}

export function buildScriptStateLedger(input: {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  script: ScriptSegmentDto[]
}): ScriptStateLedgerDto {
  const latestScene = input.script[input.script.length - 1]
  const recentSceneNos = input.script.slice(-5).map((scene) => scene.sceneNo)
  const unresolvedSignals = buildUnresolvedSignals(input.script)
  const openHooks = buildOpenHooks(input.script, input.characters)
  const confirmedFormalFacts = getConfirmedFormalFacts(input.outline)
  const anchorLedger = buildUserAnchorLedger({
    storyIntent: input.storyIntent,
    outline: input.outline,
    characters: input.characters
  })
  const missingAnchorNames = collectMissingUserAnchorNames(anchorLedger, input.characters)
  const heroineCovered = hasHeroineAnchorCoverage(anchorLedger, input.characters)
  const knowledgeBoundaries = buildKnowledgeBoundaries({
    outline: input.outline,
    script: input.script,
    characters: input.characters
  })
  const storyMomentum = buildStoryMomentum({
    outline: input.outline,
    script: input.script,
    unresolvedSignals,
    latestHook: latestScene?.dialogue || latestScene?.action || ''
  })
  const characterStates = buildCharacterStates({
    characters: input.characters,
    script: input.script
  })
  const semanticHash = computeLedgerSemanticHash({
    confirmedFormalFacts: confirmedFormalFacts.map((fact) => fact.label),
    protectedFacts: anchorLedger.protectedFacts,
    requiredAnchorNames: anchorLedger.anchorNames,
    missingAnchorNames,
    heroineCovered,
    openHooks,
    perspectiveCharacter: knowledgeBoundaries.perspectiveCharacter,
    nextRequiredBridge: storyMomentum.nextRequiredBridge,
    relationshipPressure: characterStates.flatMap((character) =>
      character.relationshipPressure.map((pressure) => `${character.name}:${pressure.targetName}:${pressure.currentTension}:${pressure.leverageType}`)
    ),
    unresolvedTraitBindings: characterStates.flatMap((character) =>
      character.traitBindings.filter((binding) => !binding.isBound).map((binding) => `${character.name}:${binding.trait}:${binding.landingType}`)
    ),
    memoryEchoes: storyMomentum.memoryEchoes,
    hardAnchors: storyMomentum.hardAnchors
  })
  const preflight = buildLedgerPreflight({
    confirmedFormalFacts: confirmedFormalFacts.map((fact) => fact.label),
    missingAnchorNames,
    heroineRequired: anchorLedger.heroineRequired,
    heroineCovered,
    openHookCount: openHooks.length,
    forbiddenOmniscienceRules: knowledgeBoundaries.forbiddenOmniscienceRules,
    characters: characterStates,
    memoryEchoes: storyMomentum.memoryEchoes
  })
  const eventLog = buildLedgerEvents({
    confirmedFormalFacts: confirmedFormalFacts.map((fact) => fact.label),
    missingAnchorNames,
    openHooks,
    semanticHash,
    characters: characterStates,
    memoryEchoes: storyMomentum.memoryEchoes
  })
  if (storyMomentum.memoryEchoes.length > 0) {
    preflight.issues = preflight.issues.filter((issue) => issue.code !== 'memory_echo_missing')
    preflight.assertionBlock =
      preflight.issues.length === 0
        ? '账本预检通过：继续承接当前正式事实、角色锚点和开放钩子。'
        : `账本预检警告：${preflight.issues.map((issue) => issue.detail).join('；')}`
    for (let index = eventLog.length - 1; index >= 0; index -= 1) {
      if (eventLog[index]?.type === 'memory_echo_missing') {
        eventLog.splice(index, 1)
      }
    }
  }

  return {
    semanticHash,
    sceneCount: input.script.length,
    latestHook: latestScene?.dialogue || latestScene?.action || '',
    recentSceneNos,
    unresolvedSignals,
    characters: characterStates,
    factState: {
      theme: input.outline.theme,
      mainConflict: input.outline.mainConflict,
      confirmedFormalFacts: confirmedFormalFacts.map((fact) => fact.label),
      protectedFacts: anchorLedger.protectedFacts,
      lastUpdatedAt: nowIso()
    },
    anchorState: {
      requiredAnchorNames: anchorLedger.anchorNames,
      missingAnchorNames,
      heroineRequired: anchorLedger.heroineRequired,
      heroineHint: anchorLedger.heroineHint,
      heroineCovered
    },
    openHooks,
    storyMomentum,
    knowledgeBoundaries,
    eventLog,
    preflight
  }
}
