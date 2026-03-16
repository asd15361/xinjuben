import { ipcRenderer } from 'electron'
import type { InputContractValidationDto } from '../../../shared/contracts/input-contract'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type {
  CharacterStageContractDto,
  DetailedOutlineStageContractDto,
  OutlineStageContractDto,
  ScriptStageContractDto
} from '../../../shared/contracts/stage-contract'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow'

export const workflowStageContractApi = {
  buildOutlineStageContract(outline: OutlineDraftDto): Promise<OutlineStageContractDto> {
    return ipcRenderer.invoke('workflow:build-outline-stage-contract', outline)
  },
  buildCharacterStageContract(input: {
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
  }): Promise<CharacterStageContractDto> {
    return ipcRenderer.invoke('workflow:build-character-stage-contract', input)
  },
  buildDetailedOutlineStageContract(input: {
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
    segments: DetailedOutlineSegmentDto[]
  }): Promise<DetailedOutlineStageContractDto> {
    return ipcRenderer.invoke('workflow:build-detailed-outline-stage-contract', input)
  },
  buildScriptStageContract(input: {
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
    segments: DetailedOutlineSegmentDto[]
    existingScript: ScriptSegmentDto[]
  }): Promise<ScriptStageContractDto> {
    return ipcRenderer.invoke('workflow:build-script-stage-contract', input)
  },
  validateStageInputContract(input: {
    targetStage: 'outline' | 'character' | 'detailed_outline' | 'script'
    storyIntent?: StoryIntentPackageDto | null
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
    segments: DetailedOutlineSegmentDto[]
    script: ScriptSegmentDto[]
  }): Promise<InputContractValidationDto> {
    return ipcRenderer.invoke('workflow:validate-stage-input-contract', input)
  }
}
