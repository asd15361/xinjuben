import { Worker } from 'node:worker_threads'
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
import type {
  ScriptGenerationWorkerData,
  ScriptGenerationWorkerMessage
} from './script-generation-worker'

export function runScriptGenerationInWorker(input: {
  generationInput: StartScriptGenerationInputDto
  runtimeConfig: RuntimeProviderConfig
  initialBoard: ScriptGenerationProgressBoardDto
  context: {
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
    existingScript: ScriptSegmentDto[]
  }
  onProgress?: (payload: Extract<ScriptGenerationWorkerMessage, { type: 'progress' }>['payload']) => void
}): { worker: Worker; result: Promise<StartScriptGenerationResultDto> } {
  const worker = new Worker(new URL('./index.js', import.meta.url), {
    workerData: {
      kind: 'script_generation',
      input: input.generationInput,
      runtimeConfig: input.runtimeConfig,
      initialBoard: input.initialBoard,
      context: input.context
    } satisfies ScriptGenerationWorkerData
  })

  const result = new Promise<StartScriptGenerationResultDto>((resolve, reject) => {
    worker.on('message', (message: ScriptGenerationWorkerMessage) => {
      if (message.type === 'progress') {
        input.onProgress?.(message.payload)
        return
      }
      if (message.type === 'result') {
        resolve(message.payload)
        return
      }
      reject(new Error(message.payload))
    })
    worker.on('error', reject)
    worker.on('exit', (code) => {
      if (code !== 0) {
        reject(new Error(`script_generation_worker_exit:${code}`))
      }
    })
  })

  return { worker, result }
}
