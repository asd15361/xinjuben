import { ipcRenderer } from 'electron'
import type { ValidationResultDto } from '../../../shared/contracts/system.ts'
import type {
  EvaluateFormalFactElevationInputDto,
  EvaluateFormalFactElevationResultDto
} from '../../../shared/contracts/workspace.ts'

/**
 * Formal Fact IPC API - 只保留纯计算、只读校验能力
 *
 * declare/confirm/remove 已迁移到 HTTP server
 */
export const workflowFormalFactApi = {
  validateFormalFact(input: {
    factDesc: string
    mainPlotContext: string
    theme: string
  }): Promise<ValidationResultDto> {
    return ipcRenderer.invoke('workflow:validate-formal-fact', input)
  },
  evaluateFormalFactElevation(
    input: EvaluateFormalFactElevationInputDto
  ): Promise<EvaluateFormalFactElevationResultDto> {
    return ipcRenderer.invoke('workflow:evaluate-formal-fact-elevation', input)
  }
}
