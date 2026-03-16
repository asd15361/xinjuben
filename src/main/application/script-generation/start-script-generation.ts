import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { createFailureResolution } from './progress-board'
import { advanceScriptGenerationState } from './state-machine'
import type { CharacterDraftDto, OutlineDraftDto, ScriptSegmentDto } from '../../../shared/contracts/workflow'
import type {
  ScriptGenerationProgressBoardDto,
  StartScriptGenerationInputDto,
  StartScriptGenerationResultDto
} from '../../../shared/contracts/script-generation'
import { finalizeScriptPostflight } from './runtime/finalize-script-postflight'
import { detectDuplicateScenes } from './runtime/detect-duplicate-scenes'
import { runScriptGenerationBatch } from './runtime/run-script-generation-batch'

export async function startScriptGeneration(
  input: StartScriptGenerationInputDto,
  runtimeConfig: RuntimeProviderConfig,
  initialBoard: ScriptGenerationProgressBoardDto,
  context: {
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
    existingScript: ScriptSegmentDto[]
  }
): Promise<StartScriptGenerationResultDto> {
  if (!input.plan.ready) {
    return {
      success: false,
      generatedScenes: [],
      board: initialBoard,
      failure: createFailureResolution({
        board: initialBoard,
        kind: 'failed',
        reason: '输入合同未通过，禁止启动真实生成。'
      }),
      ledger: null,
      postflight: null
    }
  }

  let board = advanceScriptGenerationState(initialBoard, {
    type: 'batch_started',
    reason: '真实生成已启动。'
  })

  try {
    const batchResult = await runScriptGenerationBatch({
      generationInput: input,
      runtimeConfig,
      board,
      outline: context.outline,
      characters: context.characters,
      existingScript: context.existingScript
    })
    board = batchResult.board
    const generatedScenes = batchResult.generatedScenes
    const duplicateReason = detectDuplicateScenes(context.existingScript, generatedScenes)
    if (duplicateReason) {
      throw new Error(`duplicate_scene_detected:${duplicateReason}`)
    }

    board = advanceScriptGenerationState(board, {
      type: 'batch_completed',
      reason: '第一批次生成完成。'
    })
    const { ledger, postflight } = finalizeScriptPostflight({
      generationInput: input,
      outline: context.outline,
      characters: context.characters,
      existingScript: context.existingScript,
      generatedScenes
    })
    return {
      success: true,
      generatedScenes,
      board,
      failure: null,
      ledger,
      postflight
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error || 'unknown_error')
    const currentEpisode = input.plan.episodePlans.find((episode) =>
      board.episodeStatuses.some((status) => status.episodeNo === episode.episodeNo && status.status === 'running')
    )
    board = currentEpisode
      ? advanceScriptGenerationState(board, {
          type: 'episode_failed',
          episodeNo: currentEpisode.episodeNo,
          reason: `批次失败：${errorMessage}`
        })
      : advanceScriptGenerationState(board, {
          type: 'batch_failed',
          reason: `批次失败：${errorMessage}`
        })
    return {
      success: false,
      generatedScenes: [],
      board,
      failure: createFailureResolution({
        board,
        kind: 'failed',
        reason: '真实生成过程中发生失败。',
        errorMessage,
        lockRecoveryAttempted: false
      }),
      ledger: null,
      postflight: null
    }
  }
}
