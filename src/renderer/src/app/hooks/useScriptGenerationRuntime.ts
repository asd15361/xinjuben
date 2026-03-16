import { useEffect, useState } from 'react'
import type {
  ScriptGenerationExecutionPlanDto,
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationProgressBoardDto,
  ScriptGenerationResumeResolutionDto
} from '../../../../shared/contracts/script-generation'

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
    board.episodeStatuses.length === plan.targetEpisodes
  )
}

export function useScriptGenerationRuntime(input: {
  projectId: string | null
  plan: ScriptGenerationExecutionPlanDto | null
  stageContractFingerprint: string | null
}) {
  const [board, setBoard] = useState<ScriptGenerationProgressBoardDto | null>(null)
  const [resume, setResume] = useState<ScriptGenerationResumeResolutionDto | null>(null)
  const [failurePreview, setFailurePreview] = useState<ScriptGenerationFailureResolutionDto | null>(null)

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

      // Prefer persisted runtime state when available (true "resume/failure" comes from history),
      // otherwise fall back to a fresh board for preview.
      let nextBoard: ScriptGenerationProgressBoardDto
      if (input.projectId) {
        const snapshot = await window.api.workspace.getProject(input.projectId)
        if (shouldReusePersistedBoard(snapshot?.scriptProgressBoard, input.plan, input.stageContractFingerprint)) {
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
      const nextResume = await window.api.workflow.resolveScriptGenerationResume({ board: nextBoard })
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
