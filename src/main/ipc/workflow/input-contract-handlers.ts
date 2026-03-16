import { ipcMain } from 'electron'
import { validateStageInputContract } from '../../application/input-contract/validate-stage-input'
import { validateFormalFactDefinition } from '../../../shared/domain/formal-fact/definition-engine'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow'

export function registerInputContractHandlers(): void {
  ipcMain.handle(
    'workflow:validate-stage-input-contract',
    (
      _event,
      input: {
        targetStage: 'outline' | 'character' | 'detailed_outline' | 'script'
        storyIntent?: StoryIntentPackageDto | null
        outline: OutlineDraftDto
        characters: CharacterDraftDto[]
        segments: DetailedOutlineSegmentDto[]
        script: ScriptSegmentDto[]
      }
    ) => validateStageInputContract(input.targetStage, input)
  )

  ipcMain.handle(
    'workflow:validate-formal-fact',
    (_event, input: { factDesc: string; mainPlotContext: string; theme: string }) =>
      validateFormalFactDefinition(input.factDesc, input.mainPlotContext, input.theme)
  )
}
