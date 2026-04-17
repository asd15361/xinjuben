import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text.ts'
import { resolveAiStageTimeoutMs } from '../../ai/resolve-ai-stage-timeout.ts'
import type { ModelRouteLane } from '../../../../shared/contracts/ai'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow'
import {
  collectEpisodeGuardFailures,
  shouldAcceptRepairCandidate
} from '../../../../shared/domain/script/screenplay-repair-guard.ts'
import { buildAgentRepairPrompt } from './build-agent-repair-prompt.ts'
import { parseGeneratedScene } from './parse-generated-scene.ts'

export async function repairWithFormatPollutionAgent(input: {
  generationInput: {
    plan: {
      targetEpisodes: number
      episodePlans: Array<{ episodeNo: number; lane?: ModelRouteLane; runtimeHints?: Record<string, unknown> }>
      recommendedPrimaryLane: ModelRouteLane
    }
  }
  runtimeConfig: RuntimeProviderConfig
  previousScene: ScriptSegmentDto
  pollutionDetails: string[]
  generateText?: typeof generateTextWithRuntimeRouter
}): Promise<{
  repairedScene: ScriptSegmentDto
  changed: boolean
}> {
  const generateText = input.generateText ?? generateTextWithRuntimeRouter

  const prompt = buildAgentRepairPrompt({
    agentType: 'format_pollution',
    previousScene: input.previousScene,
    problemDescription: input.pollutionDetails.join('；'),
    goalDescription:
      '删掉 placeholder stub、模板脏头、旧格式残留和不可拍污染，只保留正式可拍的剧本文本，不改剧情事实和场次承接。',
    extraInstructions: [
      '如果原稿前面混进了重复假场头，只保留后面那段正式场头和正式内容。',
      '像“人物：人物”“人物：场景”“△# 第X集”这类 placeholder stub 必须彻底删掉，不能换个写法继续留下。',
      '如果同一个场号出现了占位版和正式版，只保留正式版。'
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
      temperature: 0.35,
      timeoutMs: resolveAiStageTimeoutMs('episode_rewrite', runtimeHints),
      runtimeHints
    },
    input.runtimeConfig
  )

  const candidateScene = parseGeneratedScene(result.text, input.previousScene.sceneNo)
  const originalCodes = new Set(
    collectEpisodeGuardFailures(input.previousScene)
      .filter((item) => item.code === 'template_pollution' || item.code === 'voice_over')
      .map((item) => item.code)
  )
  const candidateCodes = new Set(
    collectEpisodeGuardFailures(candidateScene)
      .filter((item) => item.code === 'template_pollution' || item.code === 'voice_over')
      .map((item) => item.code)
  )
  const cleanedOwnProblems =
    originalCodes.size > 0 &&
    [...originalCodes].every((code) => !candidateCodes.has(code))
  const changed =
    shouldAcceptRepairCandidate(input.previousScene, candidateScene) || cleanedOwnProblems

  return {
    repairedScene: changed ? candidateScene : input.previousScene,
    changed
  }
}
