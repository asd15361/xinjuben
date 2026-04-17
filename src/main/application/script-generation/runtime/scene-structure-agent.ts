import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text.ts'
import { resolveAiStageTimeoutMs } from '../../ai/resolve-ai-stage-timeout.ts'
import type { ModelRouteLane } from '../../../../shared/contracts/ai'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow'
import { buildAgentRepairPrompt } from './build-agent-repair-prompt.ts'
import { parseGeneratedScene } from './parse-generated-scene.ts'
import {
  collectEpisodeGuardFailures,
  shouldAcceptRepairCandidate
} from '../../../../shared/domain/script/screenplay-repair-guard.ts'

export async function repairWithSceneStructureAgent(input: {
  generationInput: {
    plan: {
      targetEpisodes: number
      episodePlans: Array<{ episodeNo: number; lane?: ModelRouteLane; runtimeHints?: Record<string, unknown> }>
      recommendedPrimaryLane: ModelRouteLane
    }
  }
  runtimeConfig: RuntimeProviderConfig
  previousScene: ScriptSegmentDto
  structureDetails: string[]
  generateText?: typeof generateTextWithRuntimeRouter
}): Promise<{
  repairedScene: ScriptSegmentDto
  changed: boolean
}> {
  const generateText = input.generateText ?? generateTextWithRuntimeRouter
  const prompt = buildAgentRepairPrompt({
    agentType: 'scene_structure',
    previousScene: input.previousScene,
    problemDescription: input.structureDetails.join('；'),
    goalDescription:
      '修正场次数、场号、人物表和最小场结构，只保留正式可拍的多场剧本，不改剧情事实和承接结果。',
    extraInstructions: [
      '如果场号重复、丢场或把多场揉成一场，必须恢复成原定 2-4 场结构。',
      '每一场都必须保留：场标题、人物表、至少 1 条有效△动作、至少 2 句有效对白。',
      '像“人物：人物”“人物：场景”“△# 第X集”“本集终”这类壳，一律删掉，不准换壳保留。',
      '如果同一个场号出现占位版和正式版，只保留正式版。'
    ]
  })

  const lane =
    input.generationInput.plan.episodePlans.find(
      (item) => item.episodeNo === input.previousScene.sceneNo
    )?.lane ?? input.generationInput.plan.recommendedPrimaryLane

  const runtimeHints = {
    episode: input.previousScene.sceneNo,
    totalEpisodes: input.generationInput.plan.targetEpisodes,
    strictness: 'strict' as const,
    isRewriteMode: true
  }

  const result = await generateText(
    {
      task: 'episode_rewrite',
      prompt,
      preferredLane: lane,
      allowFallback: false,
      temperature: 0.3,
      timeoutMs: resolveAiStageTimeoutMs('episode_rewrite', runtimeHints),
      runtimeHints
    },
    input.runtimeConfig
  )

  const candidateScene = parseGeneratedScene(result.text, input.previousScene.sceneNo)
  const targetProblems = new Set(
    collectEpisodeGuardFailures(input.previousScene)
      .filter((item) => item.code === 'scene_count' || item.code === 'template_pollution')
      .map((item) => item.code)
  )
  const remainingTargetProblems = new Set(
    collectEpisodeGuardFailures(candidateScene)
      .filter((item) => item.code === 'scene_count' || item.code === 'template_pollution')
      .map((item) => item.code)
  )
  const changed =
    shouldAcceptRepairCandidate(input.previousScene, candidateScene) ||
    (targetProblems.size > 0 &&
      [...targetProblems].every((code) => !remainingTargetProblems.has(code)))

  return {
    repairedScene: changed ? candidateScene : input.previousScene,
    changed
  }
}
