import type {
  AuditScriptInputDto,
  ScriptAuditReportDto
} from '../../../../shared/contracts/script-audit.ts'
import { scoreAuditIssues } from '../../../../shared/domain/policy/audit/audit-policy.ts'
import {
  buildStoryContract,
  buildUserAnchorLedger
} from '../../../../shared/domain/story-contract/story-contract-policy.ts'
import { collectSceneAuditIssues } from './audit-scene-issues.ts'
import { collectFormalFactAuditIssues } from './audit-formal-fact-issues.ts'
import { collectCharacterAuditIssues } from './audit-character-issues.ts'
import {
  collectStoryContractAuditIssues,
  collectUserAnchorAuditIssues
} from './audit-story-contract-issues.ts'
import { buildMergedScript } from './audit-helpers.ts'

export function auditGeneratedScript(input: AuditScriptInputDto): ScriptAuditReportDto {
  const issues: ScriptAuditReportDto['issues'] = []
  const script = input.script
  const outline = input.outline
  const characters = input.characters || []
  const storyContract = outline
    ? buildStoryContract({
        storyIntent: input.storyIntent,
        outline,
        characters
      })
    : undefined
  const userAnchorLedger = outline
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
