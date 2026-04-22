import { useEffect, useState } from 'react'
import type { InputContractValidationDto } from '../../../../shared/contracts/input-contract.ts'
import type { WorkflowStage } from '../../../../shared/contracts/workflow.ts'
import { useWorkflowStore } from '../store/useWorkflowStore.ts'
import { useStageStore } from '../../store/useStageStore.ts'
import { apiValidateStageContract } from '../../services/api-client.ts'

export function useStageReadiness(
  targetStage: Exclude<WorkflowStage, 'chat' | 'seven_questions'>
): InputContractValidationDto | null {
  const projectId = useWorkflowStore((s) => s.projectId)
  const storyIntent = useWorkflowStore((s) => s.storyIntent)
  const outline = useStageStore((s) => s.outline)
  const characters = useStageStore((s) => s.characters)
  const segments = useStageStore((s) => s.segments)
  const script = useStageStore((s) => s.script)
  const [state, setState] = useState<InputContractValidationDto | null>(null)

  useEffect(() => {
    let active = true

    async function validate(): Promise<void> {
      if (!projectId) {
        setState(null)
        return
      }

      const result = await apiValidateStageContract({
        projectId,
        targetStage
      })

      if (active) {
        setState(result)
      }
    }

    void validate()

    return () => {
      active = false
    }
  }, [characters, outline, projectId, script, segments, storyIntent, targetStage])

  return state
}
