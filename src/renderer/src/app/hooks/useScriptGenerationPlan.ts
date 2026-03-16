import { useEffect, useState } from 'react'
import type { BuildScriptGenerationPlanInputDto, ScriptGenerationExecutionPlanDto } from '../../../../shared/contracts/script-generation'
import { useWorkflowStore } from '../store/useWorkflowStore'
import { useStageStore } from '../../store/useStageStore'

export function useScriptGenerationPlan(planInput: BuildScriptGenerationPlanInputDto): ScriptGenerationExecutionPlanDto | null {
  const storyIntent = useWorkflowStore((s) => s.storyIntent)
  const scriptRuntimeFailureHistory = useWorkflowStore((s) => s.scriptRuntimeFailureHistory)
  const outline = useStageStore((s) => s.outline)
  const characters = useStageStore((s) => s.characters)
  const segments = useStageStore((s) => s.segments)
  const script = useStageStore((s) => s.script)
  const [state, setState] = useState<ScriptGenerationExecutionPlanDto | null>(null)

  useEffect(() => {
    let active = true

    async function buildPlan(): Promise<void> {
      const next = await window.api.workflow.buildScriptGenerationPlan({
        plan: {
          ...planInput,
          runtimeFailureHistory: scriptRuntimeFailureHistory
        },
        storyIntent,
        outline,
        characters,
        segments,
        script
      })

      if (active) {
        setState(next)
      }
    }

    void buildPlan()

    return () => {
      active = false
    }
  }, [characters, outline, planInput, script, scriptRuntimeFailureHistory, segments, storyIntent])

  return state
}
