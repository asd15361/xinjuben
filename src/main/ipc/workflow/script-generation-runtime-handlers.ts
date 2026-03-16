import { ipcMain } from 'electron'
import { markBatchStatus, createInitialProgressBoard, createFailureResolution } from '../../application/script-generation/progress-board'
import { startScriptGeneration } from '../../application/script-generation/start-script-generation'
import { buildScriptStateLedger } from '../../application/script-generation/ledger/build-script-ledger'
import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type { StartScriptGenerationInputDto } from '../../../shared/contracts/script-generation'
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow'

export function registerScriptGenerationRuntimeHandlers(runtimeProviderConfig: RuntimeProviderConfig): void {
  ipcMain.handle('workflow:start-script-generation', async (_event, input: StartScriptGenerationInputDto) => {
    const board = createInitialProgressBoard(input.plan, null)
    const startedBoard = markBatchStatus(board, 'running', '真实生成已被 gate 放行并启动。')
    try {
      return await startScriptGeneration(input, runtimeProviderConfig, startedBoard, {
        outline: input.outline,
        characters: input.characters,
        existingScript: input.existingScript
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || 'unknown_error')
      const failedBoard = markBatchStatus(startedBoard, 'failed', `生成失败：${message}`)
      return {
        success: false,
        generatedScenes: [],
        board: failedBoard,
        failure: createFailureResolution({
          board: failedBoard,
          kind: 'failed',
          reason: '生成过程中发生未捕获异常，已中断并等待续跑决策。',
          errorMessage: message
        }),
        ledger: null,
        postflight: null
      }
    }
  })

  ipcMain.handle(
    'workflow:build-script-ledger-preview',
    (
      _event,
      input: {
        storyIntent?: StoryIntentPackageDto | null
        outline: OutlineDraftDto
        characters: CharacterDraftDto[]
        script: ScriptSegmentDto[]
      }
    ) =>
      buildScriptStateLedger({
        storyIntent: input.storyIntent,
        outline: input.outline,
        characters: input.characters,
        script: input.script
      })
  )
}
