import { useCallback } from 'react'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { useStageStore } from '../../../store/useStageStore'
import { ensureOutlineEpisodeShape } from '../../../../../shared/domain/workflow/outline-episodes'

const DETAILED_OUTLINE_ESTIMATED_SECONDS = 90

export function useDetailedOutlineStageActions() {
  const projectId = useWorkflowStore((state) => state.projectId)
  const generationStatus = useWorkflowStore((state) => state.generationStatus)
  const setGenerationStatus = useWorkflowStore((state) => state.setGenerationStatus)
  const storyIntent = useWorkflowStore((state) => state.storyIntent)
  const outline = useStageStore((state) => state.outline)
  const characters = useStageStore((state) => state.characters)
  const replaceSegments = useStageStore((state) => state.replaceSegments)

  const handleGenerateDetailedOutline = useCallback(async (): Promise<void> => {
    if (!projectId) return

    const requestProjectId = projectId
    const normalizedOutline = ensureOutlineEpisodeShape(outline)
    const nextGenerationStatus = {
      task: 'detailed_outline',
      stage: 'detailed_outline',
      title: '正在生成详细大纲',
      detail: '我在根据粗纲和人物，把四个大阶段排成能直接往下写的推进图。',
      startedAt: Date.now(),
      estimatedSeconds: DETAILED_OUTLINE_ESTIMATED_SECONDS,
      scope: 'project',
      autoChain: true,
      nextTask: 'script'
    } as const
    setGenerationStatus(nextGenerationStatus)
    void window.api.workspace.saveGenerationStatus({ projectId: requestProjectId, generationStatus: nextGenerationStatus })

    try {
      const result = await window.api.workspace.generateDetailedOutline({
        projectId: requestProjectId,
        outline: normalizedOutline,
        characters,
        storyIntent
      })
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        replaceSegments(result.detailedOutlineSegments)
      }
    } finally {
      await window.api.workspace.saveGenerationStatus({ projectId: requestProjectId, generationStatus: null })
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setGenerationStatus(null)
      }
    }
  }, [characters, outline, projectId, replaceSegments, setGenerationStatus, storyIntent])

  return {
    generationStatus,
    handleGenerateDetailedOutline
  }
}
