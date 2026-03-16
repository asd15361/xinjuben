import type { ScriptAuditIssueDto, ScriptRepairSuggestionDto } from '../../../contracts/script-audit'
import type { StoryIntentPackageDto } from '../../../contracts/intake'
import type { ScriptStateLedgerDto } from '../../../contracts/script-ledger'
import type { ScriptSegmentDto } from '../../../contracts/workflow'
import { buildRelationshipPressureSnapshot } from '../pressure/pressure-policy'
import { buildDramaProgressionSnapshot } from '../progression/progression-policy'
import { DEFAULT_RULE, REPAIR_MAPPING_RULES } from './repair-mapping-rules'

export function buildRepairSuggestion(issue: ScriptAuditIssueDto): Omit<ScriptRepairSuggestionDto, 'targetSceneNo'> {
  const matched = REPAIR_MAPPING_RULES.find((item) => item.match(issue))?.rule || DEFAULT_RULE
  const factLandingInstruction =
    issue.code.startsWith('formal_fact_') && issue.code !== 'formal_fact_not_landed'
      ? `请把这条正式事实补进具体场景：${issue.message}`
      : null
  return {
    policyKey: matched.policyKey,
    source: matched.source,
    focus: matched.focus,
    evidenceHint: matched.evidenceHint,
    instruction: factLandingInstruction || matched.buildInstruction(issue)
  }
}

export function enhanceRepairSuggestionWithProgression(input: {
  suggestion: ScriptRepairSuggestionDto
  targetScene?: ScriptSegmentDto
  storyIntent?: StoryIntentPackageDto | null
  ledger?: ScriptStateLedgerDto | null
}): ScriptRepairSuggestionDto {
  const nextSuggestion = {
    ...input.suggestion,
    focus: [...input.suggestion.focus]
  }

  if (input.targetScene) {
    const progression = buildDramaProgressionSnapshot(input.targetScene)
    if (!progression.conflictSignal && !nextSuggestion.focus.includes('冲突推进')) {
      nextSuggestion.focus.push('冲突推进')
    }
    if (!progression.emotionSignal && !nextSuggestion.focus.includes('情绪闭环')) {
      nextSuggestion.focus.push('情绪闭环')
    }
  }

  const pressure = buildRelationshipPressureSnapshot({
    storyIntent: input.storyIntent,
    ledger: input.ledger
  })

  if (!nextSuggestion.focus.includes('关系施压')) {
    nextSuggestion.focus.push('关系施压')
  }

  nextSuggestion.evidenceHint = `${input.suggestion.evidenceHint} 当前关系杠杆：${pressure.leverLine}`
  return nextSuggestion
}
