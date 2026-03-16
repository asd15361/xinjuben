import { useEffect, useState } from 'react'
import type { AiProviderSummaryDto } from '../../../../shared/contracts/ai'
import type { AppInfoDto } from '../../../../shared/contracts/system'

interface RuntimeInfoState {
  appInfo: AppInfoDto | null
  providerSummary: AiProviderSummaryDto | null
}

export function useRuntimeInfo(): RuntimeInfoState {
  const [state, setState] = useState<RuntimeInfoState>({
    appInfo: null,
    providerSummary: null
  })

  useEffect(() => {
    let active = true

    async function loadRuntimeInfo(): Promise<void> {
      try {
        const [appInfo, providerSummary] = await Promise.all([
          window.api.system.getAppInfo(),
          window.api.ai.getProviderSummary()
        ])

        if (!active) return
        setState({ appInfo, providerSummary })
      } catch (error) {
        console.error('Failed to load runtime info:', error)
      }
    }

    void loadRuntimeInfo()

    return () => {
      active = false
    }
  }, [])

  return state
}
