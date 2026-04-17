import { ipcMain } from 'electron'
import { generateTextWithRuntimeRouter } from '../application/ai/generate-text'
import type { RuntimeProviderConfig } from '../infrastructure/runtime-env/provider-config'
import type { AiGenerateRequestDto } from '../../shared/contracts/ai'

export function registerAiHandlers(runtimeProviderConfig: RuntimeProviderConfig): void {
  ipcMain.handle('ai:get-provider-summary', () => {
    const configuredLanes = runtimeProviderConfig.lanes.deepseek && runtimeProviderConfig.deepseek.apiKey ? ['deepseek'] : []
    const activeLanes = configuredLanes
    const standbyLanes: [] = []

    return {
      configuredLanes,
      activeLanes,
      standbyLanes,
      defaultLane: activeLanes[0] ?? null,
      runtimeFetchTimeoutMs: runtimeProviderConfig.runtimeFetchTimeoutMs
    }
  })

  ipcMain.handle('ai:generate', async (_event, input: AiGenerateRequestDto) =>
    generateTextWithRuntimeRouter(input, runtimeProviderConfig)
  )
}
