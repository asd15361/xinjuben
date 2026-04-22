import { ipcRenderer } from 'electron'
import type {
  CharacterStageContractDto,
  DetailedOutlineStageContractDto,
  OutlineStageContractDto,
  ScriptStageContractDto
} from '../../../shared/contracts/stage-contract.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow.ts'

/**
 * Stage Contract IPC API - 只保留纯计算、只读能力
 *
 * validateStageInputContract 已迁移到 HTTP server
 */
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
  }
}
