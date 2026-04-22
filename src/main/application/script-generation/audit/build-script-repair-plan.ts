import type {
  AuditScriptInputDto,
  ScriptRepairPlanDto
} from '../../../../shared/contracts/script-audit.ts'
import {
  buildRepairSuggestion,
  enhanceRepairSuggestionWithProgression
} from '../../../../shared/domain/policy/repair/repair-mapping.ts'
import { auditGeneratedScript } from './audit-generated-script.ts'

function resolveRepairTargetSceneNo(input: AuditScriptInputDto, issueCode: string): number | null {
  const sceneMatch = issueCode.match(/scene_(\d+)_/)
  if (sceneMatch) return Number(sceneMatch[1])

  if (
    issueCode.startsWith('formal_fact_') ||
    issueCode === 'formal_fact_not_landed' ||
    issueCode === 'memory_echo_missing' ||
    issueCode === 'hard_anchor_pending'
  ) {
    return input.script.at(-1)?.sceneNo ?? null
  }

  return null
}

export function buildScriptRepairPlan(input: AuditScriptInputDto): ScriptRepairPlanDto {
  const report = auditGeneratedScript(input)
  if (report.passed) {
    return {
      shouldRepair: false,
      suggestions: []
    }
  }

  return {
    shouldRepair: true,
    suggestions: report.issues.slice(0, 5).map((issue) => {
      const sceneNo = resolveRepairTargetSceneNo(input, issue.code)
      const suggestion = {
        targetSceneNo: sceneNo,
        ...buildRepairSuggestion(issue)
      }
      const targetScene = sceneNo
        ? input.script.find((scene) => scene.sceneNo === sceneNo)
        : undefined
      return enhanceRepairSuggestionWithProgression({
        suggestion,
        targetScene,
        storyIntent: input.storyIntent,
        ledger: null
      })
    })
  }
}
