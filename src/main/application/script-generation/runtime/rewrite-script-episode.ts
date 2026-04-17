import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config.ts'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text.ts'
import { resolveAiStageTimeoutMs } from '../../ai/resolve-ai-stage-timeout.ts'
import type {
  RewriteScriptEpisodeInputDto,
  RewriteScriptEpisodeResultDto
} from '../../../../shared/contracts/script-generation.ts'
import { collectEpisodeGuardFailures, shouldAcceptRepairCandidate } from '../../../../shared/domain/script/screenplay-repair-guard.ts'
import { parseGeneratedScene } from './parse-generated-scene.ts'
import { buildEpisodeEditPrompt } from './run-script-generation-batch.ts'

export async function rewriteScriptEpisode(
  input: RewriteScriptEpisodeInputDto,
  runtimeConfig: RuntimeProviderConfig,
  deps?: {
    generateText?: typeof generateTextWithRuntimeRouter
  }
): Promise<RewriteScriptEpisodeResultDto> {
  const previousScene = input.existingScript.find((scene) => scene.sceneNo === input.episodeNo)
  if (!previousScene) {
    throw new Error(`rewrite_script_episode_missing_scene:${input.episodeNo}`)
  }

  const failures = collectEpisodeGuardFailures(previousScene)
  const episodePlan = input.plan.episodePlans.find((episode) => episode.episodeNo === input.episodeNo)
  const generateText = deps?.generateText ?? generateTextWithRuntimeRouter
  const prompt = buildEpisodeEditPrompt({
    previousScene,
    failures
  })
  const runtimeHints = {
    episode: input.episodeNo,
    totalEpisodes: input.plan.targetEpisodes,
    estimatedContextTokens: episodePlan?.runtimeHints?.estimatedContextTokens ?? 1600,
    strictness: 'strict' as const,
    hasP0Risk: true,
    hasHardAlignerRisk: false,
    isRewriteMode: true,
    recoveryMode: 'retry_runtime' as const
  }

  const result = await generateText(
    {
      task: 'episode_rewrite',
      prompt,
      preferredLane: episodePlan?.lane ?? input.plan.recommendedPrimaryLane,
      allowFallback: false,
      temperature: 0.45,
      timeoutMs: resolveAiStageTimeoutMs('episode_rewrite', runtimeHints),
      runtimeHints
    },
    runtimeConfig
  )

  const candidateScene = parseGeneratedScene(result.text, input.episodeNo)
  const acceptedScene = shouldAcceptRepairCandidate(previousScene, candidateScene)
    ? candidateScene
    : previousScene
  const acceptedFailures = collectEpisodeGuardFailures(acceptedScene)

  return {
    scene: acceptedScene,
    failures: acceptedFailures.map((failure) => ({
      code: failure.code,
      detail: failure.detail
    }))
  }
}
