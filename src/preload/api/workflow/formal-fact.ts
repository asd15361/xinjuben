import { ipcRenderer } from 'electron'
import type { ValidationResultDto } from '../../../shared/contracts/system'
import type {
  ConfirmFormalFactForProjectInputDto,
  ConfirmFormalFactForProjectResultDto,
  DeclareFormalFactForProjectInputDto,
  DeclareFormalFactForProjectResultDto,
  EvaluateFormalFactElevationInputDto,
  EvaluateFormalFactElevationResultDto,
  RemoveFormalFactForProjectInputDto,
  RemoveFormalFactForProjectResultDto,
  ValidateFormalFactInputDto,
  ValidateFormalFactResultDto
} from '../../../shared/contracts/workspace'

export const workflowFormalFactApi = {
  validateFormalFact(input: {
    factDesc: string
    mainPlotContext: string
    theme: string
  }): Promise<ValidationResultDto> {
    return ipcRenderer.invoke('workflow:validate-formal-fact', input)
  },
  declareFormalFact(input: DeclareFormalFactForProjectInputDto): Promise<DeclareFormalFactForProjectResultDto> {
    return ipcRenderer.invoke('workflow:declare-formal-fact', input)
  },
  confirmFormalFact(input: ConfirmFormalFactForProjectInputDto): Promise<ConfirmFormalFactForProjectResultDto> {
    return ipcRenderer.invoke('workflow:confirm-formal-fact', input)
  },
  removeFormalFact(input: RemoveFormalFactForProjectInputDto): Promise<RemoveFormalFactForProjectResultDto> {
    return ipcRenderer.invoke('workflow:remove-formal-fact', input)
  },
  validateFormalFactDefinition(input: ValidateFormalFactInputDto): Promise<ValidateFormalFactResultDto> {
    return ipcRenderer.invoke('workflow:validate-formal-fact-definition', input)
  },
  evaluateFormalFactElevation(input: EvaluateFormalFactElevationInputDto): Promise<EvaluateFormalFactElevationResultDto> {
    return ipcRenderer.invoke('workflow:evaluate-formal-fact-elevation', input)
  }
}
