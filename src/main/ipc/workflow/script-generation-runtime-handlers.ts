import { ipcMain } from 'electron'
import { buildScriptStateLedger } from '../../application/script-generation/ledger/build-script-ledger.ts'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import type { ScriptStateLedgerDto } from '../../../shared/contracts/script-ledger.ts'
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow.ts'

/**
 * Script Generation IPC handlers - Runtime
 *
 * 只保留纯计算、只读能力。
 * startScriptGeneration 和 rewriteScriptEpisode 已迁移到 HTTP server。
 */
export function registerScriptGenerationRuntimeHandlers(): void {
  ipcMain.handle(
    'workflow:build-script-ledger-preview',
    (
      _event,
      input: {
        storyIntent?: StoryIntentPackageDto | null
        outline: OutlineDraftDto
        characters: CharacterDraftDto[]
        script: ScriptSegmentDto[]
      }
    ): ScriptStateLedgerDto =>
      buildScriptStateLedger({
        storyIntent: input.storyIntent,
        outline: input.outline,
        characters: input.characters,
        script: input.script
      })
  )
}