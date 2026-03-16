import type {
  ExecuteScriptRepairInputDto,
  ExecuteScriptRepairResultDto
} from '../../../../shared/contracts/script-audit'
import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text'
import { buildRepairPrompt } from './build-repair-prompt'
import { applyFallbackRuleRepair } from './fallback-rule-repair'
import { parseAiRepairedScene } from './parse-ai-repaired-scene'
import { buildRepairLedger } from './repair-ledger'

async function repairSceneWithAi(input: {
  suggestion: ExecuteScriptRepairInputDto['suggestions'][number]
  targetScene: ScriptSegmentDto
  storyIntent?: ExecuteScriptRepairInputDto['storyIntent']
  outline: NonNullable<ExecuteScriptRepairInputDto['outline']>
  segments: NonNullable<ExecuteScriptRepairInputDto['segments']>
  runtimeConfig: RuntimeProviderConfig
  ledger: NonNullable<ReturnType<typeof buildRepairLedger>>
}): Promise<ScriptSegmentDto> {
  const response = await generateTextWithRuntimeRouter(
    {
      task: 'episode_rewrite',
      prompt: buildRepairPrompt(input),
      allowFallback: true,
      temperature: 0.55,
      runtimeHints: {
        episode: input.targetScene.sceneNo,
        totalEpisodes: Math.max(input.targetScene.sceneNo, input.ledger.sceneCount || 1),
        estimatedContextTokens: 16000,
        strictness: 'strict',
        hasP0Risk: true,
        hasHardAlignerRisk: true,
        isRewriteMode: true,
        recoveryMode: 'retry_runtime'
      }
    },
    input.runtimeConfig
  )

  return parseAiRepairedScene(response.text, input.targetScene)
}

export async function executeScriptRepair(
  input: ExecuteScriptRepairInputDto,
  runtimeConfig?: RuntimeProviderConfig
): Promise<ExecuteScriptRepairResultDto> {
  const repairedScript = input.script.map((scene) => ({ ...scene }))
  const latestKnownLedger = buildRepairLedger(input, repairedScript)

  for (const suggestion of input.suggestions) {
    if (!suggestion.targetSceneNo) continue
    const target = repairedScript.find((scene) => scene.sceneNo === suggestion.targetSceneNo)
    if (!target) continue

    if (runtimeConfig && input.outline && input.segments && latestKnownLedger) {
      try {
        const repairedScene = await repairSceneWithAi({
          suggestion,
          targetScene: target,
          ledger: latestKnownLedger,
          storyIntent: input.storyIntent,
          outline: input.outline,
          segments: input.segments,
          runtimeConfig
        })
        target.action = repairedScene.action
        target.dialogue = repairedScene.dialogue
        target.emotion = repairedScene.emotion
        continue
      } catch {
        // AI 修补失败时，不再让规则保底代替创作本身。
      }
    }

    applyFallbackRuleRepair({
      targetScene: target,
      ledger: latestKnownLedger,
      instruction: suggestion.instruction,
      focus: suggestion.focus
    })
  }

  return {
    repairedScript,
    ledger: buildRepairLedger(input, repairedScript)
  }
}
