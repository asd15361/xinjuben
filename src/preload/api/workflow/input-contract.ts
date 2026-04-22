import { ipcRenderer } from 'electron'
import type { InputContractValidationDto } from '../../../shared/contracts/input-contract.ts'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow.ts'

export const workflowInputContractApi = {
  validateStageInputContract(input: {
    targetStage: 'outline' | 'character' | 'detailed_outline' | 'script'
    storyIntent?: StoryIntentPackageDto | null
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
    segments?: DetailedOutlineSegmentDto[]
    script: ScriptSegmentDto[]
  }): Promise<InputContractValidationDto> {
    return ipcRenderer.invoke('workflow:validate-stage-input-contract', input)
  }
}
