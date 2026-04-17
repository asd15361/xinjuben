import { dirname, join } from 'path'
import { copyFile, readFile, readdir, rename, stat, writeFile } from 'fs/promises'

let didLogLegacyMigration = false
let didLogCorruptRecovery = false

interface LegacyStoreOptions {
  allowLegacyElectronStore?: boolean
}

interface StoreSnapshotMeta {
  count: number
  valid: boolean
  raw: string
  mtimeMs: number
}

function shouldPreferRicherBackup(
  currentMeta: StoreSnapshotMeta,
  candidateMeta: StoreSnapshotMeta
): boolean {
  if (!candidateMeta.valid || candidateMeta.count <= currentMeta.count) return false
  if (candidateMeta.mtimeMs >= currentMeta.mtimeMs) return true

  const currentRawLength = currentMeta.raw.trim().length
  const candidateRawLength = candidateMeta.raw.trim().length
  const countGain = candidateMeta.count - currentMeta.count

  return (
    currentMeta.count >= 2 &&
    currentMeta.count <= 3 &&
    (candidateMeta.count >= currentMeta.count * 2 ||
      (countGain >= 2 && candidateRawLength > Math.max(1200, currentRawLength * 2)))
  )
}

function countProjectsFromStoreRaw(raw: string): number {
  if (!raw.trim()) return 0
  try {
    const parsed = JSON.parse(raw) as { projects?: Record<string, unknown> }
    return Object.keys(parsed.projects || {}).length
  } catch {
    return 0
  }
}

async function readStoreMeta(filePath: string): Promise<StoreSnapshotMeta> {
  const [raw, stats] = await Promise.all([
    readFile(filePath, 'utf8').catch(() => ''),
    stat(filePath).catch(() => null)
  ])
  return {
    count: countProjectsFromStoreRaw(raw),
    valid: raw.trim()
      ? countProjectsFromStoreRaw(raw) >= 0 &&
        (() => {
          try {
            JSON.parse(raw)
            return true
          } catch {
            return false
          }
        })()
      : true,
    raw,
    mtimeMs: stats?.mtimeMs ?? 0
  }
}

function getLegacyElectronStorePath(
  currentStorePath: string,
  appDataPath: string,
  options?: LegacyStoreOptions
): string | null {
  if (options?.allowLegacyElectronStore === false) return null
  const currentUserDataPath = dirname(dirname(currentStorePath))
  const electronUserDataPath = join(appDataPath, 'Electron')
  if (currentUserDataPath === electronUserDataPath) return null
  return join(electronUserDataPath, 'workspace', 'projects.json')
}

async function listCorruptBackupPaths(currentStorePath: string): Promise<string[]> {
  const workspaceDir = dirname(currentStorePath)
  const entries = await readdir(workspaceDir).catch(() => [])
  return entries
    .filter((entry) => /^projects\.corrupt-.*\.json$/i.test(entry))
    .map((entry) => join(workspaceDir, entry))
}

async function createAutoBackup(currentStorePath: string): Promise<void> {
  const currentRaw = await readFile(currentStorePath, 'utf8').catch(() => '')
  if (!currentRaw.trim()) return
  const autoBackupPath = currentStorePath.replace(
    /\.json$/i,
    `.autobackup-${Date.now().toString(36)}.json`
  )
  await copyFile(currentStorePath, autoBackupPath).catch(() => undefined)
}

export async function migrateLegacyElectronStoreIfNeeded(
  currentStorePath: string,
  appDataPath: string,
  options?: LegacyStoreOptions
): Promise<boolean> {
  const legacyStorePath = getLegacyElectronStorePath(currentStorePath, appDataPath, options)
  if (!legacyStorePath) return false

  const currentRaw = await readFile(currentStorePath, 'utf8').catch(() => '')
  if (countProjectsFromStoreRaw(currentRaw) > 0) return false

  const legacyRaw = await readFile(legacyStorePath, 'utf8').catch(() => '')
  const legacyProjectCount = countProjectsFromStoreRaw(legacyRaw)
  if (legacyProjectCount === 0) return false

  await writeFile(currentStorePath, legacyRaw, 'utf8')
  if (!didLogLegacyMigration) {
    didLogLegacyMigration = true
    console.log(
      `[project-store] migrated_legacy_electron_store:${legacyStorePath}->${currentStorePath}:projects=${legacyProjectCount}`
    )
  }
  return true
}

export async function recoverCorruptProjectStoreIfNeeded(
  currentStorePath: string,
  appDataPath: string,
  options?: {
    allowValidStoreReplacement?: boolean
    allowLegacyElectronStore?: boolean
  }
): Promise<boolean> {
  const currentMeta = await readStoreMeta(currentStorePath)
  const legacyStorePath = getLegacyElectronStorePath(currentStorePath, appDataPath, options)

  if (currentMeta.valid && !options?.allowValidStoreReplacement) {
    return false
  }

  const corruptPaths = await listCorruptBackupPaths(currentStorePath)

  if (!currentMeta.valid) {
    const invalidBackupPath = currentStorePath.replace(
      /\.json$/i,
      `.corrupt-${Date.now().toString(36)}.json`
    )
    await rename(currentStorePath, invalidBackupPath).catch(() => undefined)
  }

  const corruptCandidates = await Promise.all(
    corruptPaths.map(async (filePath) => ({
      filePath,
      ...(await readStoreMeta(filePath))
    }))
  )
  const validCorruptCandidates = corruptCandidates
    .filter((candidate) => candidate.valid && candidate.count > 0)
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count
      return b.mtimeMs - a.mtimeMs
    })

  const bestCorruptCandidate = validCorruptCandidates[0] ?? null
  const legacyMeta = legacyStorePath ? await readStoreMeta(legacyStorePath) : null

  let recoverySourcePath: string | null = null
  let recoverySourceCount = 0

  if (!currentMeta.valid) {
    if (bestCorruptCandidate) {
      recoverySourcePath = bestCorruptCandidate.filePath
      recoverySourceCount = bestCorruptCandidate.count
    } else if (legacyMeta?.valid && legacyMeta.count > 0 && legacyStorePath) {
      recoverySourcePath = legacyStorePath
      recoverySourceCount = legacyMeta.count
    }
  } else if (bestCorruptCandidate && shouldPreferRicherBackup(currentMeta, bestCorruptCandidate)) {
    recoverySourcePath = bestCorruptCandidate.filePath
    recoverySourceCount = bestCorruptCandidate.count
  }

  if (!recoverySourcePath) return false

  await createAutoBackup(currentStorePath)
  const recoveryRaw = await readFile(recoverySourcePath, 'utf8')
  await writeFile(currentStorePath, recoveryRaw, 'utf8')
  if (!didLogCorruptRecovery) {
    didLogCorruptRecovery = true
    console.warn(
      `[project-store] restored_from_backup:${recoverySourcePath}->${currentStorePath}:projects=${recoverySourceCount}`
    )
  }
  return true
}
