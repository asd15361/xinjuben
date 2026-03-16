import type { ExecuteScriptRepairInputDto } from '../../../../shared/contracts/script-audit'
import type { ScriptStateLedgerDto } from '../../../../shared/contracts/script-ledger'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow'
import { buildScriptStateLedger } from '../ledger/build-script-ledger'

export function buildRepairLedger(
  input: ExecuteScriptRepairInputDto,
  script: ScriptSegmentDto[]
): ScriptStateLedgerDto | null {
  if (!input.outline || !input.characters) return null

  return buildScriptStateLedger({
    storyIntent: input.storyIntent,
    outline: input.outline,
    characters: input.characters,
    script
  })
}
