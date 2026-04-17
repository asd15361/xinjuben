import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config.ts'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text.ts'
import { TACTIC_CATEGORY_LABELS } from '../../../../shared/domain/script/screenplay-tactic-rotation.ts'
import type {
  StartScriptGenerationInputDto,
  StartScriptGenerationResultDto
} from '../../../../shared/contracts/script-generation.ts'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow.ts'
import { inspectContentQualityEpisode } from '../../../../shared/domain/script/screenplay-content-quality.ts'
import { inspectScreenplayQualityEpisode } from '../../../../shared/domain/script/screenplay-quality.ts'
import {
  collectEpisodeGuardFailures
} from '../../../../shared/domain/script/screenplay-repair-guard.ts'
import { resolveEpisodeControlCardFromPackage } from '../../../../shared/domain/script-generation/script-control-package.ts'
import { repairWithEpisodeEngineAgent } from './episode-engine-agent.ts'
import { repairWithArcControlAgent } from './arc-control-agent.ts'
import { repairWithEmotionLaneAgent } from './emotion-lane-agent.ts'
import { repairWithFormatPollutionAgent } from './format-pollution-agent.ts'
import { repairWithSceneStructureAgent } from './scene-structure-agent.ts'
import { repairWithCharCountAgent, resolveCharCountAgentMode } from './char-count-agent.ts'

const MAX_CONTENT_REPAIR_PASSES = 3
const CONTENT_REPAIR_SOFT_CAP_CHARS = 1650
const EARLY_EXPANSION_RISK_CHARS = 1500

export type ScriptRepairPhase = 'phase_a' | 'phase_b'

export interface ScriptSceneRepairResult {
  repairedScene: ScriptSegmentDto
  appliedAgents: string[]
}

async function repairFormatPollutionIfNeeded(input: {
  scene: ScriptSegmentDto
  generationInput: StartScriptGenerationInputDto
  runtimeConfig: RuntimeProviderConfig
  generateText?: typeof generateTextWithRuntimeRouter
}): Promise<ScriptSegmentDto> {
  const failures = collectEpisodeGuardFailures(input.scene)
  const pollutionDetails = failures
    .filter((failure) => failure.code === 'template_pollution' || failure.code === 'voice_over')
    .map((failure) => failure.detail)

  if (pollutionDetails.length === 0) {
    return input.scene
  }

  try {
    const { repairedScene } = await repairWithFormatPollutionAgent({
      generationInput: input.generationInput,
      runtimeConfig: input.runtimeConfig,
      previousScene: input.scene,
      pollutionDetails,
      generateText: input.generateText
    })
    return repairedScene
  } catch {
    return input.scene
  }
}

async function repairSceneStructureIfNeeded(input: {
  scene: ScriptSegmentDto
  generationInput: StartScriptGenerationInputDto
  runtimeConfig: RuntimeProviderConfig
  generateText?: typeof generateTextWithRuntimeRouter
}): Promise<{
  repairedScene: ScriptSegmentDto
  changed: boolean
}> {
  const report = inspectScreenplayQualityEpisode(input.scene)
  const structureDetails = report.actionableProblems.filter(
    (problem) =>
      /^场次数不在/.test(problem) ||
      problem === '至少有一场缺人物表' ||
      problem === '至少有一场缺△动作' ||
      problem === '至少有一场对白不足2句' ||
      problem === '至少有一场有效内容不足4行' ||
      problem === '正文仍含待补/模板/伪剧本污染'
  )

  if (structureDetails.length === 0) {
    return { repairedScene: input.scene, changed: false }
  }

  try {
    return await repairWithSceneStructureAgent({
      generationInput: input.generationInput,
      runtimeConfig: input.runtimeConfig,
      previousScene: input.scene,
      structureDetails,
      generateText: input.generateText
    })
  } catch {
    return { repairedScene: input.scene, changed: false }
  }
}

