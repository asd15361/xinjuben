import { useEffect, useMemo, useRef } from 'react'
import { useWorkflowStore } from '../store/useWorkflowStore'
import { useStageStore } from '../../store/useStageStore'
import { ensureOutlineEpisodeShape } from '../../../../shared/domain/workflow/outline-episodes'
import { classifyRuntimeFailureHistory } from '../../../../shared/domain/runtime/failure-history'
import { resolveProjectEpisodeCount } from '../../../../shared/domain/workflow/episode-count'

const DETAILED_OUTLINE_ESTIMATED_SECONDS = 90
const SCRIPT_ESTIMATED_SECONDS = 110

export function useProjectAutoGeneration() {
  const projectId = useWorkflowStore((state) => state.projectId)
  const generationStatus = useWorkflowStore((state) => state.generationStatus)
  const setGenerationStatus = useWorkflowStore((state) => state.setGenerationStatus)
  const storyIntent = useWorkflowStore((state) => state.storyIntent)
  const setScriptRuntimeFailureHistory = useWorkflowStore((state) => state.setScriptRuntimeFailureHistory)
  const outline = useStageStore((state) => state.outline)
  const characters = useStageStore((state) => state.characters)
  const segments = useStageStore((state) => state.segments)
  const script = useStageStore((state) => state.script)
  const replaceSegments = useStageStore((state) => state.replaceSegments)
  const appendScriptSegments = useStageStore((state) => state.appendScriptSegments)

  const detailedLockRef = useRef('')
  const scriptLockRef = useRef('')
  const normalizedOutline = useMemo(() => ensureOutlineEpisodeShape(outline), [outline])
  const targetEpisodes = useMemo(
    () => resolveProjectEpisodeCount({ outline: normalizedOutline, storyIntent }),
    [normalizedOutline, storyIntent]
  )

  useEffect(() => {
    if (!projectId || generationStatus) return
    const hasOutline = normalizedOutline.summaryEpisodes.some((episode) => episode.summary.trim())
    if (!hasOutline || characters.length === 0 || segments.some((segment) => segment.content.trim()) || script.length > 0) return

    const signature = JSON.stringify({
      projectId,
      outline: normalizedOutline.summary,
      characters
    })
    if (detailedLockRef.current === signature) return
    detailedLockRef.current = signature

    const nextGenerationStatus = {
      task: 'detailed_outline',
      stage: 'detailed_outline',
      title: '正在生成详细大纲',
      detail: '我在根据粗纲和人物，把四个大阶段自动排成推进图。',
      startedAt: Date.now(),
      estimatedSeconds: DETAILED_OUTLINE_ESTIMATED_SECONDS,
      scope: 'project' as const,
      autoChain: true,
      nextTask: 'script' as const
    } as const

    let cancelled = false
    void (async () => {
      setGenerationStatus(nextGenerationStatus)
      await window.api.workspace.saveGenerationStatus({ projectId, generationStatus: nextGenerationStatus })
      try {
        const result = await window.api.workspace.generateDetailedOutline({
          projectId,
          outline: normalizedOutline,
          characters
        })

        if (!cancelled && useWorkflowStore.getState().projectId === projectId) {
          replaceSegments(result.detailedOutlineSegments)
        }
      } finally {
        await window.api.workspace.saveGenerationStatus({ projectId, generationStatus: null })
        if (!cancelled && useWorkflowStore.getState().projectId === projectId) {
          setGenerationStatus(null)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [characters, generationStatus, normalizedOutline, projectId, replaceSegments, script.length, segments, setGenerationStatus])

  useEffect(() => {
    if (!projectId || generationStatus) return
    if (!segments.some((segment) => segment.content.trim()) || script.length > 0) return

    const signature = JSON.stringify({
      projectId,
      outline: normalizedOutline.summary,
      segments,
      characters,
      storyIntent
    })
    if (scriptLockRef.current === signature) return
    scriptLockRef.current = signature

    const nextGenerationStatus = {
      task: 'script',
      stage: 'script',
      title: '正在生成剧本',
      detail: '我在根据详细大纲，自动把第一轮场景往前写出来。',
      startedAt: Date.now(),
      estimatedSeconds: SCRIPT_ESTIMATED_SECONDS,
      scope: 'project' as const,
      autoChain: true,
      nextTask: null
    } as const

    let cancelled = false
    void (async () => {
      setGenerationStatus(nextGenerationStatus)
      await window.api.workspace.saveGenerationStatus({ projectId, generationStatus: nextGenerationStatus })
      try {
        const plan = await window.api.workflow.buildScriptGenerationPlan({
          plan: {
            mode: 'fresh_start',
            targetEpisodes,
            runtimeFailureHistory: []
          },
          storyIntent,
          outline: normalizedOutline,
          characters,
          segments,
          script
        })

        if (!plan.ready) return

        const result = await window.api.workflow.startScriptGeneration({
          plan,
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

        if (result.generatedScenes.length > 0 && !cancelled && useWorkflowStore.getState().projectId === projectId) {
          appendScriptSegments(result.generatedScenes)
        }

        const nextScript = [...script, ...result.generatedScenes]
        await window.api.workspace.saveScriptDraft({ projectId, scriptDraft: nextScript })
        const nextResume = await window.api.workflow.resolveScriptGenerationResume({ board: result.board })
        await window.api.workspace.saveScriptRuntimeState({
          projectId,
          scriptProgressBoard: result.board,
          scriptResumeResolution: nextResume,
          scriptFailureResolution: result.failure,
          scriptStateLedger: result.ledger
        })

        if (!cancelled && useWorkflowStore.getState().projectId === projectId) {
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
        }
      } finally {
        await window.api.workspace.saveGenerationStatus({ projectId, generationStatus: null })
        if (!cancelled && useWorkflowStore.getState().projectId === projectId) {
          setGenerationStatus(null)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    appendScriptSegments,
    characters,
    generationStatus,
    normalizedOutline,
    projectId,
    script,
    segments,
    setGenerationStatus,
    setScriptRuntimeFailureHistory,
    storyIntent
    ,
    targetEpisodes
  ])
}
