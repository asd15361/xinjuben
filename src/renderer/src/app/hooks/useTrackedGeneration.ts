import { useCallback } from 'react'
import type { ProjectGenerationTaskDto } from '../../../../shared/contracts/generation.ts'
import type { WorkflowStage } from '../../../../shared/contracts/workflow.ts'
import { useWorkflowStore } from '../store/useWorkflowStore.ts'
import {
  getEstimatedSeconds,
  recordGenerationDuration
} from '../services/generation-timing-service.ts'

function resolveStageFromTask(task: ProjectGenerationTaskDto): WorkflowStage {
  switch (task) {
    case 'confirm_story_intent':
      return 'chat'
    case 'seven_questions':
      return 'seven_questions'
    case 'factions':
      return 'character'
    case 'characters':
      return 'character'
    case 'rough_outline':
      return 'outline'
    case 'outline_and_characters':
      return 'outline'
    case 'detailed_outline':
      return 'detailed_outline'
    case 'script':
      return 'script'
  }
}

interface TrackedGenerationOptions {
  task: ProjectGenerationTaskDto
  title: string
  detail: string
  fallbackSeconds: number
  scope?: 'project'
}

export function useTrackedGeneration(): {
  track: <T>(options: TrackedGenerationOptions, generator: () => Promise<T>) => Promise<T>
} {
  const setGenerationStatus = useWorkflowStore((s) => s.setGenerationStatus)

  const track = useCallback(
    async <T>(options: TrackedGenerationOptions, generator: () => Promise<T>): Promise<T> => {
      const estimatedSeconds = getEstimatedSeconds(options.task, options.fallbackSeconds)
      const startedAt = Date.now()

      const stage = resolveStageFromTask(options.task)

      setGenerationStatus({
        task: options.task,
        stage,
        title: options.title,
        detail: options.detail,
        startedAt,
        estimatedSeconds,
        scope: options.scope
      })

      try {
        const result = await generator()
        const durationMs = Date.now() - startedAt
        recordGenerationDuration(options.task, durationMs)
        return result
      } finally {
        setGenerationStatus(null)
      }
    },
    [setGenerationStatus]
  )

  return { track }
}
