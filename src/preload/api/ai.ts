import { ipcRenderer } from 'electron'
import type {
  AiGenerateRequestDto,
  AiGenerateResponseDto,
  AiProviderSummaryDto
} from '../../shared/contracts/ai.ts'

export const aiApi = {
  getProviderSummary(): Promise<AiProviderSummaryDto> {
    return ipcRenderer.invoke('ai:get-provider-summary')
  },
  generate(input: AiGenerateRequestDto): Promise<AiGenerateResponseDto> {
    return ipcRenderer.invoke('ai:generate', input)
  }
}
