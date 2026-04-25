import { useCallback, useMemo, useState } from 'react'
import type { ProjectGenerationStatusDto } from '../../../../shared/contracts/generation.ts'
import { ensureOutlineEpisodeShape } from '../../../../shared/domain/workflow/outline-episodes.ts'
import { generateOutlineAndCharactersFromConfirmedSevenQuestions } from '../../features/seven-questions/api.ts'
import { apiGetProject } from '../../services/api-client.ts'
import { useAuthStore } from '../store/useAuthStore.ts'
import { useStageStore } from '../../store/useStageStore.ts'
import { clearScriptPlanCache } from '../services/script-plan-service.ts'
import { useTrackedGeneration } from './useTrackedGeneration.ts'
import { resolveOutlineBundleEstimatedSeconds } from '../utils/stage-estimates.ts'
import { useWorkflowStore } from '../store/useWorkflowStore.ts'
import {
  buildOutlineCharacterGenerationFailureNotice,
  buildOutlineCharacterPartialSuccessNotice,
  buildOutlineCharacterGenerationSuccessNotice,
  getOutlineCharacterGenerationActionLabel,
  hasOutlineCharacterStageContent,
  type OutlineCharacterVisibleStage
} from '../utils/outline-character-generation.ts'

interface OutlineCharacterGenerationActionsResult {
  actionLabel: string
  generationStatus: ProjectGenerationStatusDto | null
  generationBusy: boolean
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
  const setProjectEntityStore = useWorkflowStore((state) => state.setProjectEntityStore)
  const outline = useStageStore((state) => state.outline)
  const characters = useStageStore((state) => state.characters)
  const hydrateProjectDrafts = useStageStore((state) => state.hydrateProjectDrafts)
  const refreshCredits = useAuthStore((state) => state.refreshCredits)
  const trackedGeneration = useTrackedGeneration()

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
  const [generationKickoffPending, setGenerationKickoffPending] = useState(false)

  const handleGenerateOutlineAndCharacters = useCallback(async (): Promise<void> => {
    if (!projectId || generationKickoffPending || generationStatus) return

    const requestProjectId = projectId
    const hadExistingContentSnapshot = hadExistingContent
    clearGenerationNotice()
    setGenerationKickoffPending(true)

    try {
      const result = await trackedGeneration.track(
        {
          task: 'outline_and_characters',
          title: '正在生成人物小传和骨架',
          detail: '正在先写人物小传，再生成统一剧本骨架，请稍候...',
          fallbackSeconds: resolveOutlineBundleEstimatedSeconds(),
          scope: 'project'
        },
        () => generateOutlineAndCharactersFromConfirmedSevenQuestions(requestProjectId)
      )
      if (!result.outlineDraft) {
        throw new Error('rough_outline_result_missing')
      }
      const latestProjectResult = await apiGetProject(requestProjectId)
      const latestProject = latestProjectResult.project ?? result.project

      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setStoryIntent(latestProject.storyIntent ?? result.storyIntent)
        setProjectEntityStore(latestProject.entityStore ?? null)
        hydrateProjectDrafts({
          outline: latestProject.outlineDraft ?? result.outlineDraft,
          characters: latestProject.characterDrafts,
          segments: [],
          script: []
        })
        clearScriptPlanCache()
        setGenerationNotice(
          result.outlineGenerationError
            ? buildOutlineCharacterPartialSuccessNotice({
                currentStage,
                hadExistingContent: hadExistingContentSnapshot
              })
            : buildOutlineCharacterGenerationSuccessNotice({
                currentStage,
                hadExistingContent: hadExistingContentSnapshot
              })
        )
        await refreshCredits()
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
    } finally {
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setGenerationKickoffPending(false)
      }
    }
  }, [
    clearGenerationNotice,
    currentStage,
    generationKickoffPending,
    generationStatus,
    hadExistingContent,
    hydrateProjectDrafts,
    projectId,
    refreshCredits,
    setGenerationNotice,
    setProjectEntityStore,
    setStoryIntent,
    trackedGeneration
  ])

  return {
    actionLabel,
    generationStatus,
    generationBusy: generationKickoffPending || Boolean(generationStatus),
    handleGenerateOutlineAndCharacters
  }
}
