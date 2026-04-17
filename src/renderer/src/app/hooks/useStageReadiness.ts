import { useEffect, useState } from 'react'
import type { InputContractValidationDto } from '../../../../shared/contracts/input-contract'
import type { WorkflowStage } from '../../../../shared/contracts/workflow'
import { useWorkflowStore } from '../store/useWorkflowStore'
import { useStageStore } from '../../store/useStageStore'

export function useStageReadiness(
  targetStage: Exclude<WorkflowStage, 'chat' | 'seven_questions'>
): InputContractValidationDto | null {
  const storyIntent = useWorkflowStore((s) => s.storyIntent)
  const outline = useStageStore((s) => s.outline)
  const characters = useStageStore((s) => s.characters)
  const segments = useStageStore((s) => s.segments)
  const script = useStageStore((s) => s.script)
  const [state, setState] = useState<InputContractValidationDto | null>(null)

  useEffect(() => {
    let active = true

    async function validate(): Promise<void> {
      const result = await window.api.workflow.validateStageInputContract({
        targetStage,
        storyIntent,
        outline,
        characters,
        segments,
        script
      })

      if (active) {
        setState(result)
      }
    }

    void validate()

    return () => {
      active = false
    }
  }, [characters, outline, script, segments, storyIntent, targetStage])

  return state
}
