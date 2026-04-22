import { useEffect, useState } from 'react'
import type { ScriptStateLedgerDto } from '../../../../shared/contracts/script-ledger.ts'
import { useWorkflowStore } from '../store/useWorkflowStore.ts'
import { useStageStore } from '../../store/useStageStore.ts'

export function useScriptLedgerPreview(): ScriptStateLedgerDto | null {
  const storyIntent = useWorkflowStore((s) => s.storyIntent)
  const outline = useStageStore((s) => s.outline)
  const characters = useStageStore((s) => s.characters)
  const script = useStageStore((s) => s.script)
  const [state, setState] = useState<ScriptStateLedgerDto | null>(null)

  useEffect(() => {
    let active = true

    async function load(): Promise<void> {
      if (script.length === 0) {
        if (active) setState(null)
        return
      }

      const next = await window.api.workflow.buildScriptLedgerPreview({
        storyIntent,
        outline,
        characters,
        script
      })

      if (active) {
        setState(next)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [characters, outline, script, storyIntent])

  return state
}
