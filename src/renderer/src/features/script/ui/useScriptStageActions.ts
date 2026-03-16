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

function getScriptGenerationBlockedMessage(code: string | undefined, fallback: string | undefined): string {
  if (code === 'script_formal_fact_missing') {
    return '先回粗纲把最关键的设定确认下来，再开始写剧本。'
  }
  if (code === 'script_formal_fact_segment_missing') {
    return '当前详细大纲还没把已经确认的设定真正接进去，先回详细大纲补齐再写剧本。'
  }
  if (code === 'script_segment_missing' || code === 'script_segment_structure_weak') {
    return '当前详细大纲还不够完整，先把这一版详细大纲补齐，再开始写剧本。'
  }
  if (code === 'script_character_missing') {
    return '人物这一层还没准备好，先回人物页把关键角色补齐，再开始写剧本。'
  }
  if (code === 'script_anchor_roster_missing' || code === 'script_heroine_anchor_missing') {
    return '角色关系和主线推进还没完全对上，先回人物页或详细大纲页补齐再写剧本。'
  }
  return fallback || '先把详细大纲、人物和关键设定补齐，再开始写剧本。'
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
  const setGenerationNotice = useWorkflowStore((state) => state.setGenerationNotice)
  const clearGenerationNotice = useWorkflowStore((state) => state.clearGenerationNotice)
  const setScriptRuntimeFailureHistory = useWorkflowStore((state) => state.setScriptRuntimeFailureHistory)
  const appendScriptSegments = useStageStore((state) => state.appendScriptSegments)
  const upsertScript = useStageStore((state) => state.upsertScript)
  const SCRIPT_ESTIMATED_SECONDS = 110

  const handleStartGeneration = useCallback(async (): Promise<void> => {
    if (!projectId) {
      setGenerationNotice({
        kind: 'error',
        title: '还没选中项目',
        detail: '先回到项目首页打开项目，再开始这一轮剧本生成。'
      })
      return
    }

    const effectivePlan =
      generationPlan ||
      (await window.api.workflow.buildScriptGenerationPlan({
        plan: {
          mode: 'fresh_start',
          targetEpisodes: ensureOutlineEpisodeShape(outline).summaryEpisodes.length || 10,
          runtimeFailureHistory: useWorkflowStore.getState().scriptRuntimeFailureHistory
        },
        storyIntent,
        outline,
        characters,
        segments,
        script
      }))

    if (!effectivePlan) {
      setGenerationNotice({
        kind: 'error',
        title: '剧本生成入口还在准备中',
        detail: '我正在核对详细大纲、人物和剧本入口，请等这一页准备好再点。'
      })
      return
    }

    if (!effectivePlan.ready) {
      const firstIssue = effectivePlan.blockedBy[0]
      setGenerationNotice({
        kind: 'error',
        title: '现在还不能直接生成剧本',
        detail: getScriptGenerationBlockedMessage(firstIssue?.code, firstIssue?.message),
        primaryAction: { label: '回详细大纲', stage: 'detailed_outline' }
      })
      return
    }

    const requestProjectId = projectId
    const normalizedOutline = ensureOutlineEpisodeShape(outline)
    const nextGenerationStatus = {
      task: 'script',
      stage: 'script',
      title: '正在生成剧本',
      detail: '我在根据详细大纲，把这一轮场景往前写出来。',
      startedAt: Date.now(),
      estimatedSeconds: SCRIPT_ESTIMATED_SECONDS,
      scope: 'project'
    } as const
    clearGenerationNotice()
    setGenerationStatus(nextGenerationStatus)
    void window.api.workspace.saveGenerationStatus({ projectId: requestProjectId, generationStatus: nextGenerationStatus })

    try {
      const result = await window.api.workflow.startScriptGeneration({
        plan: effectivePlan,
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
        if (useWorkflowStore.getState().projectId === requestProjectId) {
          setGenerationNotice({
            kind: 'success',
            title: '这一轮剧本已经写出来了',
            detail: `本轮新增 ${result.generatedScenes.length} 场。你现在可以直接在下面继续看、改、接着写。`,
            primaryAction: { label: '继续看剧本', stage: 'script' }
          })
        }
      } else {
        setScriptRuntimeFailureHistory([
          classifyRuntimeFailureHistory({
            reason: result.failure?.reason,
            errorMessage: result.failure?.errorMessage
          })
        ])
        if (useWorkflowStore.getState().projectId === requestProjectId) {
          setGenerationNotice({
            kind: 'error',
            title: '剧本这次没有完整写出来',
            detail: '这不是让你重来一遍。先看下面已经生成出的内容，再决定是补写还是重试。',
            primaryAction: { label: '继续看剧本', stage: 'script' }
          })
        }
      }
    } catch (error) {
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setGenerationNotice({
          kind: 'error',
          title: '剧本这次没有生成成功',
          detail: '先别反复点按钮。回看详细大纲和当前场次，再重新生成一轮。',
          primaryAction: { label: '留在剧本页', stage: 'script' }
        })
      }
      throw error
    } finally {
      await window.api.workspace.saveGenerationStatus({ projectId: requestProjectId, generationStatus: null })
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setGenerationStatus(null)
      }
    }
  }, [
    appendScriptSegments,
    characters,
    outline,
    projectId,
    script,
    segments,
    setGenerationStatus,
    setScriptRuntimeFailureHistory,
    setGenerationNotice,
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
