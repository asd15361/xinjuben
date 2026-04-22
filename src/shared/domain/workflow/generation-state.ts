import type { ProjectSnapshotDto } from '../../../shared/contracts/project.ts'
import type { ProjectGenerationStatusDto } from '../../../shared/contracts/generation.ts'

/**
 * Stale detection for persisted generationStatus.
 *
 * DESIGN RULE: generationStatus lifecycle is owned exclusively by main.
 * Renderer only displays what main pushes via IPC broadcast.
 * This shared module provides pure stale-detection logic used by both:
 *   - main (on project read, to auto-clear stale entries)
 *   - renderer bridge (on hydration, to skip stale entries)
 */
export interface PersistedGenerationStatusContainer {
  generationStatus: ProjectGenerationStatusDto | null
}

function resolveStatusAgeSeconds(status: ProjectGenerationStatusDto): number {
  return Math.max(0, Math.floor((Date.now() - status.startedAt) / 1000))
}

/**
 * Returns true when a persisted generationStatus has been running longer than
 * its estimated time × 3 (minimum 300 seconds).
 * Such entries are considered stale and should be cleared.
 */
export function isPersistedGenerationStatusStale(
  project: Pick<ProjectSnapshotDto, 'generationStatus'>
): boolean {
  const status = project.generationStatus
  if (!status) return false

  const elapsedSeconds = resolveStatusAgeSeconds(status)
  const estimatedSeconds = Math.max(0, Math.floor(status.estimatedSeconds || 0))
  const staleThresholdSeconds = Math.max(estimatedSeconds * 3, 300)

  return elapsedSeconds >= staleThresholdSeconds
}

/**
 * Returns the generationStatus to hydrate into renderer store.
 * Returns null if the persisted status is stale (should be ignored).
 */
export function getHydratableGenerationStatus(
  project: Pick<ProjectSnapshotDto, 'generationStatus'>
): ProjectGenerationStatusDto | null {
  if (isPersistedGenerationStatusStale(project)) return null
  return project.generationStatus || null
}
