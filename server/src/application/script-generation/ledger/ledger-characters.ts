import type { ScriptStateLedgerDto } from '@shared/contracts/script-ledger'
import type { CharacterDraftDto, ScriptSegmentDto } from '@shared/contracts/workflow'
import { findTraitBindingEvidence } from '@shared/domain/script-generation/signal-policy'

const LOCATION_PATTERN =
  /在([\u4e00-\u9fa5A-Za-z0-9]{2,12}(?:房|室|厅|楼|巷|街|院|馆|店|城|村|站|口))/
const SCENE_LIMIT = 3

type TraitLandingType =
  ScriptStateLedgerDto['characters'][number]['traitBindings'][number]['landingType']
type RelationshipPressureDto =
  ScriptStateLedgerDto['characters'][number]['relationshipPressure'][number]

function inferCustodyStatus(text: string): 'free' | 'captured' | 'missing' | 'restricted' {
  if (/失踪|下落不明|找不到/i.test(text)) return 'missing'
  if (/被抓|被绑|押走|押回|押入地牢|地牢|收监|候审|囚禁|控制住|扣下/i.test(text)) return 'captured'
  if (/受限|监视|盯梢|软禁|不能离开|封住经脉|革去.*职务|停职|夺权/i.test(text)) return 'restricted'
  return 'free'
}

function inferLocation(text: string): string {
  return text.match(LOCATION_PATTERN)?.[1] || '位置待确认'
}

function inferInjuryStatus(text: string): string {
  if (/中毒|毒发|黑血|吐血|咳血|血沫|昏迷|濒危|重伤/i.test(text)) return '重伤'
  if (/受伤|流血|擦伤|疼痛|伤口|负伤/i.test(text)) return '轻伤'
  return '正常'
}

function pickStatusEvidence(text: string): string {
  return (
    text
      .split(/[。！？!?；\n]/)
      .map((line) => line.trim())
      .find((line) => /吐血|咳血|黑血|中毒|押入地牢|押回|候审|地牢|被抓|被绑|软禁|封住经脉|革去.*职务/.test(line)) ||
    '最近场景未提炼出更明确的状态证据'
  )
}

function countTailWhile<T>(items: T[], predicate: (item: T) => boolean): number {
  let count = 0
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (!predicate(items[index]!)) break
    count += 1
  }
  return count
}

function pickRecentScenes(script: ScriptSegmentDto[], characterName: string): ScriptSegmentDto[] {
  return script
    .filter((scene) =>
      `${scene.action}\n${scene.dialogue}\n${scene.emotion}`.includes(characterName)
    )
    .slice(-SCENE_LIMIT)
}

function inferRelationType(sceneText: string): string {
  if (/父|母|哥|姐|弟|妹|家人|亲人/i.test(sceneText)) return 'family'
  if (/爱|喜欢|婚约|恋人|前任/i.test(sceneText)) return 'romance'
  if (/合作|同盟|帮你|一起/i.test(sceneText)) return 'alliance'
  if (/敌|恨|报复|对付|背叛/i.test(sceneText)) return 'hostility'
  return 'unclear'
}

function inferCurrentTension(sceneText: string): string {
  if (/背叛|翻脸|决裂|报复|抢走|逼婚|钳制/i.test(sceneText)) return 'high'
  if (/试探|怀疑|争执|对峙|利用|牵制/i.test(sceneText)) return 'medium'
  return 'low'
}

function inferLeverageType(sceneText: string): RelationshipPressureDto['leverageType'] {
  if (/秘密|把柄|证据|真相/i.test(sceneText)) return 'information'
  if (/钱|股份|资源|合作|药|兵|势力/i.test(sceneText)) return 'resource'
  if (/感情|愧疚|承诺|亲情|爱人|恋人/i.test(sceneText)) return 'emotion'
  return 'status'
}

function inferPressureMode(sceneText: string): RelationshipPressureDto['pressureMode'] {
  if (/逼|压|追杀|围堵|威胁|争夺|对峙/i.test(sceneText)) return 'direct_conflict'
  if (/利诱|交换|答应我|跟我走|许诺/i.test(sceneText)) return 'temptation'
  if (/隐忍|克制|不敢|不能|被迫|顾忌/i.test(sceneText)) return 'restraint'
  return 'memory_trigger'
}

function inferLeveragePoint(sceneText: string): string {
  if (/秘密|把柄|证据|真相/i.test(sceneText)) return 'information'
  if (/钱|股份|资源|合作/i.test(sceneText)) return 'resources'
  if (/感情|愧疚|承诺|亲情/i.test(sceneText)) return 'emotion'
  return 'position'
}

function resolvePressureEvidence(sceneText: string, targetName: string): string {
  const matched = sceneText
    .split(/[。！？!?；\n]/)
    .map((line) => line.trim())
    .find((line) => line.includes(targetName))
  return matched || '最近场景暂未提炼出更具体施压证据'
}

