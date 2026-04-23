import { useCallback, useRef } from 'react'
import { classifyRuntimeFailureHistory } from '../../../../../shared/domain/runtime/failure-history.ts'
import type { ProjectGenerationStatusDto } from '../../../../../shared/contracts/generation.ts'
import type { ScriptGenerationProgressBoardDto } from '../../../../../shared/contracts/script-generation.ts'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore.ts'
import { useAuthStore } from '../../../app/store/useAuthStore.ts'
import { useStageStore } from '../../../store/useStageStore.ts'
import type { useScriptGenerationPlan } from '../../../app/hooks/useScriptGenerationPlan.ts'
import type { useScriptAudit } from '../../../app/hooks/useScriptAudit.ts'
import { resolveScriptEstimatedSeconds } from '../../../app/utils/stage-estimates.ts'
import {
  resolveEffectiveScriptGenerationPlan,
  resolveRequestedScriptGenerationMeta
} from './script-stage-actions.ts'
import {
  apiStartScriptGeneration,
  apiGetScriptGenerationStatus,
  apiGetProject,
  apiRewriteScriptEpisode
} from '../../../services/api-client.ts'

type ScriptGenerationPlanResult = ReturnType<typeof useScriptGenerationPlan>
type ScriptAuditResult = ReturnType<typeof useScriptAudit>

interface UseScriptStageActionsInput {
  generationPlan: ScriptGenerationPlanResult
  audit: ScriptAuditResult
  targetEpisodes: number
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
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

