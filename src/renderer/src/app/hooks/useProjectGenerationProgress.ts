import { useEffect, useMemo, useState } from 'react'
import type { ProjectGenerationStatusDto } from '../../../../shared/contracts/generation'

export function useProjectGenerationProgress(status: ProjectGenerationStatusDto | null) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!status) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [status])

  return useMemo(() => {
    if (!status) {
      return {
        elapsedSeconds: 0
      }
    }

    const elapsedSeconds = Math.max(0, Math.floor((now - status.startedAt) / 1000))

    return {
      elapsedSeconds
    }
  }, [now, status])
}
