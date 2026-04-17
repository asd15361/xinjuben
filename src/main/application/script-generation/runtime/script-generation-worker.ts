import type { MessagePort } from 'node:worker_threads'
import { startScriptGeneration } from '../start-script-generation'
import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import type {
  ScriptGenerationProgressBoardDto,
  StartScriptGenerationInputDto,
  StartScriptGenerationResultDto
} from '../../../../shared/contracts/script-generation'
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../../shared/contracts/workflow'

export interface ScriptGenerationWorkerData {
  kind: 'script_generation'
  input: StartScriptGenerationInputDto
  runtimeConfig: RuntimeProviderConfig
  initialBoard: ScriptGenerationProgressBoardDto
  context: {
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
    existingScript: ScriptSegmentDto[]
  }
}

export type ScriptGenerationWorkerMessage =
  | {
      type: 'progress'
      payload: {
        phase: 'generate_batch' | 'repair_batch' | 'postflight' | 'completed' | 'failed'
        detail: string
        board: ScriptGenerationProgressBoardDto
      }
    }
  | {
      type: 'result'
      payload: StartScriptGenerationResultDto
    }
  | {
      type: 'error'
      payload: string
    }

export function isScriptGenerationWorkerData(value: unknown): value is ScriptGenerationWorkerData {
  if (!value || typeof value !== 'object') return false
  return (value as { kind?: unknown }).kind === 'script_generation'
}

export async function runScriptGenerationWorker(
  payload: ScriptGenerationWorkerData,
  port: MessagePort | null
): Promise<void> {
  try {
    const result = await startScriptGeneration(
      payload.input,
      payload.runtimeConfig,
      payload.initialBoard,
      payload.context,
      {
        onProgress(progress) {
          port?.postMessage({
            type: 'progress',
            payload: progress
          } satisfies ScriptGenerationWorkerMessage)
        }
      }
    )
    port?.postMessage({
      type: 'result',
      payload: result
    } satisfies ScriptGenerationWorkerMessage)
  } catch (error) {
    port?.postMessage({
      type: 'error',
      payload: error instanceof Error ? error.message : String(error || 'unknown_error')
    } satisfies ScriptGenerationWorkerMessage)
  }
}
