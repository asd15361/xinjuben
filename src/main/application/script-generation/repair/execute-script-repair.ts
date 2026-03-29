import type {
  ExecuteScriptRepairInputDto,
  ExecuteScriptRepairResultDto
} from '../../../../shared/contracts/script-audit'
import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text.ts'
import { resolveAiStageTimeoutMs } from '../../ai/resolve-ai-stage-timeout.ts'
import { buildRepairPrompt } from './build-repair-prompt.ts'
import { parseAiRepairedScene } from './parse-ai-repaired-scene.ts'
import { buildRepairLedger } from './repair-ledger.ts'
import { looksLikeScreenplayFormat } from '../../../../shared/domain/script/screenplay-format.ts'

async function repairSceneWithAi(input: {
  suggestion: ExecuteScriptRepairInputDto['suggestions'][number]
  targetScene: ScriptSegmentDto
  storyIntent?: ExecuteScriptRepairInputDto['storyIntent']
  outline: NonNullable<ExecuteScriptRepairInputDto['outline']>
  segments: NonNullable<ExecuteScriptRepairInputDto['segments']>
  runtimeConfig: RuntimeProviderConfig
  ledger: NonNullable<ReturnType<typeof buildRepairLedger>>
}): Promise<{ repairedScene: ScriptSegmentDto; rawText: string }> {
  const response = await generateTextWithRuntimeRouter(
    {
      task: 'episode_rewrite',
      prompt: buildRepairPrompt(input),
      allowFallback: false,
      temperature: 0.55,
      timeoutMs: resolveAiStageTimeoutMs('episode_rewrite'),
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

  const repairedScene = parseAiRepairedScene(response.text, input.targetScene)
  return { repairedScene, rawText: response.text }
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
        const { repairedScene, rawText } = await repairSceneWithAi({
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
        // [REGRESSION GUARD] 仅当 repair 输出 actual screenplay 格式时才更新 screenplay/screenplayScenes。
        // A/D/E repair 输出会重建为 1 场（硬编码 N-1 heading），覆盖 generation 的多场 screenplay，
        // 导致质量 gate 读到的 sceneCount 变成 1。
        // looksLikeScreenplayFormat(rawText) === false 时（即 repair 输出 A/D/E 格式），保留 generation 结果。
        const isRepairScreenplayFormat = looksLikeScreenplayFormat(rawText)
        if (isRepairScreenplayFormat && repairedScene.screenplay !== undefined) {
          target.screenplay = repairedScene.screenplay
        }
        if (isRepairScreenplayFormat && repairedScene.screenplayScenes !== undefined) {
          target.screenplayScenes = repairedScene.screenplayScenes
        }
        continue
      } catch {
        // [REGRESSION GUARD] AI 修补失败时保留原稿（action/dialogue/emotion/screenplayScenes 全部不做任何更新）。
        // 这保护 ep7 型场景：generation 产生多场，但 repair parse 失败（如 ellipsis 压缩）。
        // 旧代码在此处没有 try/catch，会导致 caller 收到不完整结果。
        continue
      }
    }
  }

  return {
    repairedScript,
    ledger: buildRepairLedger(input, repairedScript)
  }
}
