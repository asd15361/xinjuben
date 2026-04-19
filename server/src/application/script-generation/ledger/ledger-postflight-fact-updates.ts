import type { ScriptLedgerIssueDto, ScriptLedgerPostflightDto, ScriptStateLedgerDto } from '../../../shared/contracts/script-ledger'

export function collectLedgerFactPostflight(input: {
  previousLedger: ScriptStateLedgerDto
  nextLedger: ScriptStateLedgerDto
}): {
  issues: ScriptLedgerIssueDto[]
  updates: ScriptLedgerPostflightDto['patch']['updates']
} {
  const issues: ScriptLedgerIssueDto[] = []
  const updates: ScriptLedgerPostflightDto['patch']['updates'] = []

  if (
    input.previousLedger.factState.confirmedFormalFacts.length > 0 &&
    input.nextLedger.factState.confirmedFormalFacts.length === 0
  ) {
    issues.push({
      severity: 'high',
      code: 'formal_fact_regressed',
      detail: '生成后账本丢失了已确认正式事实，这是主线回退信号。'
    })
  } else if (
    input.nextLedger.factState.confirmedFormalFacts.join('|') !==
    input.previousLedger.factState.confirmedFormalFacts.join('|')
  ) {
    updates.push({
      path: 'factState.confirmedFormalFacts',
      value: input.nextLedger.factState.confirmedFormalFacts,
      evidence: '生成后正式事实落地状态发生变化。'
    })
  }

  if (
    input.nextLedger.anchorState.missingAnchorNames.length >
    input.previousLedger.anchorState.missingAnchorNames.length
  ) {
    issues.push({
      severity: 'high',
      code: 'anchor_regressed',
      detail: '生成后缺失用户锚点变多了，说明新内容在破坏角色或关系名册。'
    })
  } else if (
    input.nextLedger.anchorState.missingAnchorNames.join('|') !==
    input.previousLedger.anchorState.missingAnchorNames.join('|')
  ) {
    updates.push({
      path: 'anchorState.missingAnchorNames',
      value: input.nextLedger.anchorState.missingAnchorNames,
      evidence: '生成后缺失锚点名单发生变化。'
    })
  }

  if (input.previousLedger.anchorState.heroineCovered && !input.nextLedger.anchorState.heroineCovered) {
    issues.push({
      severity: 'medium',
      code: 'heroine_anchor_regressed',
      detail: '生成后情感锚点从已覆盖退回未覆盖，说明新批次削弱了关系主线。'
    })
  } else if (input.previousLedger.anchorState.heroineCovered !== input.nextLedger.anchorState.heroineCovered) {
    updates.push({
      path: 'anchorState.heroineCovered',
      value: input.nextLedger.anchorState.heroineCovered,
      evidence: '生成后情感锚点覆盖状态发生变化。'
    })
  }

  return { issues, updates }
}
