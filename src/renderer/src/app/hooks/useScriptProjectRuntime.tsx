import type { ReactNode } from 'react'
import { createContext, useContext, useMemo } from 'react'
import type {
  ScriptGenerationExecutionPlanDto,
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationProgressBoardDto,
  ScriptGenerationResumeResolutionDto,
  ScriptRuntimeFailureHistoryCode
} from '../../../../shared/contracts/script-generation'
import type { ProjectGenerationStatusDto } from '../../../../shared/contracts/generation'
import type { GenerationResultState } from '../../../../shared/contracts/visible-release-state'
import { buildPersistedGenerationResult } from '../utils/generation-result-truth'
import { useWorkflowStore } from '../store/useWorkflowStore'

export interface ScriptGenerationRuntimeState {
  board: ScriptGenerationProgressBoardDto | null
  resume: ScriptGenerationResumeResolutionDto | null
  failurePreview: ScriptGenerationFailureResolutionDto | null
  generationStatus: ProjectGenerationStatusDto | null
  failureHistory: ScriptRuntimeFailureHistoryCode[]
  generationResult: GenerationResultState | null
}

interface ScriptProjectRuntimeProviderProps {
  children: ReactNode
  enabled: boolean
  plan: ScriptGenerationExecutionPlanDto | null
  stageContractFingerprint: string | null
}

const ScriptProjectRuntimeContext = createContext<ScriptGenerationRuntimeState | null>(null)

function shouldReusePersistedBoard(
  board: ScriptGenerationProgressBoardDto | null | undefined,
  plan: ScriptGenerationExecutionPlanDto,
  stageContractFingerprint: string | null
): board is ScriptGenerationProgressBoardDto {
  if (!board) return false

  const expectedBatchSize = Math.min(plan.runtimeProfile.recommendedBatchSize, plan.targetEpisodes)
  return (
    board.batchContext.stageContractFingerprint === stageContractFingerprint &&
    board.batchContext.batchSize === expectedBatchSize &&
    board.episodeStatuses.length === plan.targetEpisodes &&
    board.batchContext.status !== 'paused' &&
    board.batchContext.status !== 'failed'
  )
}

export function buildScriptGenerationRuntimeState(input: {
  enabled: boolean
  plan: ScriptGenerationExecutionPlanDto | null
  stageContractFingerprint: string | null
  persistedBoard: ScriptGenerationProgressBoardDto | null
  persistedFailurePreview: ScriptGenerationFailureResolutionDto | null
  generationStatus: ProjectGenerationStatusDto | null
  failureHistory: ScriptRuntimeFailureHistoryCode[]
  visibleResult: Parameters<typeof buildPersistedGenerationResult>[0]['visibleResult']
  formalRelease: Parameters<typeof buildPersistedGenerationResult>[0]['formalRelease']
}): ScriptGenerationRuntimeState {
  if (!input.enabled) {
    return {
      board: null,
      resume: null,
      failurePreview: null,
      generationStatus: null,
      failureHistory: [],
      generationResult: null
    }
  }

  const board =
    input.plan &&
    shouldReusePersistedBoard(input.persistedBoard, input.plan, input.stageContractFingerprint)
      ? input.persistedBoard
      : null

  const resume =
    board && board.batchContext.status !== 'failed' && board.batchContext.status !== 'completed'
      ? {
          canResume: true,
          resumeEpisode: board.batchContext.resumeFromEpisode ?? board.batchContext.startEpisode,
          nextBatchStatus:
            board.batchContext.status === 'running' ? 'paused' : board.batchContext.status,
          reason: board.batchContext.reason || ''
        }
      : null

  return {
    board,
    resume,
    failurePreview: input.persistedFailurePreview,
    generationStatus: input.generationStatus,
    failureHistory: input.failureHistory,
    generationResult: buildPersistedGenerationResult({
      visibleResult: input.visibleResult,
      formalRelease: input.formalRelease
    })
  }
}

export function ScriptProjectRuntimeProvider(props: ScriptProjectRuntimeProviderProps): ReactNode {
  const persistedBoard = useWorkflowStore((state) => state.scriptProgressBoard)
  const persistedFailurePreview = useWorkflowStore((state) => state.scriptFailureResolution)
  const generationStatus = useWorkflowStore((state) => state.generationStatus)
  const failureHistory = useWorkflowStore((state) => state.scriptRuntimeFailureHistory)
  const visibleResult = useWorkflowStore((state) => state.visibleResult)
  const formalRelease = useWorkflowStore((state) => state.formalRelease)

  const value = useMemo(
    () =>
      buildScriptGenerationRuntimeState({
        enabled: props.enabled,
        plan: props.plan,
        stageContractFingerprint: props.stageContractFingerprint,
        persistedBoard,
        persistedFailurePreview,
        generationStatus,
        failureHistory,
        visibleResult,
        formalRelease
      }),
    [
      failureHistory,
      formalRelease,
      generationStatus,
      persistedBoard,
      persistedFailurePreview,
      props.enabled,
      props.plan,
      props.stageContractFingerprint,
      visibleResult
    ]
  )

  return (
    <ScriptProjectRuntimeContext.Provider value={value}>
      {props.children}
    </ScriptProjectRuntimeContext.Provider>
  )
}

export function useScriptProjectRuntime(): ScriptGenerationRuntimeState {
  const context = useContext(ScriptProjectRuntimeContext)
  if (!context) {
    throw new Error('useScriptProjectRuntime must be used within ScriptProjectRuntimeProvider')
  }

  return context
}

export function useOptionalScriptProjectRuntime(): ScriptGenerationRuntimeState | null {
  return useContext(ScriptProjectRuntimeContext)
}
