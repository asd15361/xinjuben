import { useCallback } from 'react'
import { classifyRuntimeFailureHistory } from '../../../../../shared/domain/runtime/failure-history'
import { ensureOutlineEpisodeShape } from '../../../../../shared/domain/workflow/outline-episodes'
import { mergeScriptByEpisodeNo } from '../../../../../shared/domain/workflow/script-episode-coverage'
import type { ProjectGenerationStatusDto } from '../../../../../shared/contracts/generation'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { useStageStore } from '../../../store/useStageStore'
import type { useScriptGenerationPlan } from '../../../app/hooks/useScriptGenerationPlan'
import type { useScriptAudit } from '../../../app/hooks/useScriptAudit'
import { resolveScriptEstimatedSeconds } from '../../../app/utils/stage-estimates'
import {
  buildRewriteScriptEpisodeRequest,
  buildStartScriptGenerationRequest,
  buildScriptCharactersSummary,
  resolveEffectiveScriptGenerationPlan,
  resolveRequestedScriptGenerationMeta
} from './script-stage-actions'

type ScriptGenerationPlanResult = ReturnType<typeof useScriptGenerationPlan>
type ScriptAuditResult = ReturnType<typeof useScriptAudit>

interface UseScriptStageActionsInput {
  generationPlan: ScriptGenerationPlanResult
  audit: ScriptAuditResult
  targetEpisodes: number
}

function formatScriptRuntimeFailure(result: {
  board: { episodeStatuses: Array<{ episodeNo: number; status: string }> }
  failure: { errorMessage?: string | undefined } | null
}): string {
  const failedEpisode = result.board.episodeStatuses.find(
    (item) => item.status === 'failed'
  )?.episodeNo
  const errorMessage = result.failure?.errorMessage || ''
  const staleWarningMatch = errorMessage.match(
    /^stale_warning:characters_fingerprint_changed:(.+):(.+)$/
  )
  const timeoutMatch = errorMessage.match(/^ai_request_timeout:(\d+)ms$/)

  if (staleWarningMatch) {
    return `Stale Warning：人物小传刚刚发生了变更，当前剧本生成快照已经过时。请先刷新下游，再按新人物设定重新生成。`
  }

  if (timeoutMatch) {
    const seconds = Math.max(1, Math.round(Number(timeoutMatch[1]) / 1000))
    return `第 ${failedEpisode || '?'} 集请求超时，当前上限是 ${seconds} 秒。`
  }

  if (errorMessage) {
    return `第 ${failedEpisode || '?'} 集失败：${errorMessage}。`
  }

  if (failedEpisode) {
    return `第 ${failedEpisode} 集失败。`
  }

  return '本轮续写失败。'
}

function isCharactersFingerprintStaleWarning(errorMessage: string | undefined): boolean {
  return Boolean(errorMessage?.startsWith('stale_warning:characters_fingerprint_changed:'))
}

