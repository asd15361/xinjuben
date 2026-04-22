import { ipcRenderer } from 'electron'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import type {
  ScriptGenerationExecutionPlanDto,
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationProgressBoardDto,
  ScriptGenerationResumeResolutionDto
} from '../../../shared/contracts/script-generation.ts'
import type { ScriptStateLedgerDto } from '../../../shared/contracts/script-ledger.ts'
import type { RuntimeConsoleStateDto } from '../../../shared/contracts/runtime-task.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow.ts'
import type { BuildScriptGenerationPlanInputDto } from '../../../shared/contracts/script-generation.ts'

/**
 * Script Generation IPC API - 只保留纯计算、只读能力
 *
 * startScriptGeneration 和 rewriteScriptEpisode 已迁移到 HTTP server
 * stopScriptGeneration 和 getRuntimeConsoleState 已删除（死代码）
 */
export const workflowScriptGenerationApi = {
  buildScriptGenerationPlan(input: {
    plan: BuildScriptGenerationPlanInputDto
    storyIntent?: StoryIntentPackageDto | null
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
    segments: DetailedOutlineSegmentDto[]
    script: ScriptSegmentDto[]
  }): Promise<ScriptGenerationExecutionPlanDto> {
    return ipcRenderer.invoke('workflow:build-script-generation-plan', input)
  },
  createScriptGenerationProgressBoard(input: {
    plan: ScriptGenerationExecutionPlanDto
    stageContractFingerprint: string | null
  }): Promise<ScriptGenerationProgressBoardDto> {
    return ipcRenderer.invoke('workflow:create-script-generation-progress-board', input)
  },
  resolveScriptGenerationResume(input: {
    board: ScriptGenerationProgressBoardDto
  }): Promise<ScriptGenerationResumeResolutionDto> {
    return ipcRenderer.invoke('workflow:resolve-script-generation-resume', input)
  },
  createScriptGenerationFailureResolution(input: {
    board: ScriptGenerationProgressBoardDto
    kind: ScriptGenerationFailureResolutionDto['kind']
    reason: string
    errorMessage?: string
    lockRecoveryAttempted?: boolean
  }): Promise<ScriptGenerationFailureResolutionDto> {
    return ipcRenderer.invoke('workflow:create-script-generation-failure-resolution', input)
  },
  buildScriptLedgerPreview(input: {
    storyIntent?: StoryIntentPackageDto | null
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
    script: ScriptSegmentDto[]
  }): Promise<ScriptStateLedgerDto> {
    return ipcRenderer.invoke('workflow:build-script-ledger-preview', input)
  },
  onRuntimeConsoleUpdated(
    listener: (payload: { projectId: string; state: RuntimeConsoleStateDto }) => void
  ): () => void {
    const channel = 'runtime:console-updated'
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { projectId: string; state: RuntimeConsoleStateDto }
    ): void => {
      listener(payload)
    }
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  }
}
