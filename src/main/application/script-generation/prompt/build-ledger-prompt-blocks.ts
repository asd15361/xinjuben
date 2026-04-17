import type { ScriptStateLedgerDto } from '../../../../shared/contracts/script-ledger'

export function buildLedgerAssertionBlock(ledger: ScriptStateLedgerDto): string {
  return ['【Ledger Preflight】', `- ${ledger.preflight.assertionBlock}`].join('\n')
}

export function buildKnowledgeBoundaryBlock(ledger: ScriptStateLedgerDto): string {
  const publicFacts = ledger.knowledgeBoundaries.publicFacts.slice(0, 3).join('；') || '当前待补'
  const hiddenFacts = ledger.knowledgeBoundaries.hiddenFacts.slice(0, 3).join('；') || '当前无额外隐藏事实'
  const forbiddenRules = ledger.knowledgeBoundaries.forbiddenOmniscienceRules.map((rule) => `- ${rule}`).join('\n')

  return [
    '【Knowledge Boundary】',
    `- 当前主视角：${ledger.knowledgeBoundaries.perspectiveCharacter || '未锁定'}`,
    `- 当前公开事实：${publicFacts}`,
    `- 当前隐藏事实：${hiddenFacts}`,
    forbiddenRules
  ].join('\n')
}

export function buildMomentumBridgeBlock(ledger: ScriptStateLedgerDto): string {
  return [
    '【Bridge And Momentum】',
    `- 上一场钩子：${ledger.storyMomentum.previousCliffhanger || '待补'}`,
    `- 下一步必须承接：${ledger.storyMomentum.nextRequiredBridge || '待补'}`,
    `- 当前主冲突线：${ledger.storyMomentum.activeConflictLine || '待补'}`,
    `- 当前待兑现代价：${ledger.storyMomentum.pendingCost || '待补'}`,
    `- 记忆回声：${ledger.storyMomentum.memoryEchoes.join('；') || '当前待补'}`,
    `- 待承接硬锚点：${ledger.storyMomentum.hardAnchors.join('；') || '当前无额外硬锚点'}`
  ].join('\n')
}

function buildCharacterContinuityLockLines(ledger: ScriptStateLedgerDto): string[] {
  const blockedCharacters = ledger.characters.filter(
    (character) =>
      !character.continuityStatus.canActDirectly &&
      (character.continuityStatus.custodyStatus === 'captured' ||
        character.continuityStatus.custodyStatus === 'restricted')
  )
  const prolongedInjury = ledger.characters.filter(
    (character) => character.continuityStatus.injuryEpisodeStreak >= 2
  )

  const lines: string[] = []
  for (const character of blockedCharacters.slice(0, 3)) {
    lines.push(
      `- ${character.name} 当前状态=${character.continuityStatus.custodyStatus}，最近证据=${character.continuityStatus.statusEvidence}。没有越狱/放出/换押送/解除限制的明确情节前，不准让他下一集直接带队堵门、调兵或亲自冲杀。`
    )
  }
  for (const character of prolongedInjury.slice(0, 2)) {
    lines.push(
      `- ${character.name} 已连续 ${character.continuityStatus.injuryEpisodeStreak} 集维持重伤/中毒，最近证据=${character.continuityStatus.statusEvidence}。下一集必须触发治疗、解毒、代价转移或阶段恢复，禁止继续重复吐血、跪地、脸色惨白。`
    )
  }

  return lines
}

function buildTacticBanLines(ledger: ScriptStateLedgerDto): string[] {
  const usedTactics = ledger.usedTactics || []
  const paperEvidenceCount = usedTactics.filter((item) => item === 'paper_evidence').length
  const fantasyVisualCount = usedTactics.filter((item) => item === 'fantasy_visual').length

  const lines: string[] = []
  if (paperEvidenceCount >= 2) {
    lines.push(
      `- 已多次使用纸质证据翻盘（当前计数=${paperEvidenceCount}）。接下来一批禁止再靠账本、密信、血契、契据、残页、卷轴直接拍脸收账，必须换成法阵、妖兽、血脉、灵力、法器或实物争夺。`
    )
  }
  if (fantasyVisualCount === 0) {
    lines.push(
      '- 当前修仙爽点偏弱。下一集必须补至少一种可视化修仙手段：妖兽异动、法阵反噬、血脉爆发、灵力碾压、法器换手、禁制触发。'
    )
  }

  return lines
}

export function buildLedgerConstraintBlock(ledger: ScriptStateLedgerDto): string {
  const lines = [
    ...buildCharacterContinuityLockLines(ledger),
    ...buildTacticBanLines(ledger)
  ]

  if (lines.length === 0) {
    return ''
  }

  return ['【Ledger State Locks】', ...lines].join('\n')
}
