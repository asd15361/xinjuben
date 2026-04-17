import { rename } from 'fs/promises'
import { isRetriableStoreFsError, readTextFileWithRetry } from './project-store-fs.ts'

export interface ParseStoreRecoveryOptions<T> {
  backupSuffix: string
  parse: (raw: string) => T
  readAttempts?: number
  retryDelayMs?: number
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export async function readParsedStoreWithRepair<T>(
  filePath: string,
  options: ParseStoreRecoveryOptions<T>
): Promise<{ parsed: T; quarantinedPath: string | null }> {
  const readAttempts = options.readAttempts ?? 6
  const retryDelayMs = options.retryDelayMs ?? 50

  let lastRaw = ''
  let lastError: unknown = null

  for (let attempt = 0; attempt < readAttempts; attempt += 1) {
    try {
      lastRaw = await readTextFileWithRetry(filePath, {
        attempts: 2,
        retryDelayMs
      })
    } catch (error) {
      lastError = error
      if (isRetriableStoreFsError(error) && attempt < readAttempts - 1) {
        await delay(retryDelayMs * (attempt + 1))
        continue
      }
      throw error
    }
    if (!lastRaw) {
      if (attempt < readAttempts - 1) {
        await delay(retryDelayMs * (attempt + 1))
        continue
      }
      break
    }

    try {
      return {
        parsed: options.parse(lastRaw),
        quarantinedPath: null
      }
    } catch (error) {
      lastError = error
      if (attempt < readAttempts - 1) {
        await delay(retryDelayMs * (attempt + 1))
        continue
      }
    }
  }

  const backupPath = filePath.replace(/\.json$/i, options.backupSuffix)
  await rename(filePath, backupPath).catch(() => undefined)

  throw new Error(
    `[project-store] parse_failed:${filePath}:backup=${backupPath}:${lastError instanceof Error ? lastError.message : String(lastError || 'empty_after_retries')}`
  )
}
