import type { Worker } from 'node:worker_threads'

const scriptGenerationRuns = new Map<string, Worker>()

export function clearScriptGenerationRunRegistry(): void {
  scriptGenerationRuns.clear()
}

export function registerScriptGenerationWorker(projectId: string, worker: Worker): void {
  const existing = scriptGenerationRuns.get(projectId)
  if (existing) {
    void existing.terminate()
  }
  scriptGenerationRuns.set(projectId, worker)
}

export function getScriptGenerationWorker(projectId: string): Worker | null {
  return scriptGenerationRuns.get(projectId) || null
}

export function completeScriptGenerationRun(projectId: string, worker?: Worker | null): void {
  const active = scriptGenerationRuns.get(projectId)
  if (!active) return
  if (worker && active !== worker) return
  scriptGenerationRuns.delete(projectId)
}

export function stopScriptGenerationRun(projectId: string): boolean {
  const active = scriptGenerationRuns.get(projectId)
  if (!active) return false
  scriptGenerationRuns.delete(projectId)
  void active.terminate()
  return true
}
