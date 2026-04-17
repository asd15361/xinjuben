import { ipcRenderer } from 'electron'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type {
  BuildScriptGenerationPlanInputDto,
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationExecutionPlanDto,
  ScriptGenerationProgressBoardDto,
  ScriptGenerationResumeResolutionDto,
  RewriteScriptEpisodeInputDto,
  RewriteScriptEpisodeResultDto,
  StartScriptGenerationInputDto,
  StartScriptGenerationResultDto
} from '../../../shared/contracts/script-generation'
import type { ScriptStateLedgerDto } from '../../../shared/contracts/script-ledger'
import type { RuntimeConsoleStateDto } from '../../../shared/contracts/runtime-task'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow'

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
  startScriptGeneration(
    input: StartScriptGenerationInputDto
  ): Promise<StartScriptGenerationResultDto> {
    return ipcRenderer.invoke('workflow:start-script-generation', input)
  },
  rewriteScriptEpisode(
    input: RewriteScriptEpisodeInputDto
  ): Promise<RewriteScriptEpisodeResultDto> {
    return ipcRenderer.invoke('workflow:rewrite-script-episode', input)
  },
  buildScriptLedgerPreview(input: {
    storyIntent?: StoryIntentPackageDto | null
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
    script: ScriptSegmentDto[]
  }): Promise<ScriptStateLedgerDto> {
    return ipcRenderer.invoke('workflow:build-script-ledger-preview', input)
  },
  stopScriptGeneration(input: { projectId: string }): Promise<boolean> {
    return ipcRenderer.invoke('workflow:stop-script-generation', input)
  },
  getRuntimeConsoleState(projectId: string): Promise<RuntimeConsoleStateDto> {
    return ipcRenderer.invoke('workflow:get-runtime-console-state', { projectId })
  },
  onRuntimeConsoleUpdated(
    listener: (payload: { projectId: string; state: RuntimeConsoleStateDto }) => void
  ): () => void {
    const channel = 'runtime:console-updated'
    const handler = (
      _event: Electron.IpcRendererEvent,
      payload: { projectId: string; state: RuntimeConsoleStateDto }
    ) => {
      listener(payload)
    }
    ipcRenderer.on(channel, handler)
    return () => {
      ipcRenderer.removeListener(channel, handler)
    }
  }
}
