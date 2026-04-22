import { useCallback, useState } from 'react'
import type { ProjectGenerationStatusDto } from '../../../../../shared/contracts/generation.ts'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore.ts'
import { useStageStore } from '../../../store/useStageStore.ts'
import { clearScriptPlanCache } from '../../../app/services/script-plan-service.ts'
import { buildDetailedOutlineFailureNotice } from './detailed-outline-generation-notice.ts'
import { resolveDetailedOutlineEntryBlock } from './detailed-outline-entry-guard.ts'
import { buildDetailedOutlineGenerationSuccessNotice } from './detailed-outline-stage-label.ts'
import {
  apiGenerateDetailedOutline,
  apiSaveOutlineDraft,
  apiSaveCharacterDrafts
} from '../../../services/api-client.ts'

interface DetailedOutlineStageActionsResult {
  generationStatus: ProjectGenerationStatusDto | null
  generationBusy: boolean
  handleGenerateDetailedOutline: () => Promise<void>
}

export function useDetailedOutlineStageActions(): DetailedOutlineStageActionsResult {
  const projectId = useWorkflowStore((state) => state.projectId)
  const generationStatus = useWorkflowStore((state) => state.generationStatus)
  const setGenerationNotice = useWorkflowStore((state) => state.setGenerationNotice)
  const clearGenerationNotice = useWorkflowStore((state) => state.clearGenerationNotice)
  const replaceSegments = useStageStore((state) => state.replaceSegments)
  const outline = useStageStore((state) => state.outline)
  const characters = useStageStore((state) => state.characters)
  const segments = useStageStore((state) => state.segments)
  const [generationKickoffPending, setGenerationKickoffPending] = useState(false)

  const handleGenerateDetailedOutline = useCallback(async (): Promise<void> => {
    if (!projectId || generationKickoffPending || generationStatus) return

    const entryBlockCode = resolveDetailedOutlineEntryBlock({ outline, characters })
    if (entryBlockCode) {
      clearGenerationNotice()
      setGenerationNotice(buildDetailedOutlineFailureNotice(entryBlockCode))
      return
    }

    const requestProjectId = projectId
    const hadExistingBlocks = segments.length > 0
    clearGenerationNotice()
    setGenerationKickoffPending(true)

    try {
      // 生成前先确保所有前置数据落盘
      await apiSaveOutlineDraft({ projectId: requestProjectId, outlineDraft: outline })
      await apiSaveCharacterDrafts({ projectId: requestProjectId, characterDrafts: characters })

      const result = await apiGenerateDetailedOutline({
        projectId: requestProjectId
      })
      if (
        !result.project ||
        !result.detailedOutlineSegments ||
        result.detailedOutlineSegments.length === 0
      ) {
        throw new Error('detailed_outline_persist_missing')
      }
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        replaceSegments(result.detailedOutlineSegments)
      }
      clearScriptPlanCache()
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setGenerationNotice(buildDetailedOutlineGenerationSuccessNotice(hadExistingBlocks))
      }
    } catch (error) {
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setGenerationNotice(buildDetailedOutlineFailureNotice(error))
      }
      return
    } finally {
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setGenerationKickoffPending(false)
      }
    }
  }, [
    characters,
    clearGenerationNotice,
    generationKickoffPending,
    generationStatus,
    outline,
    projectId,
    replaceSegments,
    segments,
    setGenerationNotice
  ])

  return {
    generationStatus,
    generationBusy: generationKickoffPending || Boolean(generationStatus),
    handleGenerateDetailedOutline
  }
}
