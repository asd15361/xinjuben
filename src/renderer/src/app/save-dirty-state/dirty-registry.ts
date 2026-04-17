import type { WorkflowStage } from '../../../../shared/contracts/workflow'

interface DirtyStageEntry {
  dirty: boolean
  hydratedVersion: string
}

export interface DirtyRegistry {
  markHydrated(stage: WorkflowStage): void
  markDirty(stage: WorkflowStage): void
  isDirty(stage: WorkflowStage): boolean
  clearDirty(stage: WorkflowStage): void
  getHydratedVersion(stage: WorkflowStage): string
}

const stageEntries = new Map<WorkflowStage, DirtyStageEntry>()
let hydrationCounter = 0

function nextHydratedVersion(stage: WorkflowStage): string {
  hydrationCounter += 1
  return `${stage}:${hydrationCounter}`
}

function ensureEntry(stage: WorkflowStage): DirtyStageEntry {
  const existing = stageEntries.get(stage)
  if (existing) return existing

  const created: DirtyStageEntry = {
    dirty: false,
    hydratedVersion: nextHydratedVersion(stage)
  }
  stageEntries.set(stage, created)
  return created
}

export const dirtyRegistry: DirtyRegistry = {
  markHydrated(stage) {
    stageEntries.set(stage, {
      dirty: false,
      hydratedVersion: nextHydratedVersion(stage)
    })
  },

  markDirty(stage) {
    const entry = ensureEntry(stage)
    entry.dirty = true
    stageEntries.set(stage, entry)
  },

  isDirty(stage) {
    return ensureEntry(stage).dirty
  },

  clearDirty(stage) {
    const entry = ensureEntry(stage)
    entry.dirty = false
    stageEntries.set(stage, entry)
  },

  getHydratedVersion(stage) {
    return ensureEntry(stage).hydratedVersion
  }
}

export function resetDirtyRegistry(): void {
  stageEntries.clear()
  hydrationCounter = 0
}
