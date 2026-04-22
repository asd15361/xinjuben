import { useEffect } from 'react'
import { useRuntimeConsoleStore } from '../store/useRuntimeConsoleStore.ts'

export function useRuntimeConsoleBridge(projectId: string | null): void {
  const hydrateProjectState = useRuntimeConsoleStore((state) => state.hydrateProjectState)
  const clearProjectState = useRuntimeConsoleStore((state) => state.clearProjectState)

  useEffect(() => {
    if (!projectId) return
    if (!window.api.workflow.onRuntimeConsoleUpdated) {
      return
    }

    let active = true

    const unsubscribe = window.api.workflow.onRuntimeConsoleUpdated((payload) => {
      if (!active || payload.projectId !== projectId) return
      hydrateProjectState(projectId, payload.state)
    })

    return () => {
      active = false
      unsubscribe()
      clearProjectState(projectId)
    }
  }, [clearProjectState, hydrateProjectState, projectId])
}
