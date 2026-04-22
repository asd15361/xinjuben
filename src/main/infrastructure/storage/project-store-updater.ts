import type { ProjectSnapshotDto } from '../../../shared/contracts/project.ts'
import { readStore, withStoreLock, writeStore } from './project-store-core.ts'
import { mirrorProjectSnapshot } from './project-store-shard-sync.ts'

export async function updateProject(
  projectId: string,
  updater: (existing: ProjectSnapshotDto) => ProjectSnapshotDto
): Promise<ProjectSnapshotDto | null> {
  return withStoreLock(async () => {
    const store = await readStore()
    const existing = store.projects[projectId]
    if (!existing) return null

    const next = updater(existing)
    store.projects[projectId] = next
    await writeStore(store)
    await mirrorProjectSnapshot(next)
    return next
  })
}