async function repairCharCountIfNeeded(input: {
  scene: ScriptSegmentDto
  generationInput: StartScriptGenerationInputDto
  runtimeConfig: RuntimeProviderConfig
  generateText?: typeof generateTextWithRuntimeRouter
}): Promise<{
  repairedScene: ScriptSegmentDto
  changed: boolean
}> {
  const failures = collectEpisodeGuardFailures(input.scene)
  if (!resolveCharCountAgentMode(failures)) {
    return { repairedScene: input.scene, changed: false }
  }

  try {
    return await repairWithCharCountAgent({
      generationInput: input.generationInput,
      runtimeConfig: input.runtimeConfig,
      previousScene: input.scene,
      failures,
      generateText: input.generateText
    })
  } catch {
    return { repairedScene: input.scene, changed: false }
  }
}

function collectSceneRosterNames(scene: ScriptSegmentDto): string[] {
  const names = new Set<string>()

  for (const item of scene.screenplayScenes || []) {
    for (const characterName of item.characterRoster || []) {
      const trimmed = characterName.trim()
      if (trimmed) names.add(trimmed)
    }
  }

  const screenplay = scene.screenplay || ''
  for (const line of screenplay.split('\n')) {
    const match = line.match(/^人物[:：]\s*(.+)$/)
    if (!match) continue
    for (const rawName of match[1].split(/[、,，/]/)) {
      const trimmed = rawName.trim()
      if (trimmed) names.add(trimmed)
    }
  }

  return [...names]
}

function resolveContentRepairRoles(
  generationInput: StartScriptGenerationInputDto,
  scene: ScriptSegmentDto
): { protagonistName: string; supportingName: string; antagonistName: string; coreEmotion: string } {
  const protagonistName =
    generationInput.outline?.protagonist?.trim() ||
    generationInput.characters?.[0]?.name ||
    '主角'
  const rosterNames = collectSceneRosterNames(scene).filter((name) => name !== protagonistName)
  const knownCharacterNames = (generationInput.characters || [])
    .map((character) => character.name?.trim())
    .filter((name): name is string => Boolean(name && name !== protagonistName))
  const candidateNames = [...new Set([...knownCharacterNames, ...rosterNames])]

  const supportingName = candidateNames[0] || '关键配角'
  const antagonistName =
    candidateNames.find((name) => name !== supportingName) ||
    (generationInput.outline?.mainConflict?.includes('李科') ? '李科' : '') ||
    '对手'
  const episodeControlCard = resolveEpisodeControlCardFromPackage(
    generationInput.scriptControlPackage,
    scene.sceneNo
  )
  const coreEmotion =
    episodeControlCard?.emotionBeat?.trim() ||
    generationInput.scriptControlPackage?.shortDramaConstitution?.coreEmotion?.trim() ||
    generationInput.storyIntent?.shortDramaConstitution?.coreEmotion?.trim() ||
    generationInput.storyIntent?.emotionalPayoff?.trim() ||
    generationInput.theme ||
    generationInput.outline?.theme ||
    generationInput.outline?.summary ||
    ''

  return {
    protagonistName,
    supportingName,
    antagonistName,
    coreEmotion
  }
}

function isBatchClosingEpisode(sceneNo: number, totalEpisodes: number): boolean {
  return sceneNo === totalEpisodes || sceneNo % 5 === 0
}

function isSeasonOpeningEpisode(sceneNo: number): boolean {
  return sceneNo <= 2
}

function isEarlyBiteEpisode(sceneNo: number): boolean {
  return sceneNo <= 3
}

function isOpeningEpisode(sceneNo: number): boolean {
  return sceneNo === 1
}

type EpisodeFocusMode = 'opening_flip' | 'scene_engine' | null

function isEarlyExpansionRiskEpisode(sceneNo: number, screenplayLength: number): boolean {
  return sceneNo === 2 && screenplayLength >= EARLY_EXPANSION_RISK_CHARS
}

