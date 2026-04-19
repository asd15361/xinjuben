export async function runRoughOutlineStageWithRetries<T>(input: {
  stage: 'rough_outline_overview' | 'rough_outline_batch'
  logContext: string
  maxAttempts?: number
  log?: (message: string) => Promise<void>
  run: (attempt: number) => Promise<T>
}): Promise<T> {
  const maxAttempts = Math.max(1, input.maxAttempts ?? 3)
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await input.run(attempt)
    } catch (error) {
      const normalizedError =
        error instanceof Error ? error : new Error(String(error || `${input.stage}_failed`))
      lastError = normalizedError

      if (attempt >= maxAttempts) {
        await input.log?.(
          `${input.stage}_retry_exhausted ${input.logContext} attempts=${attempt} error=${normalizedError.message}`
        )
        throw new Error(`${input.stage}_retry_exhausted:${normalizedError.message}`)
      }

      await input.log?.(
        `${input.stage}_retry_scheduled ${input.logContext} attempt=${attempt}/${maxAttempts} error=${normalizedError.message}`
      )
    }
  }

  throw lastError ?? new Error(`${input.stage}_retry_exhausted:unknown`)
}
