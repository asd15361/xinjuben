import { useCallback } from 'react'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { useStageStore } from '../../../store/useStageStore'
import { ensureOutlineEpisodeShape } from '../../../../../shared/domain/workflow/outline-episodes'

const DETAILED_OUTLINE_ESTIMATED_SECONDS = 90

export function useDetailedOutlineStageActions() {
  const projectId = useWorkflowStore((state) => state.projectId)
  const generationStatus = useWorkflowStore((state) => state.generationStatus)
  const setGenerationStatus = useWorkflowStore((state) => state.setGenerationStatus)
  const setGenerationNotice = useWorkflowStore((state) => state.setGenerationNotice)
  const clearGenerationNotice = useWorkflowStore((state) => state.clearGenerationNotice)
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
      detail: '我在根据粗纲和人物，把这一版详细大纲补齐成真正能往下写的推进图。',
      startedAt: Date.now(),
      estimatedSeconds: DETAILED_OUTLINE_ESTIMATED_SECONDS,
      scope: 'project'
    } as const
    clearGenerationNotice()
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
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setGenerationNotice({
          kind: 'success',
          title: '详细大纲已经补好了',
          detail: '你现在可以直接检查这一版详细大纲；如果顺了，再往下生成剧本。',
          primaryAction: { label: '继续看详细大纲', stage: 'detailed_outline' },
          secondaryAction: { label: '去剧本', stage: 'script' }
        })
      }
    } catch (error) {
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setGenerationNotice({
          kind: 'error',
          title: '详细大纲这次没有补成功',
          detail: '先别急着进剧本，先回看粗纲或人物，把关键信息补清楚后再生成。'
        })
      }
      throw error
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