function resolveEpisodeFocusMode(
  qualitySignal: ReturnType<typeof inspectContentQualityEpisode>,
  sceneNo: number
): EpisodeFocusMode {
  if (sceneNo === 1 && qualitySignal.dramaticTurnScore < 78) {
    return 'opening_flip'
  }

  if (sceneNo === 4 && qualitySignal.sceneEngineScore < 66) {
    return 'scene_engine'
  }

  return null
}

function resolveEpisodeEngineExpectedEvent(
  focusMode: EpisodeFocusMode
): string | undefined {
  if (focusMode === 'opening_flip') {
    return '集尾必须完成一次受压后的当场反咬：对手先失去一个筹码、脸面或控制权，主角不是只追出去，而是已经逼出一个结果。'
  }

  if (focusMode === 'scene_engine') {
    return '每一场都必须补出“阻碍 -> 应对 -> 结果”，而且至少有一场当场改局；不能只继续施压或观察，却没有实际后果落地。'
  }

  return undefined
}

function isEmotionLaneEpisode(sceneNo: number, totalEpisodes: number): boolean {
  return isSeasonOpeningEpisode(sceneNo) || isBatchClosingEpisode(sceneNo, totalEpisodes)
}

function shouldRunEpisodeEngineAgent(
  qualitySignal: ReturnType<typeof inspectContentQualityEpisode>,
  sceneNo: number
): boolean {
  const earlyEpisode = isEarlyBiteEpisode(sceneNo)
  const openingEpisode = isOpeningEpisode(sceneNo)
  return (
    qualitySignal.loops.some((loop) => loop.isRealLoop) ||
    qualitySignal.plotNoveltyScore < (openingEpisode ? 63 : earlyEpisode ? 60 : 55) ||
    qualitySignal.dramaticTurnScore < (openingEpisode ? 72 : earlyEpisode ? 66 : 60) ||
    qualitySignal.sceneEngineScore < (openingEpisode ? 65 : earlyEpisode ? 62 : 58)
  )
}

function shouldRunArcControlAgent(
  qualitySignal: ReturnType<typeof inspectContentQualityEpisode>,
  sceneNo: number
): boolean {
  const protagonistArc = qualitySignal.characterArcs[0]
  const stagnantCount = qualitySignal.characterArcs.filter(
    (arc) => arc.status === 'stagnant' || arc.status === 'regressed'
  ).length
  const earlyEpisode = isEarlyBiteEpisode(sceneNo)
  const openingEpisode = isOpeningEpisode(sceneNo)

  return (
    qualitySignal.characterFunctionScore < (openingEpisode ? 65 : earlyEpisode ? 60 : 55) ||
    protagonistArc?.status === 'stagnant' ||
    protagonistArc?.status === 'regressed' ||
    stagnantCount >= 2
  )
}

function shouldRunEmotionLaneAgent(input: {
  qualitySignal: ReturnType<typeof inspectContentQualityEpisode>
  sceneNo: number
  totalEpisodes: number
  screenplayLength: number
}): boolean {
  const { qualitySignal, sceneNo, totalEpisodes, screenplayLength } = input
  const keyEpisode = isEmotionLaneEpisode(sceneNo, totalEpisodes)
  const earlyExpansionRisk = isEarlyExpansionRiskEpisode(sceneNo, screenplayLength)
  const storyBaseReady =
    qualitySignal.dramaticTurnScore >= 55 &&
    qualitySignal.sceneEngineScore >= 55 &&
    qualitySignal.characterFunctionScore >= 50

  if (!storyBaseReady || earlyExpansionRisk) {
    return false
  }

  if (screenplayLength >= CONTENT_REPAIR_SOFT_CAP_CHARS) {
    return false
  }

  return keyEpisode && qualitySignal.themeAnchoringScore < 60
}