    const effectivePlan = await resolveEffectiveScriptGenerationPlan({
      generationPlan,
      requestedMode,
      normalizedTargetEpisodes,
      scriptPlanBase: requestedMode === 'rewrite' ? [] : normalizedScript,
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
    clearGenerationNotice()

    // Set generation status to show progress bar
    setGenerationStatus({
      task: 'script',
      stage: 'script',
      title: '正在生成剧本',
      detail: `正在生成 ${normalizedTargetEpisodes} 集剧本，请稍候...`,
      startedAt: Date.now(),
      estimatedSeconds: resolveScriptEstimatedSeconds(normalizedTargetEpisodes),
      scope: 'project'
    })

    try {
      // Phase 8.3: HTTP POST to server, then poll for progress
      const startResult = await apiStartScriptGeneration({
        projectId: requestProjectId,
        targetEpisodes: normalizedTargetEpisodes,
        mode:
          requestedMode === 'rewrite' ? 'fresh_start' : (requestedMode as 'fresh_start' | 'resume')
      })

      if (!startResult.success) {
        throw new Error(startResult.message || 'script_generation_start_failed')
      }

      // Start polling every 3 seconds
      if (pollingRef.current) clearInterval(pollingRef.current)

      pollingRef.current = setInterval(async () => {
        try {
          const statusResult = await apiGetScriptGenerationStatus(requestProjectId)

          // Update progress board in store
          if (statusResult.board) {
            setScriptProgressBoard(statusResult.board as ScriptGenerationProgressBoardDto)
          }

          // Update generation status with current progress
          const completedCount = statusResult.completedEpisodes
          const totalCount = statusResult.totalEpisodes
          setGenerationStatus({
            task: 'script',
            stage: 'script',
            title: `正在生成剧本 (${completedCount}/${totalCount}集)`,
            detail: `已完成 ${completedCount} 集，共 ${totalCount} 集`,
            startedAt: Date.now(),
            estimatedSeconds: resolveScriptEstimatedSeconds(totalCount - completedCount),
            scope: 'project'
          })

          // Check if generation is done
          if (statusResult.status === 'completed' || statusResult.status === 'failed') {
            if (pollingRef.current) {
              clearInterval(pollingRef.current)
              pollingRef.current = null
            }

            // 从 status 接口获取完整生成结果，写入本地内容真相源
            const userId = useAuthStore.getState().user?.id
            if (userId && statusResult.generatedScenes) {
              try {
                await window.api.workspace.saveScriptGenerationResult({
                  userId,
                  projectId: requestProjectId,
                  scriptDraft: statusResult.generatedScenes,
                  scriptProgressBoard: statusResult.board ?? null,
                  scriptFailureResolution: statusResult.failure ?? null,
                  scriptStateLedger: statusResult.ledger ?? null
                })
              } catch (saveErr) {
                console.error('[script-generation] save local content failed:', saveErr)
                setGenerationNotice({
                  kind: 'error',
                  title: '剧本生成成功但本地保存失败',
                  detail: '生成结果已拿到，但写入本地文件时出错。请勿刷新页面，联系技术支持。',
                  primaryAction: { label: '留在剧本页', stage: 'script' }
                })
              }
            }

            if (statusResult.generatedScenes && useWorkflowStore.getState().projectId === requestProjectId) {
              replaceScript(statusResult.generatedScenes)
              setScriptProgressBoard(statusResult.board ?? null)
              setScriptFailureResolution(statusResult.failure ?? null)
            }

            setGenerationStatus(null)

            if (statusResult.status === 'completed') {
              setScriptRuntimeFailureHistory([])
              setGenerationNotice({
                kind: 'success',
                title:
                  requestedMode === 'rewrite' ? '这一轮剧本已经重写好了' : '这一轮剧本已经写出来了',
                detail:
                  requestedMode === 'rewrite'
                    ? `这 ${normalizedTargetEpisodes} 集已经按目标集数重新收口。你现在可以直接在下面继续看、改，或者整轮再写一版。`
                    : `本轮自动新增 ${completedCount} 集。你现在可以直接在下面继续看、改、接着写。`,
                primaryAction: { label: '继续看剧本', stage: 'script' }
              })
            } else {
              setScriptRuntimeFailureHistory([
                classifyRuntimeFailureHistory({ reason: 'failed', errorMessage: '生成失败' })
              ])
              setGenerationNotice({
                kind: 'error',
                title: '剧本这次没有生成成功',
                detail: '先别反复点按钮。回看详细大纲和当前逐集内容，再重新生成一轮。',
                primaryAction: { label: '留在剧本页', stage: 'script' }
              })
            }
          }
        } catch (pollError) {
          console.error('[script-generation] Polling error:', pollError)
        }
      }, 3000)
    } catch (error) {
      setGenerationStatus(null)
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
    setGenerationNotice,
    setGenerationStatus,
    setScriptFailureResolution,
    setScriptProgressBoard,
    setScriptRuntimeFailureHistory,
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
        const rewriteResult = await apiRewriteScriptEpisode({
          projectId: requestProjectId,
          episodeNo
        })

        if (!rewriteResult.success) {
          throw new Error(`rewrite_episode_failed:${episodeNo}`)
        }

        // 从 rewrite 结果获取 rewrittenScene，写本地内容真相源
        const userId = useAuthStore.getState().user?.id
        if (userId && rewriteResult.rewrittenScene) {
          try {
            const existingContent = await window.api.workspace.readLocalContent(
              userId,
              requestProjectId
            )
            const existingDraft = existingContent?.scriptDraft ?? []
            const updatedScript = existingDraft.map((s) =>
              s.sceneNo === episodeNo ? rewriteResult.rewrittenScene : s
            )
            await window.api.workspace.saveScriptGenerationResult({
              userId,
              projectId: requestProjectId,
              scriptDraft: updatedScript,
              scriptProgressBoard: existingContent?.scriptProgressBoard ?? null,
              scriptFailureResolution: existingContent?.scriptFailureResolution ?? null,
              scriptStateLedger: rewriteResult.ledger ?? null
            })

            if (useWorkflowStore.getState().projectId === requestProjectId) {
              replaceScript(updatedScript)
              setGenerationNotice({
                kind: 'success',
                title: `第 ${episodeNo} 集已经改好`,
                detail: '这一集已经重写完成，你可以继续看、改，或者再点一次。',
                primaryAction: { label: '继续看剧本', stage: 'script' }
              })
            }
          } catch (saveErr) {
            console.error('[script-rewrite] save local content failed:', saveErr)
            throw new Error(`rewrite_save_failed:${episodeNo}`)
          }
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
    // Auto-repair: read from local content store (truth source)
    if (!projectId) return
    const userId = useAuthStore.getState().user?.id
    if (!userId) return
    try {
      const localContent = await window.api.workspace.readLocalContent(userId, projectId)
      if (localContent?.scriptDraft) {
        upsertScript(localContent.scriptDraft)
      }
    } catch (error) {
      console.error('[script] Auto-repair local read failed:', error)
    }
  }

  return {
    generationStatus,
    handleAutoRepair,
    handleRewriteEpisode,
    handleStartGeneration
  }
}
