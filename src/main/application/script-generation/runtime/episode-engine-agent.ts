/**
 * src/main/application/script-generation/runtime/episode-engine-agent.ts
 *
 * 推进引擎 Agent。
 *
 * 职责：打破已知循环模式、引入新事件、让局面真正往前推。
 *
 * 基于原稿改，不从零重写。
 */

import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text.ts'
import { resolveAiStageTimeoutMs } from '../../ai/resolve-ai-stage-timeout.ts'
import type { ModelRouteLane } from '../../../../shared/contracts/ai'
import {
  buildEpisodeEngineAgentPrompt,
  type EpisodeEngineAgentInput
} from './build-episode-engine-agent-prompt.ts'
import { parseGeneratedScene } from './parse-generated-scene.ts'
import { shouldAcceptRepairCandidate } from './run-script-generation-batch.ts'

export type { EpisodeEngineAgentInput }

/**
 * 推进引擎 Agent 修复。
 *
 * 基于原稿，打破循环，引入新事件，补出明确推进结果。
 */
export async function repairWithEpisodeEngineAgent(input: {
  generationInput: {
    plan: {
      targetEpisodes: number
      episodePlans: Array<{ episodeNo: number; lane?: ModelRouteLane; runtimeHints?: Record<string, unknown> }>
      recommendedPrimaryLane: ModelRouteLane
    }
  }
  runtimeConfig: RuntimeProviderConfig
  previousScene: EpisodeEngineAgentInput['previousScene']
  loopsDetected: EpisodeEngineAgentInput['loopsDetected']
  /** 打法轮换违规信息（可选） */
  tacticRotationViolation?: EpisodeEngineAgentInput['tacticRotationViolation']
  nextEpisodeHint?: string
  expectedEvent?: string
  generateText?: typeof generateTextWithRuntimeRouter
}): Promise<{
  repairedScene: EpisodeEngineAgentInput['previousScene']
  changed: boolean
}> {
  const generateText = input.generateText ?? generateTextWithRuntimeRouter

  const prompt = buildEpisodeEngineAgentPrompt({
    previousScene: input.previousScene,
    loopsDetected: input.loopsDetected,
    nextEpisodeHint: input.nextEpisodeHint,
    expectedEvent: input.expectedEvent,
    tacticRotationViolation: input.tacticRotationViolation
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

