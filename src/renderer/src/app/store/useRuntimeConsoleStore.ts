import { create } from 'zustand'
import type { RuntimeConsoleStateDto } from '../../../../shared/contracts/runtime-task'

interface RuntimeConsoleStoreState {
  byProjectId: Record<string, RuntimeConsoleStateDto>
  hydrateProjectState: (projectId: string, state: RuntimeConsoleStateDto) => void
  clearProjectState: (projectId: string) => void
}

export const useRuntimeConsoleStore = create<RuntimeConsoleStoreState>((set) => ({
  byProjectId: {},
  hydrateProjectState: (projectId, state) =>
    set((current) => ({
      byProjectId: {
        ...current.byProjectId,
        [projectId]: state
      }
    })),
  clearProjectState: (projectId) =>
    set((current) => {
      const next = { ...current.byProjectId }
      delete next[projectId]
      return { byProjectId: next }
    })
}))
