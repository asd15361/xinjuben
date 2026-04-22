import { copyFile, mkdir, readdir } from 'fs/promises'
import { join } from 'path'

import type { ProjectSnapshotDto } from '../../../../shared/contracts/project.ts'
import { normalizeProjectSnapshot } from '../project-snapshot-normalize.ts'
import { readTextFileWithRetry } from '../project-store-fs.ts'
import { readProjectsIndex } from './read-index.ts'
import { writeProjectsIndex } from './write-index.ts'
import {
  buildShardPayloads,
  createEmptyProjectsIndex,
  getAllShardNames,
  getProjectDirectoryPath,
  toProjectsIndexEntry,
  writeShard
} from './write-shard.ts'

interface LegacyProjectStoreShape {
  projects?: Record<string, ProjectSnapshotDto>
}

async function readLegacyStore(workspaceDir: string): Promise<LegacyProjectStoreShape> {
  const storePath = join(workspaceDir, 'projects.json')
  const raw = await readTextFileWithRetry(storePath).catch(() => '')
  if (!raw.trim()) {
    return { projects: {} }
  }

  return JSON.parse(raw) as LegacyProjectStoreShape
}

async function hasProjectShardDirectory(workspaceDir: string, projectId: string): Promise<boolean> {
  const projectsRoot = join(workspaceDir, 'projects')
  const entries = await readdir(projectsRoot).catch(() => [] as string[])
  return entries.includes(projectId)
}

async function backupLegacyStore(workspaceDir: string): Promise<void> {
  const legacyStorePath = join(workspaceDir, 'projects.json')
  const backupPath = join(workspaceDir, `projects.legacy-backup-${Date.now().toString(36)}.json`)
  await copyFile(legacyStorePath, backupPath).catch(() => undefined)
}

async function writeProjectShards(
  workspaceDir: string,
  project: ProjectSnapshotDto
): Promise<void> {
  await mkdir(getProjectDirectoryPath(workspaceDir, project.id), { recursive: true })
  const payloads = buildShardPayloads(project)
  for (const shardName of getAllShardNames()) {
    await writeShard({
      workspaceDir,
      projectId: project.id,
      shardName,
      payload: payloads[shardName]
    })
  }
}

export async function migrateLegacyStoreIfNeeded(workspaceDir: string): Promise<boolean> {
  const index = await readProjectsIndex(workspaceDir)
  const legacyStore = await readLegacyStore(workspaceDir)
  const legacyProjects = Object.values(legacyStore.projects ?? {})

  if (legacyProjects.length === 0) {
    return false
  }

  const hasMissingShardProject = await Promise.all(
    legacyProjects.map((project) => hasProjectShardDirectory(workspaceDir, project.id))
  ).then((results) => results.some((exists) => !exists))

  if (Object.keys(index.projects).length > 0 && !hasMissingShardProject) {
    return false
  }

  await backupLegacyStore(workspaceDir)

  const nextIndex = createEmptyProjectsIndex()

  for (const legacyProject of legacyProjects) {
    const project = normalizeProjectSnapshot(legacyProject)
    await writeProjectShards(workspaceDir, project)
    nextIndex.projects[project.id] = toProjectsIndexEntry(project)
  }

  await writeProjectsIndex(workspaceDir, nextIndex)
  return true
}
