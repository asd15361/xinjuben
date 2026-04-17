import { useCallback, useMemo } from 'react'
import type { ProjectGenerationStatusDto } from '../../../../shared/contracts/generation'
import { ensureOutlineEpisodeShape } from '../../../../shared/domain/workflow/outline-episodes.ts'
import { generateOutlineAndCharactersFromConfirmedSevenQuestions } from '../../features/seven-questions/api.ts'
import { useStageStore } from '../../store/useStageStore'
import { clearScriptPlanCache } from '../services/script-plan-service.ts'
import { useWorkflowStore } from '../store/useWorkflowStore'
import {
  buildOutlineCharacterGenerationFailureNotice,
  buildOutlineCharacterGenerationSuccessNotice,
  getOutlineCharacterGenerationActionLabel,
  hasOutlineCharacterStageContent,
  type OutlineCharacterVisibleStage
} from '../utils/outline-character-generation.ts'

interface OutlineCharacterGenerationActionsResult {
  actionLabel: string
  generationStatus: ProjectGenerationStatusDto | null
  handleGenerateOutlineAndCharacters: () => Promise<void>
}

export function useOutlineCharacterGeneration(
  currentStage: OutlineCharacterVisibleStage
): OutlineCharacterGenerationActionsResult {
  const projectId = useWorkflowStore((state) => state.projectId)
  const workflowGenerationStatus = useWorkflowStore((state) => state.generationStatus)
  const setGenerationNotice = useWorkflowStore((state) => state.setGenerationNotice)
  const clearGenerationNotice = useWorkflowStore((state) => state.clearGenerationNotice)
  const setStoryIntent = useWorkflowStore((state) => state.setStoryIntent)
  const outline = useStageStore((state) => state.outline)
  const characters = useStageStore((state) => state.characters)
  const hydrateProjectDrafts = useStageStore((state) => state.hydrateProjectDrafts)

  const outlineEpisodeCount = useMemo(
    () =>
      ensureOutlineEpisodeShape(outline).summaryEpisodes.filter((episode) => episode.summary.trim())
        .length,
    [outline]
  )
  const hadExistingContent = hasOutlineCharacterStageContent({
    outlineEpisodeCount,
    characterCount: characters.length
  })
  const actionLabel = getOutlineCharacterGenerationActionLabel({
    outlineEpisodeCount,
    characterCount: characters.length
  })
  const generationStatus =
    workflowGenerationStatus?.task === 'outline_and_characters' ? workflowGenerationStatus : null

  const handleGenerateOutlineAndCharacters = useCallback(async (): Promise<void> => {
    if (!projectId) return

    const requestProjectId = projectId
    const hadExistingContentSnapshot = hadExistingContent
    clearGenerationNotice()

    try {
      const result = await generateOutlineAndCharactersFromConfirmedSevenQuestions(requestProjectId)
      if (!result.outlineDraft) {
        throw new Error('rough_outline_result_missing')
      }

      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setStoryIntent(result.storyIntent)
        hydrateProjectDrafts({
          outline: result.outlineDraft,
          characters: result.characterDrafts,
          segments: [],
          script: []
        })
        clearScriptPlanCache()
        setGenerationNotice(
          buildOutlineCharacterGenerationSuccessNotice({
            currentStage,
            hadExistingContent: hadExistingContentSnapshot
          })
        )
      }
    } catch (error) {
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setGenerationNotice(
          buildOutlineCharacterGenerationFailureNotice({
            currentStage,
            hadExistingContent: hadExistingContentSnapshot,
            error
          })
        )
      }
      throw error
    }
  }, [
    clearGenerationNotice,
    currentStage,
    hadExistingContent,
    hydrateProjectDrafts,
    projectId,
    setGenerationNotice,
    setStoryIntent
  ])

  return {
    actionLabel,
    generationStatus,
    handleGenerateOutlineAndCharacters
  }
}
