import { ipcMain } from 'electron'
import { generateTextWithRuntimeRouter } from '../application/ai/generate-text'
import type { RuntimeProviderConfig } from '../infrastructure/runtime-env/provider-config'
import type { AiGenerateRequestDto } from '../../shared/contracts/ai'

export function registerAiHandlers(runtimeProviderConfig: RuntimeProviderConfig): void {
  ipcMain.handle('ai:get-provider-summary', () => {
    const configuredLanes = [
      runtimeProviderConfig.lanes.deepseek && runtimeProviderConfig.deepseek.apiKey ? 'deepseek' : null,
      runtimeProviderConfig.lanes.geminiFlash && runtimeProviderConfig.geminiFlash.apiKey ? 'gemini_flash' : null,
      runtimeProviderConfig.lanes.geminiPro && runtimeProviderConfig.geminiPro.apiKey ? 'gemini_pro' : null
    ].filter(Boolean)
    const activeLanes = configuredLanes.filter((lane) => lane === 'deepseek')
    const standbyLanes = configuredLanes.filter((lane) => lane !== 'deepseek')

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