function pickNextContentRepairType(input: {
  qualitySignal: ReturnType<typeof inspectContentQualityEpisode>
  sceneNo: number
  totalEpisodes: number
  screenplayLength: number
  alreadyTried: Set<'episode_engine' | 'arc_control' | 'emotion_lane'>
  focusMode: EpisodeFocusMode
}): 'episode_engine' | 'arc_control' | 'emotion_lane' | null {
  const { qualitySignal, sceneNo, totalEpisodes, screenplayLength, alreadyTried, focusMode } = input
  const earlyExpansionRisk = isEarlyExpansionRiskEpisode(sceneNo, screenplayLength)

  if (focusMode) {
    if (!alreadyTried.has('episode_engine') && shouldRunEpisodeEngineAgent(qualitySignal, sceneNo)) {
      return 'episode_engine'
    }
    return null
  }

  if (!alreadyTried.has('episode_engine') && shouldRunEpisodeEngineAgent(qualitySignal, sceneNo)) {
    return 'episode_engine'
  }

  if (earlyExpansionRisk) {
    return null
  }

  if (!alreadyTried.has('arc_control') && shouldRunArcControlAgent(qualitySignal, sceneNo)) {
    return 'arc_control'
  }

  if (
    !alreadyTried.has('emotion_lane') &&
    shouldRunEmotionLaneAgent({ qualitySignal, sceneNo, totalEpisodes, screenplayLength })
  ) {
    return 'emotion_lane'
  }

  return null
}

/**
 * 内容质量修复：推进引擎/弧光控制/情绪车道。
 * 独立于 guard repair 运行，不要求 guard 全过。
 * enableContentRepair=true 时触发。
 */
async function repairContentQuality(input: {
  scene: ScriptSegmentDto
  generationInput: StartScriptGenerationInputDto
  runtimeConfig: RuntimeProviderConfig
  generateText?: typeof generateTextWithRuntimeRouter
}): Promise<ScriptSegmentDto> {
  const generateText = input.generateText ?? generateTextWithRuntimeRouter
  const { protagonistName, supportingName, antagonistName, coreEmotion } = resolveContentRepairRoles(
    input.generationInput,
    input.scene
  )

  let currentScene = input.scene
  const attemptedTypes = new Set<'episode_engine' | 'arc_control' | 'emotion_lane'>()

  for (let pass = 0; pass < MAX_CONTENT_REPAIR_PASSES; pass += 1) {
    const qualitySignal = inspectContentQualityEpisode(currentScene, {
      protagonistName,
      supportingName,
      antagonistName,
      themeText: coreEmotion
    })
    const focusMode = resolveEpisodeFocusMode(qualitySignal, currentScene.sceneNo || 0)

    const nextType = pickNextContentRepairType({
      qualitySignal,
      sceneNo: currentScene.sceneNo || 0,
      totalEpisodes: input.generationInput.plan.targetEpisodes,
      screenplayLength: (currentScene.screenplay || '').length,
      alreadyTried: attemptedTypes,
      focusMode
    })

    if (qualitySignal.overallScore >= 65 && nextType === null) {
      return currentScene
    }

    if (!nextType) {
      return currentScene
    }

    attemptedTypes.add(nextType)

    try {
      if (nextType === 'episode_engine') {
        const realLoops = qualitySignal.loops.filter((l) => l.isRealLoop)
        const tacticRotation = qualitySignal.tacticRotation
        const { repairedScene } = await repairWithEpisodeEngineAgent({
          generationInput: input.generationInput,
          runtimeConfig: input.runtimeConfig,
          previousScene: currentScene,
          loopsDetected: realLoops.map((l) => ({ patternId: l.patternId, patternLabel: l.patternLabel })),
          expectedEvent: resolveEpisodeEngineExpectedEvent(focusMode),
          tacticRotationViolation: tacticRotation.isDuplicate
            ? {
                isDuplicate: tacticRotation.isDuplicate,
                suggestedCategory: tacticRotation.suggestedCategory
                  ? TACTIC_CATEGORY_LABELS[tacticRotation.suggestedCategory]
                  : undefined,
                currentCategory: tacticRotation.currentCategory
                  ? TACTIC_CATEGORY_LABELS[tacticRotation.currentCategory]
                  : undefined
              }
            : undefined,
          generateText
        })
        currentScene = repairedScene
      } else if (nextType === 'arc_control') {
        const { repairedScene } = await repairWithArcControlAgent({
          generationInput: input.generationInput,
          runtimeConfig: input.runtimeConfig,
          previousScene: currentScene,
          characterArcs: qualitySignal.characterArcs,
          protagonistName,
          supportingName,
          antagonistName,
          weaknessDetection: qualitySignal.weaknessDetection,
          generateText
        })
        currentScene = repairedScene
      } else if (nextType === 'emotion_lane') {
        const { repairedScene } = await repairWithEmotionLaneAgent({
          generationInput: input.generationInput,
          runtimeConfig: input.runtimeConfig,
          previousScene: currentScene,
          emotionAnchoringScore: qualitySignal.themeAnchoringScore,
          protagonistName,
          coreEmotion,
          generateText
        })
        currentScene = repairedScene
      }
    } catch {
      break
    }
  }

  return currentScene
}

