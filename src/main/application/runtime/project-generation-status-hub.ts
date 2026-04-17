import { BrowserWindow } from 'electron'
import type { ProjectGenerationStatusDto } from '../../../shared/contracts/generation'
import { getProject, saveGenerationStatus } from '../../infrastructure/storage/project-store'
import { isPersistedGenerationStatusStale } from '../../../shared/domain/workflow/generation-state'

const GENERATION_STATUS_CHANNEL = 'workspace:generation-status-updated'

/**
 * Project-generation-status hub — main-side authority for generationStatus lifecycle.
 *
 * DESIGN RULE: generationStatus is owned exclusively by main.
 * Main writes to storage AND broadcasts to all renderer windows.
 * Renderer subscribes via onGenerationStatusUpdated and updates local store only.
 *
 * This hub is the single write point for generationStatus in the main process.
 * All generation handlers (confirm_story_intent, outline_and_characters,
 * detailed_outline, script) must use these functions instead of direct store writes.
 */

function broadcast(projectId: string, status: ProjectGenerationStatusDto | null): void {
  for (const window of BrowserWindow.getAllWindows()) {
    if (!window.isDestroyed()) {
      window.webContents.send(GENERATION_STATUS_CHANNEL, { projectId, generationStatus: status })
    }
  }
}

export function setProjectGenerationStatus(
  projectId: string,
  status: ProjectGenerationStatusDto
): void {
  // Persist to storage (authoritative write)
  void saveGenerationStatus({ projectId, generationStatus: status })
  // Broadcast to all renderer windows
  broadcast(projectId, status)
}

export function clearProjectGenerationStatus(projectId: string): void {
  // Persist null to storage
  void saveGenerationStatus({ projectId, generationStatus: null })
  // Broadcast null to all renderer windows
  broadcast(projectId, null)
}

/**
 * Internal stale-clear for read path: clears stale generationStatus in storage
 * WITHOUT broadcasting (the returned cleaned snapshot is returned directly to caller).
 * Used only by workspace:get-project to auto-clean stale entries on read.
 */
export async function clearStaleGenerationStatusOnRead(
  projectId: string
): Promise<{ projectId: string; generationStatus: null } | null> {
  const project = await getProject(projectId)
  if (!project) return null
  if (!isPersistedGenerationStatusStale(project)) return null

  await saveGenerationStatus({ projectId, generationStatus: null })
  return { projectId, generationStatus: null }
}
