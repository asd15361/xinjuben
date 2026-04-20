import type {
  ScriptLedgerIssueDto,
  ScriptLedgerPostflightDto,
  ScriptStateLedgerDto
} from '@shared/contracts/script-ledger'
import { getLedgerHashFromState } from './ledger-semantic-hash'

export function collectLedgerMomentumPostflight(input: {
  previousLedger: ScriptStateLedgerDto
  nextLedger: ScriptStateLedgerDto
}): {
  issues: ScriptLedgerIssueDto[]
  updates: ScriptLedgerPostflightDto['patch']['updates']
} {
  const issues: ScriptLedgerIssueDto[] = []
  const updates: ScriptLedgerPostflightDto['patch']['updates'] = []

  if (getLedgerHashFromState(input.previousLedger) === getLedgerHashFromState(input.nextLedger)) {
    issues.push({
      severity: 'low',
      code: 'semantic_hash_unchanged',
      detail: '这次生成没有造成账本语义变化，可能推进力度偏弱。'
    })
  } else {
    updates.push({
      path: 'ledger.semanticHash',
      value: input.nextLedger.semanticHash,
      evidence: '生成后账本语义指纹发生变化，说明连续性状态有实质推进。'
    })
  }

  if (
    input.previousLedger.storyMomentum.memoryEchoes.length > 0 &&
    input.nextLedger.storyMomentum.memoryEchoes.length === 0
  ) {
    issues.push({
      severity: 'low',
      code: 'memory_echo_regressed',
      detail: '生成后记忆回声被写没了，跨批次连续性可能断掉。'
    })
  } else if (
    input.previousLedger.storyMomentum.memoryEchoes.join('|') !==
    input.nextLedger.storyMomentum.memoryEchoes.join('|')
  ) {
    updates.push({
      path: 'storyMomentum.memoryEchoes',
      value: input.nextLedger.storyMomentum.memoryEchoes,
      evidence: '生成后记忆回声状态发生变化。'
    })
  }

  if (
    input.previousLedger.storyMomentum.hardAnchors.join('|') !==
    input.nextLedger.storyMomentum.hardAnchors.join('|')
  ) {
    updates.push({
      path: 'storyMomentum.hardAnchors',
      value: input.nextLedger.storyMomentum.hardAnchors,
      evidence: '生成后待承接硬锚点名单发生变化。'
    })
  }

  const previousHookAnchors = input.previousLedger.openHooks
    .flatMap((hook) => hook.anchorRefs)
    .sort()
    .join('|')
  const nextHookAnchors = input.nextLedger.openHooks
    .flatMap((hook) => hook.anchorRefs)
    .sort()
    .join('|')
  const previousHookMap = new Map(
    input.previousLedger.openHooks.map((hook) => [
      hook.id,
      hook.anchorRefs.slice().sort().join('|')
    ])
  )
  const nextHookMap = new Map(
    input.nextLedger.openHooks.map((hook) => [hook.id, hook.anchorRefs.slice().sort().join('|')])
  )
  const sharedHookIds = [...previousHookMap.keys()].filter((id) => nextHookMap.has(id))
  const hasSharedHookAnchorShift =
    sharedHookIds.length > 0 &&
    sharedHookIds.some((id) => previousHookMap.get(id) !== nextHookMap.get(id))

  if (
    input.previousLedger.openHooks.length > 0 &&
    input.nextLedger.openHooks.length > 0 &&
    previousHookAnchors !== nextHookAnchors &&
    hasSharedHookAnchorShift
  ) {
    issues.push({
      severity: 'low',
      code: 'entity_anchor_shift',
      detail: '生成后开放钩子的实体接口发生漂移，后续要核对角色/道具锚点是否还承接得住。'
    })
  }

  return { issues, updates }
}
