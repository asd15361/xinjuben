import { app } from 'electron'
import { copyFile, rename, unlink, writeFile } from 'fs/promises'
import { join } from 'path'
import type { ProjectSnapshotDto, ProjectSummaryDto } from '../../../shared/contracts/project.ts'
import {
  ensureStoreFileAtPath,
  readStoreFromPath,
  type ProjectStoreShape
} from './project-store-reader.ts'
import { resolveStorageRuntime } from './storage-runtime.ts'

let storeOpChain: Promise<unknown> = Promise.resolve()
let didLogStorePath = false

export async function withStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const next = storeOpChain.then(fn, fn)
  storeOpChain = next.then(
    () => undefined,
    () => undefined
  )
  return next
}

export function createProjectId(): string {
  return `project_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export function getStorePath(): string {
  const filePath = join(app.getPath('userData'), 'workspace', 'projects.json')
  if (
    !didLogStorePath &&
    resolveStorageRuntime(process.env, app.getPath('appData')).mode === 'e2e'
  ) {
    didLogStorePath = true
    // E2E visibility: helps diagnose storage isolation issues.

    console.log(`e2e_store_path:${filePath}`)
  }
  return filePath
}

export async function ensureStoreFile(): Promise<string> {
  const filePath = getStorePath()
  await ensureStoreFileAtPath(filePath)
  return filePath
}

export async function readStore(): Promise<ProjectStoreShape> {
  const filePath = getStorePath()
  return readStoreFromPath(filePath, app.getPath('appData'))
}

export async function writeStore(store: ProjectStoreShape): Promise<void> {
  const filePath = await ensureStoreFile()
  const payload = JSON.stringify(store, null, 2)
  const tmpPath = filePath.replace(/\.json$/i, `.tmp-${Date.now().toString(36)}.json`)
  await writeFile(tmpPath, payload, 'utf8')

  let lastError: unknown = null
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await rename(tmpPath, filePath)
      return
    } catch (error) {
      lastError = error
      await new Promise((r) => setTimeout(r, 50 * (attempt + 1)))
    }
  }

  try {
    await copyFile(tmpPath, filePath)
  } finally {
    try {
      await unlink(tmpPath)
    } catch {
      // ignore
    }
  }

  if (lastError) {
    // Do not throw: copy fallback succeeded and the store is now consistent.
  }
}

export function toSummary(project: ProjectSnapshotDto): ProjectSummaryDto {
  const { storyIntent: _storyIntent, ...summary } = project
  return summary
}
