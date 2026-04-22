import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { ProjectGenerationStatusDto } from '../../../../shared/contracts/generation.ts'

interface ProjectProgress {
  elapsedSeconds: number
  estimatedSeconds: number
  progressPercent: number
}

export function useProjectGenerationProgress(
  status: ProjectGenerationStatusDto | null
): ProjectProgress {
  const [elapsedMs, setElapsedMs] = useState(() => (status ? Date.now() - status.startedAt : 0))
  const statusRef = useRef(status)

  const syncRef = useCallback(() => {
    statusRef.current = status
  }, [status])

  useEffect(() => {
    syncRef()
  }, [syncRef])

  useEffect(() => {
    if (!status) {
      return
    }

    const timer = window.setInterval(() => {
      const current = statusRef.current
      if (current) {
        setElapsedMs(Date.now() - current.startedAt)
      }
    }, 1000)
    return () => window.clearInterval(timer)
  }, [status])

  return useMemo(() => {
    if (!status) {
      return {
        elapsedSeconds: 0,
        estimatedSeconds: 0,
        progressPercent: 0
      }
    }

    const elapsedSeconds = Math.max(0, Math.floor(elapsedMs / 1000))
    const estimatedSeconds = Math.max(1, Math.floor(status.estimatedSeconds || 0))
    const progressPercent = Math.min(
      99,
      Math.max(0, Math.floor((elapsedSeconds / estimatedSeconds) * 100))
    )

    return {
      elapsedSeconds,
      estimatedSeconds,
      progressPercent
    }
  }, [elapsedMs, status])
}
