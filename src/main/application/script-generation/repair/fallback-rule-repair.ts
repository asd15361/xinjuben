import type { ScriptStateLedgerDto } from '../../../../shared/contracts/script-ledger'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow'

function hasText(value: string | undefined): boolean {
  return Boolean(value && value.trim())
}

export function applyFallbackRuleRepair(input: {
  targetScene: ScriptSegmentDto
  ledger: ScriptStateLedgerDto | null
  instruction?: string
  focus?: string[]
}): void {
  // 保底现在只兜结构，不再替创作补内容。
  input.targetScene.action = hasText(input.targetScene.action) ? input.targetScene.action.trim() : ''
  input.targetScene.dialogue = hasText(input.targetScene.dialogue) ? input.targetScene.dialogue.trim() : ''
  input.targetScene.emotion = hasText(input.targetScene.emotion) ? input.targetScene.emotion.trim() : ''
}
