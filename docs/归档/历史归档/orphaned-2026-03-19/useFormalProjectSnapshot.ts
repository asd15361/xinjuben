import { useEffect, useState } from 'react'
import type { ProjectSnapshotDto } from '../../../../shared/contracts/project'
import { useWorkflowStore } from '../store/useWorkflowStore'

export function useFormalProjectSnapshot(): ProjectSnapshotDto | null {
  const projectId = useWorkflowStore((state) => state.projectId)
  const generationStatus = useWorkflowStore((state) => state.generationStatus)
  const [state, setState] = useState<ProjectSnapshotDto | null>(null)

  useEffect(() => {
    let active = true

    async function load(): Promise<void> {
      if (!projectId) {
        if (active) {
          setState(null)
        }
        return
      }

      const project = await window.api.workspace.getProject(projectId)
      if (active) {
        setState(project)
      }
    }

    void load()

    return () => {
      active = false
    }
  }, [generationStatus, projectId])

  return state
}