function normalizeTraitLandingType(trait: string): TraitLandingType {
  if (/微动作|攥拳|摩挲|旧疤|咬牙|皱眉|握紧|隐忍|克制/.test(trait)) return 'pressure-scene'
  if (/前史|回忆|七岁|妖祸|童年|过去|经历|旧事/.test(trait)) return 'memory-echo'
  if (/动机|守护|掌控|欲望|目标|追求|复仇|夺回|保护/.test(trait)) return 'conflict-action'
  return 'other'
}

function buildTraitBindings(character: CharacterDraftDto, scenes: ScriptSegmentDto[]) {
  const traits = [character.advantage, character.weakness, character.goal, character.arc]
    .map((item) => String(item || '').trim())
    .filter(Boolean)
    .slice(0, 4)
  const sceneText = scenes
    .map((scene) => `${scene.action}\n${scene.dialogue}\n${scene.emotion}`)
    .join('\n')

  return traits.map((trait) => {
    const landingType = normalizeTraitLandingType(trait)
    const evidence = findTraitBindingEvidence(sceneText, landingType)

    return {
      trait,
      landingType,
      isBound: Boolean(evidence),
      evidence: evidence || '最近场景还没看见这条特质的行为落地'
    }
  })
}

function buildRelationshipPressure(input: {
  characters: CharacterDraftDto[]
  script: ScriptSegmentDto[]
  currentCharacter: CharacterDraftDto
}): RelationshipPressureDto[] {
  const recentScenes = pickRecentScenes(input.script, input.currentCharacter.name)
  const joinedText = recentScenes
    .map((scene) => `${scene.action}\n${scene.dialogue}\n${scene.emotion}`)
    .join('\n')

  return input.characters
    .filter((character) => character.name !== input.currentCharacter.name)
    .filter((character) => joinedText.includes(character.name))
    .slice(0, 3)
    .map((character) => ({
      targetName: character.name,
      relationType: inferRelationType(joinedText),
      currentTension: inferCurrentTension(joinedText),
      leveragePoint: inferLeveragePoint(joinedText),
      leverageType: inferLeverageType(joinedText),
      pressureMode: inferPressureMode(joinedText),
      evidence: resolvePressureEvidence(joinedText, character.name)
    }))
}

export function buildCharacterStates(input: {
  characters: CharacterDraftDto[]
  script: ScriptSegmentDto[]
}): ScriptStateLedgerDto['characters'] {
  const latestScene = input.script[input.script.length - 1]

  return input.characters.map((character) => {
    const characterScenes = pickRecentScenes(input.script, character.name)
    const lastSeenScene = characterScenes[characterScenes.length - 1]
    const latestText = `${lastSeenScene?.action || latestScene?.action || ''}\n${lastSeenScene?.dialogue || latestScene?.dialogue || ''}\n${lastSeenScene?.emotion || latestScene?.emotion || ''}`
    const appearanceHistory = input.script.filter(
      (scene) =>
        scene.action.includes(character.name) ||
        scene.dialogue.includes(character.name) ||
        scene.emotion.includes(character.name)
    )
    const injuryEpisodeStreak = countTailWhile(appearanceHistory, (scene) =>
      inferInjuryStatus(`${scene.action}\n${scene.dialogue}\n${scene.emotion}`) === '重伤'
    )
    const custodyEpisodeStreak = countTailWhile(appearanceHistory, (scene) =>
      inferCustodyStatus(`${scene.action}\n${scene.dialogue}\n${scene.emotion}`) !== 'free'
    )
    const latestCustodyStatus = inferCustodyStatus(latestText)

    return {
      name: character.name,
      lastKnownGoal: character.goal,
      latestEmotion: lastSeenScene?.emotion || latestScene?.emotion || '',
      latestAction: lastSeenScene?.action || latestScene?.action || '',
      appearanceCount: input.script.filter(
        (scene) =>
          scene.action.includes(character.name) ||
          scene.dialogue.includes(character.name) ||
          scene.emotion.includes(character.name)
      ).length,
      continuityStatus: {
        location: inferLocation(latestText),
        injuryStatus: inferInjuryStatus(latestText),
        custodyStatus: latestCustodyStatus,
        canActDirectly:
          !/昏迷|被绑|被抓|失踪|软禁|押入地牢|押回|候审|地牢|封住经脉/.test(latestText) &&
          latestCustodyStatus === 'free',
        injuryEpisodeStreak,
        custodyEpisodeStreak,
        statusEvidence: pickStatusEvidence(latestText),
        lastSeenSceneNo: lastSeenScene?.sceneNo ?? null
      },
      relationshipPressure: buildRelationshipPressure({
        characters: input.characters,
        script: input.script,
        currentCharacter: character
      }),
      traitBindings: buildTraitBindings(character, characterScenes)
    }
  })
}
