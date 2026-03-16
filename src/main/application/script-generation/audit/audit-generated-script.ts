import type { AuditScriptInputDto, ScriptAuditReportDto } from '../../../../shared/contracts/script-audit'
import { scoreAuditIssues } from '../../../../shared/domain/policy/audit/audit-policy'
import {
  buildStoryContract,
  buildUserAnchorLedger
} from '../../../../shared/domain/story-contract/story-contract-policy'
import { collectSceneAuditIssues } from './audit-scene-issues'
import { collectFormalFactAuditIssues } from './audit-formal-fact-issues'
import { collectCharacterAuditIssues } from './audit-character-issues'
import { collectStoryContractAuditIssues, collectUserAnchorAuditIssues } from './audit-story-contract-issues'
import { buildMergedScript } from './audit-helpers'

export function auditGeneratedScript(input: AuditScriptInputDto): ScriptAuditReportDto {
  const issues: ScriptAuditReportDto['issues'] = []
  const script = input.script
  const outline = input.outline
  const characters = input.characters || []
  const storyContract =
    outline
      ? buildStoryContract({
          storyIntent: input.storyIntent,
          outline,
          characters
        })
      : undefined
  const userAnchorLedger =
    outline
      ? buildUserAnchorLedger({
          storyIntent: input.storyIntent,
          outline,
          characters
        })
      : undefined

  if (script.length === 0) {
    issues.push(...collectSceneAuditIssues(script))
  } else {
    issues.push(...collectSceneAuditIssues(script))
  }

  const mergedScript = buildMergedScript(script)
  issues.push(...collectFormalFactAuditIssues(outline, mergedScript))
  issues.push(...collectUserAnchorAuditIssues(userAnchorLedger, characters))
  issues.push(...collectStoryContractAuditIssues(storyContract, outline, mergedScript))
  issues.push(...collectCharacterAuditIssues(characters, mergedScript))

  const score = scoreAuditIssues(issues)
  return {
    passed: issues.length === 0,
    score,
    issues,
    storyContract,
    userAnchorLedger
  }
}
