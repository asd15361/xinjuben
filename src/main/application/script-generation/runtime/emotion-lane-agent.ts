/**
 * src/main/application/script-generation/runtime/emotion-lane-agent.ts
 *
 * 情绪车道 Agent。
 *
 * 职责：让核心情绪在剧本里保持单车道推进，不中途乱跳。
 *
 * 基于原稿改，不从零重写。
 */

import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text.ts'
import { resolveAiStageTimeoutMs } from '../../ai/resolve-ai-stage-timeout.ts'
import type { ModelRouteLane } from '../../../../shared/contracts/ai'
import {
  buildEmotionLaneAgentPrompt,
  type EmotionLaneAgentInput
} from './build-emotion-lane-agent-prompt.ts'
import { parseGeneratedScene } from './parse-generated-scene.ts'
import { shouldAcceptRepairCandidate } from './run-script-generation-batch.ts'

export type { EmotionLaneAgentInput }

/**
 * 情绪车道 Agent 修复。
 *
 * 基于原稿，让核心情绪稳定落地。
 */
export async function repairWithEmotionLaneAgent(input: {
  generationInput: {
    plan: {
      targetEpisodes: number
      episodePlans: Array<{ episodeNo: number; lane?: ModelRouteLane; runtimeHints?: Record<string, unknown> }>
      recommendedPrimaryLane: ModelRouteLane
    }
  }
  runtimeConfig: RuntimeProviderConfig
  previousScene: EmotionLaneAgentInput['previousScene']
  emotionAnchoringScore: number
  protagonistName: string
  coreEmotion?: string
  generateText?: typeof generateTextWithRuntimeRouter
}): Promise<{
  repairedScene: EmotionLaneAgentInput['previousScene']
  changed: boolean
}> {
  const generateText = input.generateText ?? generateTextWithRuntimeRouter

  const prompt = buildEmotionLaneAgentPrompt({
    previousScene: input.previousScene,
    emotionAnchoringScore: input.emotionAnchoringScore,
    protagonistName: input.protagonistName,
    coreEmotion: input.coreEmotion
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

