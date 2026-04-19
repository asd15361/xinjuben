import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { createFailureResolution } from './progress-board'
import { advanceScriptGenerationState } from './state-machine'
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../shared/contracts/workflow'
import { buildCharacterFingerprint } from '../../shared/domain/workflow/character-fingerprint'
import type {
  ScriptGenerationProgressBoardDto,
  StartScriptGenerationInputDto,
  StartScriptGenerationResultDto
} from '../../shared/contracts/script-generation'
import { finalizeScriptPostflight } from './runtime/finalize-script-postflight'
import { detectDuplicateScenes } from './runtime/detect-duplicate-scenes'
import { runScriptGenerationBatch } from './runtime/run-script-generation-batch'

type ScriptBatchRunner = typeof runScriptGenerationBatch

interface ScriptGenerationStaleWarning {
  type: 'characters_fingerprint_changed'
  baselineFingerprint: string
  latestFingerprint: string
  detail: string
}

function buildCharactersFingerprintStaleError(
  warning: ScriptGenerationStaleWarning
): Error {
  return new Error(
    `stale_warning:${warning.type}:${warning.baselineFingerprint}:${warning.latestFingerprint}`
  )
}

async function ensureCharacterSnapshotFresh(input: {
  baselineFingerprint: string
  resolveLatestCharactersFingerprint?: () => Promise<string | null>
  onStaleWarning?: (warning: ScriptGenerationStaleWarning) => void | Promise<void>
}): Promise<void> {
  if (!input.resolveLatestCharactersFingerprint) return

  const latestFingerprint = await input.resolveLatestCharactersFingerprint()
  if (!latestFingerprint || latestFingerprint === input.baselineFingerprint) return

  const warning: ScriptGenerationStaleWarning = {
    type: 'characters_fingerprint_changed',
    baselineFingerprint: input.baselineFingerprint,
    latestFingerprint,
    detail: '人物小传已经变化，当前剧本生成快照已过时，必须先停下再重开。'
  }

  console.warn(
    `[script-generation] Stale Warning: characters fingerprint changed baseline=${warning.baselineFingerprint} latest=${warning.latestFingerprint}`
  )
  await input.onStaleWarning?.(warning)
  throw buildCharactersFingerprintStaleError(warning)
}

function buildCurrentPostflight(input: {
  generationInput: StartScriptGenerationInputDto
  context: {
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
    existingScript: ScriptSegmentDto[]
  }
  generatedScenes: ScriptSegmentDto[]
}): Pick<StartScriptGenerationResultDto, 'ledger' | 'postflight'> {
  if (input.generatedScenes.length === 0) {
    return {
      ledger: null,
      postflight: null
    }
  }

  return finalizeScriptPostflight({
    generationInput: input.generationInput,
    outline: input.context.outline,
    characters: input.context.characters,
    existingScript: input.context.existingScript,
    generatedScenes: input.generatedScenes
  })
}

export async function startScriptGeneration(
  input: StartScriptGenerationInputDto,
  runtimeConfig: RuntimeProviderConfig,
  initialBoard: ScriptGenerationProgressBoardDto,
  context: {
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
    existingScript: ScriptSegmentDto[]
  },
  options?: {
    onProgress?: (payload: {
      phase: 'generate_batch' | 'repair_batch' | 'postflight' | 'completed' | 'failed'
      detail: string
      board: ScriptGenerationProgressBoardDto
    }) => void
    batchRunner?: ScriptBatchRunner
    resolveLatestCharactersFingerprint?: () => Promise<string | null>
    onStaleWarning?: (warning: ScriptGenerationStaleWarning) => void | Promise<void>
    waitForRepairBatch?: boolean
  }
): Promise<StartScriptGenerationResultDto> {
  let board = advanceScriptGenerationState(initialBoard, {
    type: 'batch_started',
    reason: '真实生成已启动。'
  })
  let generatedScenes: ScriptSegmentDto[] = []
  const batchRunner = options?.batchRunner ?? runScriptGenerationBatch
  const baselineCharactersFingerprint = buildCharacterFingerprint(context.characters)

  try {
    while (board.episodeStatuses.some((episode) => episode.status === 'pending')) {
      await ensureCharacterSnapshotFresh({
        baselineFingerprint: baselineCharactersFingerprint,
        resolveLatestCharactersFingerprint: options?.resolveLatestCharactersFingerprint,
        onStaleWarning: options?.onStaleWarning
      })

      const currentExistingScript = [...context.existingScript, ...generatedScenes]
      const batchResult = await batchRunner({
        generationInput: {
          ...input,
          existingScript: currentExistingScript
        },
        runtimeConfig,
        board,
        outline: context.outline,
        characters: context.characters,
        existingScript: currentExistingScript,
        beforeEpisode: async () => {
          await ensureCharacterSnapshotFresh({
            baselineFingerprint: baselineCharactersFingerprint,
            resolveLatestCharactersFingerprint: options?.resolveLatestCharactersFingerprint,
            onStaleWarning: options?.onStaleWarning
          })
        },
        onProgress: options?.onProgress,
        enableImmediateRepair: false
      })
      board = batchResult.board

      const duplicateReason = detectDuplicateScenes(
        currentExistingScript,
        batchResult.generatedScenes
      )
      if (duplicateReason) {
        throw new Error(`duplicate_scene_detected:${duplicateReason}`)
      }

      generatedScenes.push(...batchResult.generatedScenes)
      if (batchResult.failure) {
        const { ledger, postflight } = buildCurrentPostflight({
          generationInput: input,
          context,
          generatedScenes
        })
        return {
          success: false,
          generatedScenes,
          board,
          failure: createFailureResolution({
            board,
            kind: 'failed',
            reason:
              generatedScenes.length > 0
                ? '真实生成中途失败，已保留当前已经写出的内容。'
                : '真实生成过程中发生失败。',
            errorMessage: batchResult.failure.message,
            lockRecoveryAttempted: false
          }),
          ledger,
          postflight
        }
      }

      if (
        batchResult.generatedScenes.length === 0 &&
        board.episodeStatuses.some((episode) => episode.status === 'pending')
      ) {
        throw new Error('script_generation_batch_stalled:no_episode_output')
      }

      const nextPendingEpisode = board.episodeStatuses.find(
        (episode) => episode.status === 'pending'
      )
      if (nextPendingEpisode) {
        board = advanceScriptGenerationState(board, {
          type: 'batch_started',
          reason: `上一批完成，继续自动推进第 ${nextPendingEpisode.episodeNo} 集。`
        })
      }
    }

    board = advanceScriptGenerationState(board, {
      type: 'batch_completed',
      reason: `本轮自动生成完成，共新增 ${generatedScenes.length} 集。`
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
      board.episodeStatuses.some(
        (status) => status.episodeNo === episode.episodeNo && status.status === 'running'
      )
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
    const { ledger, postflight } = buildCurrentPostflight({
      generationInput: input,
      context,
      generatedScenes
    })
    return {
      success: false,
      generatedScenes,
      board,
      failure: createFailureResolution({
        board,
        kind: 'failed',
        reason: '真实生成过程中发生失败。',
        errorMessage,
        lockRecoveryAttempted: false
      }),
      ledger,
      postflight
    }
  }
}