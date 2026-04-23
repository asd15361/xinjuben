import { useEffect, useState } from 'react'
import type {
  ScriptGenerationExecutionPlanDto,
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationProgressBoardDto,
  ScriptGenerationResumeResolutionDto
} from '../../../../shared/contracts/script-generation.ts'
import { apiGetProject } from '../../services/api-client.ts'
import { useAuthStore } from '../store/useAuthStore.ts'

function shouldReusePersistedBoard(
  board: ScriptGenerationProgressBoardDto | null | undefined,
  plan: ScriptGenerationExecutionPlanDto,
  stageContractFingerprint: string | null
): board is ScriptGenerationProgressBoardDto {
  if (!board) return false

  // CRITICAL: Only reuse board if status is recoverable (running/paused)
  // Never reuse failed or completed boards — they must be discarded
  if (board.batchContext.status !== 'running' && board.batchContext.status !== 'paused') {
    return false
  }

  const expectedBatchSize = Math.min(plan.runtimeProfile.recommendedBatchSize, plan.targetEpisodes)
  return (
    board.batchContext.stageContractFingerprint === stageContractFingerprint &&
    board.batchContext.batchSize === expectedBatchSize &&
    board.episodeStatuses.length === plan.targetEpisodes
  )
}

export function useScriptGenerationRuntime(input: {
  projectId: string | null
  plan: ScriptGenerationExecutionPlanDto | null
  stageContractFingerprint: string | null
}): {
  board: ScriptGenerationProgressBoardDto | null
  resume: ScriptGenerationResumeResolutionDto | null
  failurePreview: ScriptGenerationFailureResolutionDto | null
} {
  const [board, setBoard] = useState<ScriptGenerationProgressBoardDto | null>(null)
  const [resume, setResume] = useState<ScriptGenerationResumeResolutionDto | null>(null)
  const [failurePreview, setFailurePreview] = useState<ScriptGenerationFailureResolutionDto | null>(
    null
  )

  useEffect(() => {
    let active = true

    async function syncRuntime(): Promise<void> {
      if (!input.plan) {
        if (active) {
          setBoard(null)
          setResume(null)
          setFailurePreview(null)
        }
        return
      }

      // Prefer persisted runtime state from local content store (truth source),
      // fall back to PB for backward compatibility, then fresh board.
      let nextBoard: ScriptGenerationProgressBoardDto
      let localBoard: ScriptGenerationProgressBoardDto | null = null

      if (input.projectId) {
        const userId = useAuthStore.getState().user?.id
        if (userId) {
          try {
            const localContent = await window.api.workspace.readLocalContent(
              userId,
              input.projectId
            )
            localBoard = localContent?.scriptProgressBoard ?? null
          } catch {
            // ignore local read failure
          }
        }
      }

      if (
        localBoard &&
        shouldReusePersistedBoard(localBoard, input.plan, input.stageContractFingerprint)
      ) {
        nextBoard = localBoard
      } else if (input.projectId) {
        const result = await apiGetProject(input.projectId)
        const snapshot = result.project
        if (
          shouldReusePersistedBoard(
            snapshot?.scriptProgressBoard,
            input.plan,
            input.stageContractFingerprint
          )
        ) {
          nextBoard = snapshot.scriptProgressBoard
        } else {
          nextBoard = await window.api.workflow.createScriptGenerationProgressBoard({
            plan: input.plan,
            stageContractFingerprint: input.stageContractFingerprint
          })
        }
      } else {
        nextBoard = await window.api.workflow.createScriptGenerationProgressBoard({
          plan: input.plan,
          stageContractFingerprint: input.stageContractFingerprint
        })
      }
      const nextResume = await window.api.workflow.resolveScriptGenerationResume({
        board: nextBoard
      })
      const nextFailurePreview = await window.api.workflow.createScriptGenerationFailureResolution({
        board: nextBoard,
        kind: input.plan.ready ? 'retry' : 'failed',
        reason: input.plan.ready
          ? `若运行中断，将优先尝试自动恢复；当前档位 ${input.plan.runtimeProfile.profileLabel}。`
          : '当前输入合同未通过，真实生成会直接失败。',
        lockRecoveryAttempted: false
      })

      if (active) {
        setBoard(nextBoard)
        setResume(nextResume)
        setFailurePreview(nextFailurePreview)
      }
    }

    void syncRuntime()

    return () => {
      active = false
    }
  }, [input.plan, input.stageContractFingerprint, input.projectId])

  return {
    board,
    resume,
    failurePreview
  }
}
