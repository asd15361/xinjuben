import { readFile } from 'fs/promises'

function getErrorCode(error: unknown): string {
  return (error && typeof error === 'object' ? (error as { code?: string }).code : undefined) || ''
}

export function isRetriableStoreFsError(error: unknown): boolean {
  const code = getErrorCode(error)
  return code === 'EBUSY' || code === 'EPERM' || code === 'EMFILE'
}

async function delay(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms))
}

export async function readTextFileWithRetry(
  filePath: string,
  options?: {
    attempts?: number
    retryDelayMs?: number
  }
): Promise<string> {
  const attempts = options?.attempts ?? 6
  const retryDelayMs = options?.retryDelayMs ?? 40

  let lastError: unknown = null
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await readFile(filePath, 'utf8')
    } catch (error) {
      lastError = error
      if (!isRetriableStoreFsError(error) || attempt === attempts - 1) {
        throw error
      }
      await delay(retryDelayMs * (attempt + 1))
    }
  }

  throw lastError instanceof Error ? lastError : new Error('read_text_file_failed')
}
