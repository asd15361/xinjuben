import { mkdir } from 'fs/promises'

import { readParsedStoreWithRepair } from '../project-store-read-repair.ts'
import { readTextFileWithRetry } from '../project-store-fs.ts'
import {
  createEmptyProjectsIndex,
  getProjectsIndexPath,
  writeJsonAtomic,
  type ProjectsIndexShape
} from './write-shard.ts'

export async function ensureProjectsIndexFile(workspaceDir: string): Promise<string> {
  const filePath = getProjectsIndexPath(workspaceDir)
  await mkdir(workspaceDir, { recursive: true })
  try {
    await readTextFileWithRetry(filePath)
  } catch (error) {
    const code =
      (error && typeof error === 'object' ? (error as { code?: string }).code : undefined) || ''
    if (code === 'ENOENT') {
      await writeJsonAtomic(filePath, createEmptyProjectsIndex())
    } else {
      throw error
    }
  }
  return filePath
}

function normalizeIndexShape(parsed: ProjectsIndexShape | null | undefined): ProjectsIndexShape {
  return {
    version: 1,
    projects: parsed?.projects ?? {}
  }
}

export async function readProjectsIndex(workspaceDir: string): Promise<ProjectsIndexShape> {
  const filePath = await ensureProjectsIndexFile(workspaceDir)
  const { parsed } = await readParsedStoreWithRepair(filePath, {
    backupSuffix: `.corrupt-${Date.now().toString(36)}.json`,
    parse: (raw) => normalizeIndexShape(JSON.parse(raw) as ProjectsIndexShape),
    readAttempts: 6,
    retryDelayMs: 50
  })
  return normalizeIndexShape(parsed)
}
