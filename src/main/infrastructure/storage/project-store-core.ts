import { app } from 'electron'
import { copyFile, mkdir, readFile, rename, unlink, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import type { ProjectSnapshotDto, ProjectSummaryDto } from '../../../shared/contracts/project'

export interface ProjectStoreShape {
  projects: Record<string, ProjectSnapshotDto>
}

export const DEFAULT_STORE: ProjectStoreShape = { projects: {} }

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

export function getStorePath(): string {
  const filePath = join(app.getPath('userData'), 'workspace', 'projects.json')
  if (!didLogStorePath && process.env.E2E_USER_DATA_DIR) {
    didLogStorePath = true
    // E2E visibility: helps diagnose storage isolation issues.
    // eslint-disable-next-line no-console
    console.log(`e2e_store_path:${filePath}`)
  }
  return filePath
}

export async function ensureStoreFile(): Promise<string> {
  const filePath = getStorePath()
  await mkdir(dirname(filePath), { recursive: true })
  try {
    await readFile(filePath, 'utf8')
  } catch (error) {
    const code = (error && typeof error === 'object' ? (error as { code?: string }).code : undefined) || ''
    if (code === 'ENOENT') {
      await writeFile(filePath, JSON.stringify(DEFAULT_STORE, null, 2), 'utf8')
    }
  }
  return filePath
}

export async function readStore(): Promise<ProjectStoreShape> {
  const filePath = await ensureStoreFile()
  let raw = ''
  try {
    raw = await readFile(filePath, 'utf8')
  } catch {
    raw = ''
  }
  if (!raw) return DEFAULT_STORE

  try {
    return JSON.parse(raw) as ProjectStoreShape
  } catch {
    const backupPath = filePath.replace(/\.json$/i, `.corrupt-${Date.now().toString(36)}.json`)
    try {
      await rename(filePath, backupPath)
    } catch {
      // If rename fails (e.g. file locked), fall back to overwriting.
    }
    await writeFile(filePath, JSON.stringify(DEFAULT_STORE, null, 2), 'utf8')
    return DEFAULT_STORE
  }
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

export function createProjectId(): string {
  return `project_${Date.now().toString(36)}`
}
