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
