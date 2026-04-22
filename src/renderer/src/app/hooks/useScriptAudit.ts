import { useEffect, useState } from 'react'
import type {
  ScriptAuditReportDto,
  ScriptRepairPlanDto
} from '../../../../shared/contracts/script-audit.ts'
import { useWorkflowStore } from '../store/useWorkflowStore.ts'
import { useStageStore } from '../../store/useStageStore.ts'

export function useScriptAudit(): {
  report: ScriptAuditReportDto | null
  repairPlan: ScriptRepairPlanDto | null
  isRefreshing: boolean
} {
  const storyIntent = useWorkflowStore((s) => s.storyIntent)
  const outline = useStageStore((s) => s.outline)
  const characters = useStageStore((s) => s.characters)
  const script = useStageStore((s) => s.script)
  const [report, setReport] = useState<ScriptAuditReportDto | null>(null)
  const [repairPlan, setRepairPlan] = useState<ScriptRepairPlanDto | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    let active = true

    async function runAudit(): Promise<void> {
      if (active) {
        setIsRefreshing(true)
        setReport(null)
        setRepairPlan(null)
      }
      const payload = {
        storyIntent,
        outline,
        characters,
        script
      }
      const nextReport = await window.api.workflow.auditScript(payload)
      const nextRepairPlan = await window.api.workflow.buildScriptRepairPlan(payload)

      if (active) {
        setReport(nextReport)
        setRepairPlan(nextRepairPlan)
        setIsRefreshing(false)
      }
    }

    void runAudit()

    return () => {
      active = false
    }
  }, [characters, outline, script, storyIntent])

  return {
    report,
    repairPlan,
    isRefreshing
  }
}
