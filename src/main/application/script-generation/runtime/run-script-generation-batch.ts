import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text.ts'
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../../shared/contracts/workflow'
import type {
  ScriptGenerationProgressBoardDto,
  StartScriptGenerationInputDto,
  StartScriptGenerationResultDto
} from '../../../../shared/contracts/script-generation'
import { advanceScriptGenerationState } from '../state-machine.ts'
import { createScriptGenerationPrompt } from '../prompt/create-script-generation-prompt.ts'
import { parseGeneratedScene } from './parse-generated-scene.ts'
import { selectBatchEpisodesForRun } from './select-script-generation-batch.ts'
import { resolveAiStageTimeoutMs } from '../../ai/resolve-ai-stage-timeout.ts'
import fs from 'node:fs'
import path from 'node:path'

function writeEpisodeEvidenceIfEnabled(
  episodeNo: number,
  rawText: string,
  promptLength: number,
  parsedScene: { sceneNo: number; action: string; dialogue: string; emotion: string }
): void {
  const caseId = process.env.E2E_CASE_ID
  if (!caseId) return
  try {
    // Keep rawText truncation at 8000 to avoid filling disk with debug evidence.
    // Truncation is detectable via rawTextLength > 8000 or explicit `truncated` flag.
    const RAW_TEXT_MAX = 8000
    const isTruncated = rawText.length > RAW_TEXT_MAX
    const evidence = {
      episodeNo,
      timestamp: new Date().toISOString(),
      promptLength,
      rawTextLength: rawText.length,
      rawText: rawText.substring(0, RAW_TEXT_MAX),
      truncated: isTruncated,
      parsedLength: (parsedScene.action + parsedScene.dialogue + parsedScene.emotion).length,
      parsed: {
        sceneNo: parsedScene.sceneNo,
        actionLength: parsedScene.action.length,
        dialogueLength: parsedScene.dialogue.length,
        emotionLength: parsedScene.emotion.length,
        actionPreview: parsedScene.action.substring(0, 100),
        dialoguePreview: parsedScene.dialogue.substring(0, 100),
        emotionPreview: parsedScene.emotion.substring(0, 100)
      }
    }
    const outDir = path.join(process.cwd(), 'tools', 'e2e', 'out', `evidence-${caseId}`)
    fs.mkdirSync(outDir, { recursive: true })
    const filePath = path.join(outDir, `ep${episodeNo}-evidence.json`)
    fs.writeFileSync(filePath, JSON.stringify(evidence, null, 2), 'utf8')
  } catch {
    // non-blocking — evidence is optional
  }
}

export async function runScriptGenerationBatch(input: {
  generationInput: StartScriptGenerationInputDto
  runtimeConfig: RuntimeProviderConfig
  board: ScriptGenerationProgressBoardDto
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  existingScript: ScriptSegmentDto[]
  onProgress?: (payload: {
    phase: 'generate_batch'
    detail: string
    board: ScriptGenerationProgressBoardDto
  }) => void
}): Promise<{
  board: ScriptGenerationProgressBoardDto
  generatedScenes: StartScriptGenerationResultDto['generatedScenes']
  /** Raw AI output text per episode — used for evidence logging only, not part of production logic */
  rawTexts?: Array<{ episodeNo: number; text: string; promptLength: number }>
  failure?: {
    episodeNo: number
    message: string
  }
}> {
  const resolveTemperature = (
    episodeNo: number,
    runtimeHints: (typeof input.generationInput.plan.episodePlans)[number]['runtimeHints']
  ) => {
    if (runtimeHints?.recoveryMode === 'retry_parse') return 0.45
    if (runtimeHints?.recoveryMode === 'retry_coverage') return 0.55
    if (runtimeHints?.recoveryMode === 'retry_runtime') return 0.6
    if (episodeNo === 1) return 0.45
    if (runtimeHints?.strictness === 'strict') return 0.65
    return 0.78
  }

  let board = input.board
  const readyEpisodes = selectBatchEpisodesForRun(input.generationInput.plan, board)
  const generatedScenes: StartScriptGenerationResultDto['generatedScenes'] = []
  const rawTexts: Array<{ episodeNo: number; text: string; promptLength: number }> = []

  if (readyEpisodes.length === 0) {
    return {
      board,
      generatedScenes
    }
  }

  for (const episode of readyEpisodes) {
    board = advanceScriptGenerationState(board, {
      type: 'episode_started',
      episodeNo: episode.episodeNo,
      reason: '当前集进入生成中。'
    })
    input.onProgress?.({
      phase: 'generate_batch',
      detail: `第${episode.episodeNo}集开始生成`,
      board
    })

    try {
      const promptText = createScriptGenerationPrompt(
        {
          ...input.generationInput,
          existingScript: [...input.generationInput.existingScript, ...generatedScenes]
        },
        input.outline,
        input.characters,
        episode.episodeNo,
        generatedScenes
      )
      const result = await generateTextWithRuntimeRouter(
        {
          task: 'episode_script',
          prompt: promptText,
          preferredLane: episode.lane,
          allowFallback: false,
          temperature: resolveTemperature(episode.episodeNo, episode.runtimeHints),
          timeoutMs: resolveAiStageTimeoutMs('episode_script', episode.runtimeHints),
          runtimeHints: episode.runtimeHints
        },
        input.runtimeConfig
      )

      rawTexts.push({
        episodeNo: episode.episodeNo,
        text: result.text,
        promptLength: promptText.length
      })
      const parsedScene = parseGeneratedScene(result.text, episode.episodeNo)
      generatedScenes.push(parsedScene)
      writeEpisodeEvidenceIfEnabled(episode.episodeNo, result.text, promptText.length, parsedScene)
      board = advanceScriptGenerationState(board, {
        type: 'episode_completed',
        episodeNo: episode.episodeNo,
        reason: `已生成，使用 ${result.lane} / ${result.model}`
      })
      input.onProgress?.({
        phase: 'generate_batch',
        detail: `第${episode.episodeNo}集生成完成`,
        board
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'unknown_error')
      board = advanceScriptGenerationState(board, {
        type: 'episode_failed',
        episodeNo: episode.episodeNo,
        reason: `批次失败：${errorMessage}`
      })
      input.onProgress?.({
        phase: 'generate_batch',
        detail: `第${episode.episodeNo}集生成失败`,
        board
      })
      return {
        board,
        generatedScenes,
        rawTexts,
        failure: {
          episodeNo: episode.episodeNo,
          message: errorMessage
        }
      }
    }
  }

  return {
    board,
    generatedScenes,
    rawTexts
  }
}
