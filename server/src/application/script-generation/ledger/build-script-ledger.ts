import type { ScriptStateLedgerDto } from '../../../shared/contracts/script-ledger'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow'
import { getConfirmedFormalFacts } from '../../../shared/domain/formal-fact/selectors'
import {
  buildUserAnchorLedger,
  collectMissingUserAnchorNames,
  hasHeroineAnchorCoverage
} from '../../../shared/domain/story-contract/story-contract-policy'
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

/**
 * 从已有剧本和控制卡中提取已使用的计谋/施压手段。
 * 用于 Ledger 的 usedTactics 字段，防止套路重复。
 */
function buildUsedTactics(script: ScriptSegmentDto[]): string[] {
  const tactics: string[] = []
  for (const scene of script) {
    const sceneText = `${scene.screenplay || ''}\n${scene.action}\n${scene.dialogue}\n${scene.emotion}`
    // 从剧本段的控制卡中提取已用手段（如果存在）
    if ('pressureType' in scene && typeof scene.pressureType === 'string' && scene.pressureType) {
      tactics.push(scene.pressureType)
    }
    if ('protagonistActionType' in scene && typeof scene.protagonistActionType === 'string' && scene.protagonistActionType) {
      tactics.push(scene.protagonistActionType)
    }
    // 也从 screenplayScenes 的控制卡中尝试提取
    const scenes = scene.screenplayScenes
    if (Array.isArray(scenes)) {
      for (const s of scenes) {
        if (s && typeof s === 'object' && 'episodeControlCard' in s) {
          const card = (s as Record<string, unknown>).episodeControlCard as Record<string, unknown> | undefined
          if (card) {
            if (typeof card.pressureType === 'string' && card.pressureType) tactics.push(card.pressureType)
            if (typeof card.protagonistActionType === 'string' && card.protagonistActionType) tactics.push(card.protagonistActionType)
          }
        }
      }
    }

    if (/账本|密信|血契|契据|信件|卷轴|底页|字条|残页/.test(sceneText)) {
      tactics.push('paper_evidence')
    }
    if (/法阵|阵纹|结界|禁制|灵力|剑气|符咒|符纸|镇妖符|血脉|妖兽|蛇子|法器/.test(sceneText)) {
      tactics.push('fantasy_visual')
    }
    if (/吐血|咳血|黑血|毒发|中毒|昏迷|濒危|跪倒/.test(sceneText)) {
      tactics.push('injury_collapse')
    }
  }
  return tactics
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
      character.relationshipPressure.map(
        (pressure) =>
          `${character.name}:${pressure.targetName}:${pressure.currentTension}:${pressure.leverageType}`
      )
    ),
    unresolvedTraitBindings: characterStates.flatMap((character) =>
      character.traitBindings
        .filter((binding) => !binding.isBound)
        .map((binding) => `${character.name}:${binding.trait}:${binding.landingType}`)
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
    usedTactics: buildUsedTactics(input.script),
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
