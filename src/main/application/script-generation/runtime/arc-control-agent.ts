/**
 * src/main/application/script-generation/runtime/arc-control-agent.ts
 *
 * 弧光控制 Agent。
 *
 * 职责：修复停滞或退化的人物弧线，让角色有明确的选择、改位和施压。
 *
 * 基于原稿改，不从零重写。
 */

import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text.ts'
import { resolveAiStageTimeoutMs } from '../../ai/resolve-ai-stage-timeout.ts'
import type { ModelRouteLane } from '../../../../shared/contracts/ai'
import {
  buildArcControlAgentPrompt,
  type ArcControlAgentInput
} from './build-arc-control-agent-prompt.ts'
import type { WeaknessDetectionResult } from '../../../../shared/domain/script/screenplay-weakness-detection.ts'
import { parseGeneratedScene } from './parse-generated-scene.ts'
import { shouldAcceptRepairCandidate } from './run-script-generation-batch.ts'

export type { ArcControlAgentInput }

/**
 * 弧光控制 Agent 修复。
 *
 * 基于原稿，推进人物弧线和角色戏剧功能。
 */
export async function repairWithArcControlAgent(input: {
  generationInput: {
    plan: {
      targetEpisodes: number
      episodePlans: Array<{ episodeNo: number; lane?: ModelRouteLane; runtimeHints?: Record<string, unknown> }>
      recommendedPrimaryLane: ModelRouteLane
    }
  }
  runtimeConfig: RuntimeProviderConfig
  previousScene: ArcControlAgentInput['previousScene']
  characterArcs: ArcControlAgentInput['characterArcs']
  protagonistName: string
  supportingName: string
  antagonistName: string
  /** 窝囊检测结果（可选） */
  weaknessDetection?: WeaknessDetectionResult
  generateText?: typeof generateTextWithRuntimeRouter
}): Promise<{
  repairedScene: ArcControlAgentInput['previousScene']
  changed: boolean
}> {
  const generateText = input.generateText ?? generateTextWithRuntimeRouter

  const prompt = buildArcControlAgentPrompt({
    previousScene: input.previousScene,
    characterArcs: input.characterArcs,
    protagonistName: input.protagonistName,
    supportingName: input.supportingName,
    antagonistName: input.antagonistName,
    weaknessDetection: input.weaknessDetection
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
      temperature: 0.45,
      timeoutMs: resolveAiStageTimeoutMs('episode_rewrite', runtimeHints),
      runtimeHints
    },
    input.runtimeConfig
  )

  const candidateScene = parseGeneratedScene(result.text, input.previousScene.sceneNo)
  const changed = shouldAcceptRepairCandidate(input.previousScene, candidateScene)

  return {
    repairedScene: changed ? candidateScene : input.previousScene,
    changed
  }
}