export async function repairScriptQualityWithAgents(input: {
  generationInput: StartScriptGenerationInputDto
  runtimeConfig: RuntimeProviderConfig
  generatedScenes: StartScriptGenerationResultDto['generatedScenes']
  generateText?: typeof generateTextWithRuntimeRouter
  /** 默认 true：打通内容质量 Agent；测试时传 false 避免触发额外调用 */
  enableContentRepair?: boolean
  phase?: ScriptRepairPhase
}): Promise<{
  repairedScenes: StartScriptGenerationResultDto['generatedScenes']
}> {
  const generateText = input.generateText ?? generateTextWithRuntimeRouter
  const repairedScenes: ScriptSegmentDto[] = []
  const phase = input.phase || 'phase_b'

  for (const scene of input.generatedScenes) {
    if (input.enableContentRepair === false) {
      repairedScenes.push(scene)
      continue
    }

    try {
      if (phase === 'phase_a') {
        const result = await repairScriptSceneWithAgents({
          generationInput: input.generationInput,
          runtimeConfig: input.runtimeConfig,
          scene,
          generateText
        })
        repairedScenes.push(result.repairedScene)
        continue
      }

      const contentRepairedScene = await repairContentQuality({
        scene,
        generationInput: input.generationInput,
        runtimeConfig: input.runtimeConfig,
        generateText
      })
      repairedScenes.push(contentRepairedScene)
    } catch {
      repairedScenes.push(scene)
    }
  }

  return {
    repairedScenes
  }
}

export async function repairScriptSceneWithAgents(input: {
  generationInput: StartScriptGenerationInputDto
  runtimeConfig: RuntimeProviderConfig
  scene: ScriptSegmentDto
  generateText?: typeof generateTextWithRuntimeRouter
}): Promise<ScriptSceneRepairResult> {
  const appliedAgents: string[] = []
  let currentScene = input.scene

  const formatResult = await repairFormatPollutionIfNeeded({
    scene: currentScene,
    generationInput: input.generationInput,
    runtimeConfig: input.runtimeConfig,
    generateText: input.generateText
  })
  if (formatResult !== currentScene) {
    appliedAgents.push('format_pollution')
    currentScene = formatResult
  }

  const structureResult = await repairSceneStructureIfNeeded({
    scene: currentScene,
    generationInput: input.generationInput,
    runtimeConfig: input.runtimeConfig,
    generateText: input.generateText
  })
  if (structureResult.repairedScene !== currentScene) {
    appliedAgents.push('scene_structure')
    currentScene = structureResult.repairedScene
  }

  const charCountResult = await repairCharCountIfNeeded({
    scene: currentScene,
    generationInput: input.generationInput,
    runtimeConfig: input.runtimeConfig,
    generateText: input.generateText
  })
  if (charCountResult.repairedScene !== currentScene) {
    appliedAgents.push('char_count')
    currentScene = charCountResult.repairedScene
  }

  return {
    repairedScene: currentScene,
    appliedAgents
  }
}

