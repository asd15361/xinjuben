import { ipcMain } from 'electron'
import {
  buildCharacterStageContract,
  buildDetailedOutlineStageContract,
  buildOutlineStageContract,
  buildScriptStageContract
} from '../../application/stage-contract/build-stage-contracts.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow.ts'

export function registerStageContractHandlers(): void {
  ipcMain.handle('workflow:build-outline-stage-contract', (_event, outline: OutlineDraftDto) =>
    buildOutlineStageContract(outline)
  )

  ipcMain.handle(
    'workflow:build-character-stage-contract',
    (_event, input: { outline: OutlineDraftDto; characters: CharacterDraftDto[] }) =>
      buildCharacterStageContract(input)
  )

  ipcMain.handle(
    'workflow:build-detailed-outline-stage-contract',
    (
      _event,
      input: {
        outline: OutlineDraftDto
        characters: CharacterDraftDto[]
        segments: DetailedOutlineSegmentDto[]
      }
    ) => buildDetailedOutlineStageContract(input)
  )

  ipcMain.handle(
    'workflow:build-script-stage-contract',
    (
      _event,
      input: {
        outline: OutlineDraftDto
        characters: CharacterDraftDto[]
        segments: DetailedOutlineSegmentDto[]
        existingScript: ScriptSegmentDto[]
      }
    ) => buildScriptStageContract(input)
  )
}
