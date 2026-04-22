import type { ScriptAuditReportDto } from '../../../../shared/contracts/script-audit.ts'
import type { OutlineDraftDto } from '../../../../shared/contracts/workflow.ts'
import { matchFormalFactLanding } from '../../../../shared/domain/formal-fact/match-formal-fact-landing.ts'
import { getConfirmedFormalFacts } from '../../../../shared/domain/formal-fact/selectors.ts'

export function collectFormalFactAuditIssues(
  outline: OutlineDraftDto | undefined,
  mergedScript: string
): ScriptAuditReportDto['issues'] {
  const issues: ScriptAuditReportDto['issues'] = []
  if (!outline) return issues

  const confirmedFacts = getConfirmedFormalFacts(outline)
  const missingFacts = confirmedFacts.filter((fact) => !matchFormalFactLanding(fact, mergedScript))

  if (confirmedFacts.length > 0 && missingFacts.length === confirmedFacts.length) {
    issues.push({
      code: 'formal_fact_not_landed',
      severity: 'high',
      message: '当前剧本还没有把已确认正式事实真正落进场景动作、对白或情绪里。'
    })
  }

  missingFacts.forEach((fact) => {
    issues.push({
      code: `formal_fact_${fact.id}_not_landed`,
      severity: 'medium',
      message: `正式事实“${fact.label}”还没有被具体落进剧本场景。`
    })
  })

  return issues
}
