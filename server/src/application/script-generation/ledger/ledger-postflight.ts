import type {
  ScriptLedgerIssueDto,
  ScriptLedgerPostflightDto,
  ScriptStateLedgerDto
} from '@shared/contracts/script-ledger'
import { collectLedgerFactPostflight } from './ledger-postflight-fact-updates'
import { collectLedgerCharacterPostflight } from './ledger-postflight-character-updates'
import { collectLedgerMomentumPostflight } from './ledger-postflight-momentum-updates'

export function buildLedgerPostflightAssertion(input: {
  previousLedger: ScriptStateLedgerDto | null
  nextLedger: ScriptStateLedgerDto
}): ScriptLedgerPostflightDto {
  const issues: ScriptLedgerIssueDto[] = []
  const updates: ScriptLedgerPostflightDto['patch']['updates'] = []

  if (!input.previousLedger) {
    return {
      issues,
      summary: '首轮账本已建立，后续批次将基于 semantic hash 判断连续性是否发生实质变化。',
      patch: {
        previousSemanticHash: null,
        nextSemanticHash: input.nextLedger.semanticHash,
        updates: [
          {
            path: 'ledger.semanticHash',
            value: input.nextLedger.semanticHash,
            evidence: '首轮生成后已建立初始账本语义指纹。'
          }
        ]
      }
    }
  }

  const stableInput = {
    previousLedger: input.previousLedger,
    nextLedger: input.nextLedger
  }

  const factPostflight = collectLedgerFactPostflight(stableInput)
  const characterPostflight = collectLedgerCharacterPostflight(stableInput)
  const momentumPostflight = collectLedgerMomentumPostflight(stableInput)

  issues.push(...factPostflight.issues, ...characterPostflight.issues, ...momentumPostflight.issues)
  updates.push(
    ...factPostflight.updates,
    ...characterPostflight.updates,
    ...momentumPostflight.updates
  )

  return {
    issues,
    summary:
      issues.length === 0
        ? '生成后账本断言通过：正式事实、用户锚点和连续性没有出现明显回退。'
        : `生成后账本断言发现问题：${issues.map((issue) => issue.detail).join('；')}`,
    patch: {
      previousSemanticHash: input.previousLedger.semanticHash,
      nextSemanticHash: input.nextLedger.semanticHash,
      updates
    }
  }
}
