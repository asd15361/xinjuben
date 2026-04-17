import { readProjectsIndex } from './read-index.ts'
import {
  getProjectsIndexPath,
  type ProjectsIndexEntry,
  type ProjectsIndexShape,
  writeJsonAtomic
} from './write-shard.ts'

export async function writeProjectsIndex(
  workspaceDir: string,
  index: ProjectsIndexShape
): Promise<void> {
  await writeJsonAtomic(getProjectsIndexPath(workspaceDir), {
    version: 1,
    projects: index.projects
  })
}

export async function upsertProjectsIndexEntry(
  workspaceDir: string,
  entry: ProjectsIndexEntry
): Promise<ProjectsIndexShape> {
  const index = await readProjectsIndex(workspaceDir)
  index.projects[entry.id] = entry
  await writeProjectsIndex(workspaceDir, index)
  return index
}

export async function removeProjectsIndexEntry(
  workspaceDir: string,
  projectId: string
): Promise<boolean> {
  const index = await readProjectsIndex(workspaceDir)
  if (!index.projects[projectId]) {
    return false
  }
  delete index.projects[projectId]
  await writeProjectsIndex(workspaceDir, index)
  return true
}
