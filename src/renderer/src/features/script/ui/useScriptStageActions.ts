import { useCallback } from 'react'
import { classifyRuntimeFailureHistory } from '../../../../../shared/domain/runtime/failure-history'
import { ensureOutlineEpisodeShape } from '../../../../../shared/domain/workflow/outline-episodes'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { useStageStore } from '../../../store/useStageStore'
import type { useScriptGenerationPlan } from '../../../app/hooks/useScriptGenerationPlan'
import type { useScriptAudit } from '../../../app/hooks/useScriptAudit'

type ScriptGenerationPlanResult = ReturnType<typeof useScriptGenerationPlan>
type ScriptAuditResult = ReturnType<typeof useScriptAudit>

interface UseScriptStageActionsInput {
  generationPlan: ScriptGenerationPlanResult
  audit: ScriptAuditResult
}

export function useScriptStageActions(input: UseScriptStageActionsInput) {
  const { generationPlan, audit } = input
  const script = useStageStore((state) => state.script)
  const outline = useStageStore((state) => state.outline)
  const characters = useStageStore((state) => state.characters)
  const segments = useStageStore((state) => state.segments)
  const storyIntent = useWorkflowStore((state) => state.storyIntent)
  const projectId = useWorkflowStore((state) => state.projectId)
  const generationStatus = useWorkflowStore((state) => state.generationStatus)
  const setGenerationStatus = useWorkflowStore((state) => state.setGenerationStatus)
  const setScriptRuntimeFailureHistory = useWorkflowStore((state) => state.setScriptRuntimeFailureHistory)
  const appendScriptSegments = useStageStore((state) => state.appendScriptSegments)
  const upsertScript = useStageStore((state) => state.upsertScript)
  const SCRIPT_ESTIMATED_SECONDS = 110

  const handleStartGeneration = useCallback(async (): Promise<void> => {
    if (!generationPlan?.ready || !projectId) return

    const requestProjectId = projectId
    const normalizedOutline = ensureOutlineEpisodeShape(outline)
    const nextGenerationStatus = {
      task: 'script',
      stage: 'script',
      title: '正在生成剧本',
      detail: '我在根据详细大纲，把这一轮场景往前写出来。',
      startedAt: Date.now(),
      estimatedSeconds: SCRIPT_ESTIMATED_SECONDS,
      scope: 'project',
      autoChain: true,
      nextTask: null
    } as const
    setGenerationStatus(nextGenerationStatus)
    void window.api.workspace.saveGenerationStatus({ projectId: requestProjectId, generationStatus: nextGenerationStatus })

    try {
        const result = await window.api.workflow.startScriptGeneration({
        plan: generationPlan,
        outlineTitle: normalizedOutline.title,
        theme: normalizedOutline.theme,
        mainConflict: normalizedOutline.mainConflict,
        charactersSummary: characters.map((item) => `${item.name}:${item.goal || item.protectTarget || item.fear}`),
        storyIntent,
        outline: normalizedOutline,
        characters,
        segments,
        existingScript: script
      })

      if (result.generatedScenes.length > 0) {
        if (useWorkflowStore.getState().projectId === requestProjectId) {
          appendScriptSegments(result.generatedScenes)
        }
      }

      const nextScript = [...script, ...result.generatedScenes]
      await window.api.workspace.saveScriptDraft({ projectId: requestProjectId, scriptDraft: nextScript })
      const nextResume = await window.api.workflow.resolveScriptGenerationResume({ board: result.board })
      await window.api.workspace.saveScriptRuntimeState({
        projectId: requestProjectId,
        scriptProgressBoard: result.board,
        scriptResumeResolution: nextResume,
        scriptFailureResolution: result.failure,
        scriptStateLedger: result.ledger
      })

      if (result.success) {
        setScriptRuntimeFailureHistory([])
      } else {
        setScriptRuntimeFailureHistory([
          classifyRuntimeFailureHistory({
            reason: result.failure?.reason,
            errorMessage: result.failure?.errorMessage
          })
        ])
      }
    } finally {
      await window.api.workspace.saveGenerationStatus({ projectId: requestProjectId, generationStatus: null })
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setGenerationStatus(null)
      }
    }
  }, [
    appendScriptSegments,
    characters,
    generationPlan,
    outline,
    projectId,
    script,
    segments,
    setGenerationStatus,
    setScriptRuntimeFailureHistory,
    storyIntent
  ])

  async function handleAutoRepair(): Promise<void> {
    if (!audit.repairPlan?.shouldRepair) return

    const result = await window.api.workflow.executeScriptRepair({
      storyIntent,
      outline,
      characters,
      segments,
      script,
      suggestions: audit.repairPlan.suggestions
    })

    upsertScript(result.repairedScript)
  }

  return {
    generationStatus,
    handleAutoRepair,
    handleStartGeneration
  }
}
