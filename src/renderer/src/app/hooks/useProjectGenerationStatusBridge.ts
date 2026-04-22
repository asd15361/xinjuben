import { useEffect } from 'react'
import { useWorkflowStore } from '../store/useWorkflowStore.ts'

/**
 * Bridge hook that subscribes to main-pushed generationStatus updates.
 *
 * DESIGN RULE: generationStatus lifecycle is owned by main.
 * Main broadcasts status via IPC; renderer subscribes and updates local store only.
 * This hook ensures renderer store stays in sync with main's authoritative status.
 *
 * Only updates store if the broadcast projectId matches the current projectId.
 * Cleans up subscription on unmount.
 */
export function useProjectGenerationStatusBridge(): void {
  const projectId = useWorkflowStore((s) => s.projectId)
  const setGenerationStatus = useWorkflowStore((s) => s.setGenerationStatus)

  useEffect(() => {
    if (!projectId) return

    const unsubscribe = window.api.workspace.onGenerationStatusUpdated((payload) => {
      // Only update if this broadcast is for the current project
      if (payload.projectId === projectId) {
        setGenerationStatus(payload.generationStatus)
      }
    })

    return () => {
      unsubscribe()
    }
  }, [projectId, setGenerationStatus])
}
