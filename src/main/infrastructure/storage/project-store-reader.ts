import { mkdir, readFile, writeFile } from 'fs/promises'
import { dirname } from 'path'

import type { ProjectSnapshotDto } from '../../../shared/contracts/project'
import { normalizeProjectSnapshot } from './project-snapshot-normalize.ts'
import {
  migrateLegacyElectronStoreIfNeeded,
  recoverCorruptProjectStoreIfNeeded
} from './project-store-migration.ts'
import { readParsedStoreWithRepair } from './project-store-read-repair.ts'
import { resolveStorageRuntime } from './storage-runtime.ts'

export interface ProjectStoreShape {
  projects: Record<string, ProjectSnapshotDto>
}

export const DEFAULT_STORE: ProjectStoreShape = { projects: {} }

export async function ensureStoreFileAtPath(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true })
  try {
    await readFile(filePath, 'utf8')
  } catch (error) {
    const code =
      (error && typeof error === 'object' ? (error as { code?: string }).code : undefined) || ''
    if (code === 'ENOENT') {
      await writeFile(filePath, JSON.stringify(DEFAULT_STORE, null, 2), 'utf8')
    }
  }
}

function normalizeStoreShape(parsed: ProjectStoreShape | null | undefined): ProjectStoreShape {
  const normalizedProjects = Object.fromEntries(
    Object.entries(parsed?.projects || {}).map(([projectId, project]) => [
      projectId,
      normalizeProjectSnapshot(project)
    ])
  )
  return {
    projects: normalizedProjects
  }
}

export async function readStoreFromPath(
  filePath: string,
  appDataPath: string
): Promise<ProjectStoreShape> {
  const allowLegacyElectronStore = resolveStorageRuntime(process.env, appDataPath).mode !== 'e2e'

  await ensureStoreFileAtPath(filePath)
  await migrateLegacyElectronStoreIfNeeded(filePath, appDataPath, {
    allowLegacyElectronStore
  })

  try {
    const { parsed } = await readParsedStoreWithRepair(filePath, {
      backupSuffix: `.corrupt-${Date.now().toString(36)}.json`,
      parse: (raw) => normalizeStoreShape(JSON.parse(raw) as ProjectStoreShape),
      readAttempts: 6,
      retryDelayMs: 50
    })
    return normalizeStoreShape(parsed)
  } catch (error) {
    const didRecover = await recoverCorruptProjectStoreIfNeeded(filePath, appDataPath, {
      allowValidStoreReplacement: true,
      allowLegacyElectronStore
    })
    if (!didRecover) {
      throw error
    }

    const { parsed } = await readParsedStoreWithRepair(filePath, {
      backupSuffix: `.corrupt-retry-${Date.now().toString(36)}.json`,
      parse: (raw) => normalizeStoreShape(JSON.parse(raw) as ProjectStoreShape),
      readAttempts: 3,
      retryDelayMs: 50
    })
    return normalizeStoreShape(parsed)
  }
}