export function useScriptStageActions(input: UseScriptStageActionsInput): {
  generationStatus: ProjectGenerationStatusDto | null
  handleAutoRepair: () => Promise<void>
  handleRewriteEpisode: (episodeNo: number) => Promise<void>
  handleStartGeneration: () => Promise<void>
} {
  const { generationPlan, audit, targetEpisodes } = input
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
  const setScriptRuntimeFailureHistory = useWorkflowStore(
    (state) => state.setScriptRuntimeFailureHistory
  )
  const setScriptProgressBoard = useWorkflowStore((state) => state.setScriptProgressBoard)
  const setScriptFailureResolution = useWorkflowStore((state) => state.setScriptFailureResolution)
  const replaceScript = useStageStore((state) => state.replaceScript)
  const upsertScript = useStageStore((state) => state.upsertScript)
  const handleStartGeneration = useCallback(async (): Promise<void> => {
    if (!projectId) {
      setGenerationNotice({
        kind: 'error',
        title: '还没选中项目',
        detail: '先回到项目首页打开项目，再开始这一轮剧本生成。'
      })
      return
    }

    const runtimeFailureHistory = useWorkflowStore.getState().scriptRuntimeFailureHistory
    const generationMeta = resolveRequestedScriptGenerationMeta(script, targetEpisodes)
    const { normalizedTargetEpisodes, normalizedScript, requestedMode } = generationMeta
    if (normalizedTargetEpisodes <= 0) {
      setGenerationNotice({
        kind: 'error',
        title: '目标集数缺失',
        detail: '上游还没有把正式集数收稳，先回灵感对话确认信息，不再由剧本阶段替你猜。'
      })
      return
    }
    const scriptPlanBase = requestedMode === 'rewrite' ? [] : normalizedScript
    const effectivePlan = await resolveEffectiveScriptGenerationPlan({
      generationPlan,
      requestedMode,
      normalizedTargetEpisodes,
      scriptPlanBase,
      storyIntent,
      outline,
      characters,
      segments,
      runtimeFailureHistory
    })

    if (!effectivePlan) {
      setGenerationNotice({
        kind: 'error',
        title: '剧本生成入口还在准备中',
        detail: '我正在核对详细大纲、人物和剧本入口，请等这一页准备好再点。'
      })
      return
    }

    const requestProjectId = projectId
    const normalizedOutline = ensureOutlineEpisodeShape(outline, normalizedTargetEpisodes)
    clearGenerationNotice()

    try {
      const projectSnapshot = await window.api.workspace.getProject(requestProjectId)
      const result = await window.api.workflow.startScriptGeneration(
        buildStartScriptGenerationRequest({
          projectId: requestProjectId,
          plan: effectivePlan,
          outline: normalizedOutline,
          characters,
          segments,
          existingScript: scriptPlanBase,
          storyIntent,
          charactersSummary: buildScriptCharactersSummary(characters),
          projectEntityStore: projectSnapshot?.entityStore ?? undefined
        })
      )

      const nextScript = mergeScriptByEpisodeNo(
        normalizedScript,
        result.generatedScenes,
        normalizedTargetEpisodes
      )
      const savedScriptProject = await window.api.workspace.saveScriptDraft({
        projectId: requestProjectId,
        scriptDraft: nextScript
      })
      if (!savedScriptProject) {
        throw new Error(`script_draft_save_failed:${requestProjectId}`)
      }
      const nextFailureHistory = result.success
        ? []
        : [
            classifyRuntimeFailureHistory({
              reason: result.failure?.reason,
              errorMessage: result.failure?.errorMessage
            })
          ]
      const savedRuntimeProject = await window.api.workspace.saveScriptRuntimeState({
        projectId: requestProjectId,
        scriptProgressBoard: result.board,
        scriptFailureResolution: result.failure,
        scriptRuntimeFailureHistory: nextFailureHistory,
        scriptStateLedger: result.ledger,
        scriptPostflight: result.postflight
      })
      if (!savedRuntimeProject) {
        throw new Error(`script_runtime_state_save_failed:${requestProjectId}`)
      }
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        replaceScript(nextScript)
        setScriptProgressBoard(result.board)
        setScriptFailureResolution(result.failure)
      }

      const qualitySignalsRemain = result.postflight?.quality?.pass === false

      if (result.success && !qualitySignalsRemain) {
        setScriptRuntimeFailureHistory([])
        if (useWorkflowStore.getState().projectId === requestProjectId) {
          setGenerationNotice({
            kind: 'success',
            title:
              requestedMode === 'rewrite' ? '这一轮剧本已经重写好了' : '这一轮剧本已经写出来了',
            detail:
              requestedMode === 'rewrite'
                ? `这 ${normalizedTargetEpisodes} 集已经按目标集数重新收口。你现在可以直接在下面继续看、改，或者整轮再写一版。`
                : `本轮自动新增 ${result.generatedScenes.length} 集。你现在可以直接在下面继续看、改、接着写。`,
            primaryAction: { label: '继续看剧本', stage: 'script' }
          })
        }
      } else if (result.success && qualitySignalsRemain) {
        setScriptRuntimeFailureHistory([])
        if (useWorkflowStore.getState().projectId === requestProjectId) {
          const remainingCount = result.postflight?.quality?.weakEpisodes.length ?? 0
          setGenerationNotice({
            kind: 'success',
            title: '这一轮剧本已经写出来了，剩下的问题我先记成返修信号',
            detail:
              remainingCount > 0
                ? `这轮内容已经生成并保存，也已经跑过一轮返修 Agent；现在还剩 ${remainingCount} 集带着观察信号，你可以直接继续看、改、再写，不会被系统卡死。`
                : '这轮内容已经生成并保存，剩余问题我先留成观察项，你现在就能继续看和改，不会被系统卡死。',
            primaryAction: { label: '继续看剧本', stage: 'script' }
          })
        }
      } else {
        setScriptRuntimeFailureHistory(nextFailureHistory)
        if (useWorkflowStore.getState().projectId === requestProjectId) {
          const visibleSceneCount = nextScript.length
          const newSceneCount = result.generatedScenes.length
          const failureDetail = formatScriptRuntimeFailure({
            board: result.board,
            failure: result.failure
          })
          const staleWarning = isCharactersFingerprintStaleWarning(result.failure?.errorMessage)
          if (staleWarning) {
            console.warn('[script-generation] Stale Warning surfaced in renderer notice path')
          }
          setGenerationNotice({
            kind: 'error',
            title: staleWarning
              ? 'Stale Warning：人物快照已经过时'
              : newSceneCount > 0
                ? '剧本这次没有完整写完'
                : '剧本这次没有生成出内容',
            detail:
              staleWarning
                ? newSceneCount > 0
                  ? `上游人物小传已经变化，我已停止继续沿用旧快照。当前这轮先停在已写出的 ${newSceneCount} 集，请先确认最新人物，再从剧本页重新起跑。${failureDetail}`
                  : `上游人物小传已经变化，我已阻止这轮继续沿用旧快照。${failureDetail}`
                : newSceneCount > 0
                ? requestedMode === 'rewrite'
                  ? `这次中途断了，但已经重写出 ${newSceneCount} 集，目标集数内旧内容也还保留着。${failureDetail}你可以继续补写，或者整轮再重写。`
                  : `这次中途断了，但已经写出 ${newSceneCount} 集，下面就能直接看。${failureDetail}你可以接着补写，或者再重试后面的部分。`
                : visibleSceneCount > 0
                  ? requestedMode === 'rewrite'
                    ? `这次没重写出新内容，但目标集数内旧内容还在。${failureDetail}你可以先接着改，或者直接再重写。`
                    : `这次没继续写出新内容，但下面旧内容还在。${failureDetail}你可以先接着改，或者直接重试。`
                  : `这次一集都没写出来，不用往下翻空白区了。${failureDetail}直接重试；如果还失败，我继续查真实报错。`,
            primaryAction: { label: '继续看剧本', stage: 'script' }
          })
        }
      }
    } catch (error) {
      if (useWorkflowStore.getState().projectId === requestProjectId) {
        setGenerationNotice({
          kind: 'error',
          title: '剧本这次没有生成成功',
          detail: '先别反复点按钮。回看详细大纲和当前逐集内容，再重新生成一轮。',
          primaryAction: { label: '留在剧本页', stage: 'script' }
        })
      }
      throw error
    }
  }, [
    characters,
    clearGenerationNotice,
    generationPlan,
    outline,
    projectId,
    replaceScript,
    script,
    segments,
    setScriptFailureResolution,
    setScriptProgressBoard,
    setScriptRuntimeFailureHistory,
    setGenerationNotice,
    storyIntent,
    targetEpisodes
  ])

  const handleRewriteEpisode = useCallback(
    async (episodeNo: number): Promise<void> => {
      if (!projectId) {
        setGenerationNotice({
          kind: 'error',
          title: '还没选中项目',
          detail: '先回到项目首页打开项目，再改这一集。'
        })
        return
      }

      const runtimeFailureHistory = useWorkflowStore.getState().scriptRuntimeFailureHistory
      const generationMeta = resolveRequestedScriptGenerationMeta(script, targetEpisodes)
      const { normalizedTargetEpisodes, normalizedScript, requestedMode } = generationMeta
      if (normalizedTargetEpisodes <= 0) {
        setGenerationNotice({
          kind: 'error',
          title: '目标集数缺失',
          detail: '上游还没有把正式集数收稳，先回灵感对话确认信息，不再由剧本阶段替你猜。'
        })
        return
      }

      const currentScene = normalizedScript.find((scene) => scene.sceneNo === episodeNo)
      if (!currentScene) {
        setGenerationNotice({
          kind: 'error',
          title: `第 ${episodeNo} 集还没内容`,
          detail: '这一集还没有现成稿子，先让系统把它写出来，再点这一个按钮改。'
        })
        return
      }

      const effectivePlan = await resolveEffectiveScriptGenerationPlan({
        generationPlan,
        requestedMode,
        normalizedTargetEpisodes,
        scriptPlanBase: normalizedScript,
        storyIntent,
        outline,
        characters,
        segments,
        runtimeFailureHistory
      })

      if (!effectivePlan) {
        setGenerationNotice({
          kind: 'error',
          title: '这一集暂时还改不了',
          detail: '我现在还没拿稳这一轮剧本计划，请稍后再点，或者先整轮再生成一次。'
        })
        return
      }

      const requestProjectId = projectId
      const normalizedOutline = ensureOutlineEpisodeShape(outline, normalizedTargetEpisodes)
      clearGenerationNotice()
      setGenerationStatus({
        task: 'script',
        stage: 'script',
        title: `正在重写第 ${episodeNo} 集`,
        detail: '我会沿用同一个写作专家，按硬问题清单直接改这一集，不会整轮重写。',
        startedAt: Date.now(),
        estimatedSeconds: resolveScriptEstimatedSeconds(1),
        scope: 'project'
      })

      try {
        const projectSnapshot = await window.api.workspace.getProject(requestProjectId)
        const result = await window.api.workflow.rewriteScriptEpisode(
          buildRewriteScriptEpisodeRequest({
            episodeNo,
            plan: effectivePlan,
            outline: normalizedOutline,
            characters,
            segments,
            existingScript: normalizedScript,
            storyIntent,
            charactersSummary: buildScriptCharactersSummary(characters),
            projectEntityStore: projectSnapshot?.entityStore ?? undefined
          })
        )

        const nextScript = mergeScriptByEpisodeNo(script, [result.scene])
        const savedScriptProject = await window.api.workspace.saveScriptDraft({
          projectId: requestProjectId,
          scriptDraft: nextScript
        })
        if (!savedScriptProject) {
          throw new Error(`script_draft_save_failed:${requestProjectId}`)
        }

        if (useWorkflowStore.getState().projectId === requestProjectId) {
          replaceScript(nextScript)
          setGenerationNotice({
            kind: 'success',
            title:
              result.failures.length === 0
                ? `第 ${episodeNo} 集已经改好`
                : `第 ${episodeNo} 集已经按问题单重写`,
            detail:
              result.failures.length === 0
                ? '这一集当前没有剩余硬毛病了，系统也不会停住，后面还能继续自动写。'
                : `这次已经按问题单改了一遍，但还剩 ${result.failures.length} 个硬问题：${result.failures
                    .map((failure) => failure.detail)
                    .join('；')}。不会卡住，你可以继续写，或者再点一次这一集。`,
            primaryAction: { label: '继续看剧本', stage: 'script' }
          })
        }
      } catch (error) {
        if (useWorkflowStore.getState().projectId === requestProjectId) {
          setGenerationNotice({
            kind: 'error',
            title: `第 ${episodeNo} 集这次没改成功`,
            detail: '旧稿已经保住了。你可以继续往后写，或者稍后再点这集重写。',
            primaryAction: { label: '继续看剧本', stage: 'script' }
          })
        }
        throw error
      } finally {
        if (useWorkflowStore.getState().projectId === requestProjectId) {
          setGenerationStatus(null)
        }
      }
    },
    [
      characters,
      clearGenerationNotice,
      generationPlan,
      outline,
      projectId,
      replaceScript,
      script,
      segments,
      setGenerationStatus,
      setGenerationNotice,
      storyIntent,
      targetEpisodes
    ]
  )

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
    handleRewriteEpisode,
    handleStartGeneration
  }
}
