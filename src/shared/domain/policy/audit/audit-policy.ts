import type { ScriptSegmentDto } from '../../../contracts/workflow'
import type { ScriptAuditReportDto } from '../../../contracts/script-audit'
import type { PolicyMetadata } from '../policy-metadata'

function hasText(value: string | undefined): boolean {
  return Boolean(value && value.trim())
}

export interface AuditPolicySnapshot {
  metadata: PolicyMetadata
  scorePenaltyBySeverity: Record<'high' | 'medium' | 'low', number>
  requiredSceneFields: Array<'action' | 'dialogue' | 'emotion'>
  summary: string
}

export interface AuditPolicyExecutionSnapshot {
  issueCount: number
  highSeverityCount: number
  mediumSeverityCount: number
  lowSeverityCount: number
  topIssue: string
  summary: string
}

export const auditPolicySnapshot: AuditPolicySnapshot = {
  metadata: {
    name: 'script_audit_policy_v1',
    version: 'v1.3',
    lineage: 'stage5-audit-closure -> stage6-story-contract-audit -> stage7-execution-snapshot -> stage7-policy-lineage',
    source: '旧项目审计经验 + 正式事实/用户锚点主链'
  },
  scorePenaltyBySeverity: {
    high: 16,
    medium: 9,
    low: 4
  },
  requiredSceneFields: ['action', 'dialogue', 'emotion'],
  summary: '先校验场景基本完整性，再校验正式事实与用户锚点是否真正落地。'
}

export function collectSceneCompletenessIssues(script: ScriptSegmentDto[]): ScriptAuditReportDto['issues'] {
  const issues: ScriptAuditReportDto['issues'] = []

  script.forEach((scene) => {
    if (!hasText(scene.action)) {
      issues.push({
        code: `scene_${scene.sceneNo}_action_missing`,
        severity: 'medium',
        message: `第 ${scene.sceneNo} 场缺少动作描写。`
      })
    }

    if (!hasText(scene.dialogue)) {
      issues.push({
        code: `scene_${scene.sceneNo}_dialogue_missing`,
        severity: 'medium',
        message: `第 ${scene.sceneNo} 场缺少对白。`
      })
    }

    if (!hasText(scene.emotion)) {
      issues.push({
        code: `scene_${scene.sceneNo}_emotion_missing`,
        severity: 'low',
        message: `第 ${scene.sceneNo} 场缺少情感推进标记。`
      })
    }
  })

  return issues
}

export function scoreAuditIssues(issues: ScriptAuditReportDto['issues']): number {
  const totalPenalty = issues.reduce((sum, issue) => sum + auditPolicySnapshot.scorePenaltyBySeverity[issue.severity], 0)
  return Math.max(0, 100 - totalPenalty)
}

export function buildAuditExecutionSnapshot(
  report: ScriptAuditReportDto | null | undefined
): AuditPolicyExecutionSnapshot {
  if (!report) {
    return {
      issueCount: 0,
      highSeverityCount: 0,
      mediumSeverityCount: 0,
      lowSeverityCount: 0,
      topIssue: '尚未生成审核报告。',
      summary: '审核策略还没有拿到当前脚本的执行快照。'
    }
  }

  const highSeverityCount = report.issues.filter((issue) => issue.severity === 'high').length
  const mediumSeverityCount = report.issues.filter((issue) => issue.severity === 'medium').length
  const lowSeverityCount = report.issues.filter((issue) => issue.severity === 'low').length

  return {
    issueCount: report.issues.length,
    highSeverityCount,
    mediumSeverityCount,
    lowSeverityCount,
    topIssue: report.issues[0]?.message || '当前无审核问题。',
    summary: report.passed
      ? `审核通过，当前得分 ${report.score}。`
      : `共有 ${report.issues.length} 条问题，其中高风险 ${highSeverityCount} 条。`
  }
}
