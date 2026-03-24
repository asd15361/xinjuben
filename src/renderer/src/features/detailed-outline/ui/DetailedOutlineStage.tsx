import { useStageStore, hydrateStagePayload } from '../../../store/useStageStore'
import { ProjectGenerationBanner } from '../../../components/ProjectGenerationBanner'
import { DetailedOutlineStageHeader } from '../../../components/DetailedOutlineStageHeader'
import { DetailedOutlineActsPanel } from '../../../components/DetailedOutlineActsPanel'
import { useState, useMemo } from 'react'
import { useDetailedOutlineStageActions } from './useDetailedOutlineStageActions'
import { useScriptGenerationRuntime } from '../../../app/hooks/useScriptGenerationRuntime'
import { ensureOutlineEpisodeShape } from '../../../../../shared/domain/workflow/outline-episodes'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { buildDetailedOutlineViewModel } from '../model/build-detailed-outline-view-model'
import { createAuthorityFailureNotice } from '../../../app/utils/authority-failure-notice'
import { summarizeIssues } from '../../../app/utils/stage-navigation-truth'
import { getScriptGenerationPlan } from '../../../app/services/script-plan-service'

function formatEpisodeRange(startEpisode: number, endEpisode: number): string {
  return startEpisode === endEpisode ? `${startEpisode}集` : `${startEpisode}-${endEpisode}集`
}

export function DetailedOutlineStage() {
  const detailedOutlineBlocks = useStageStore((s) => s.detailedOutlineBlocks)
  const characters = useStageStore((s) => s.characters)
  const activeCharacterBlocks = useStageStore((s) => s.activeCharacterBlocks)
  const script = useStageStore((s) => s.script)
  const setDetailedOutlineSectionSummary = useStageStore((s) => s.setDetailedOutlineSectionSummary)
  const setDetailedOutlineEpisodeBeatSummary = useStageStore(
    (s) => s.setDetailedOutlineEpisodeBeatSummary
  )
  const setDetailedOutlineEpisodeBeatSceneByScene = useStageStore(
    (s) => s.setDetailedOutlineEpisodeBeatSceneByScene
  )
  const saveDetailedOutlineBlocks = useStageStore((s) => s.saveDetailedOutlineBlocks)
  const outline = useStageStore((s) => s.outline)
  const projectId = useWorkflowStore((s) => s.projectId)
  const storyIntent = useWorkflowStore((s) => s.storyIntent)
  const setGenerationNotice = useWorkflowStore((s) => s.setGenerationNotice)
  const applyStageTransition = useWorkflowStore((s) => s.applyStageTransition)
  const { generationStatus, handleGenerateDetailedOutline } = useDetailedOutlineStageActions()
  const runtime = useScriptGenerationRuntime({
    projectId,
    plan: null,
    stageContractFingerprint: null,
    enabled: Boolean(projectId)
  })
  const [checkingScriptGate, setCheckingScriptGate] = useState(false)
  const normalizedOutline = useMemo(() => ensureOutlineEpisodeShape(outline), [outline])
  const hasDetailedOutlineBlocks = detailedOutlineBlocks.length > 0

  // Use pure view model builder - NO render-period heavy computation
  const viewModel = useMemo(
    () => buildDetailedOutlineViewModel(normalizedOutline, detailedOutlineBlocks),
    [normalizedOutline, detailedOutlineBlocks]
  )
  const { filledCount, totalEpisodes, sectionInputs, blockLabels } = viewModel
  const outlineEpisodes = normalizedOutline.summaryEpisodes

  const handleGoToScriptStage = async (): Promise<void> => {
    setCheckingScriptGate(true)
    try {
      const plan = await getScriptGenerationPlan({
        planInput: {
          mode: script.length > 0 ? 'resume' : 'fresh_start',
          targetEpisodes: normalizedOutline.summaryEpisodes.length || 10
        },
        storyIntent,
        outline: normalizedOutline,
        characters,
        activeCharacterBlocks,
        detailedOutlineBlocks,
        script,
        failureHistory: runtime.failureHistory
      })

      if (!plan) {
        setGenerationNotice({
          kind: 'error',
          title: '剧本入口还在准备中',
          detail: '请稍后再试。',
          primaryAction: { label: '继续看详细大纲', stage: 'detailed_outline' }
        })
        return
      }

      if (plan.ready) {
        if (!projectId) {
          return
        }
        try {
          await saveDetailedOutlineBlocks(projectId)
          const result = await window.api.workspace.changeProjectStage({
            projectId,
            targetStage: 'script'
          })
          if (result.project && result.payload && result.nextStage) {
            hydrateStagePayload(result.payload)
            applyStageTransition(result.nextStage, result.project)
            return
          }
          if (!result.project) {
            setGenerationNotice(
              createAuthorityFailureNotice({
                type: 'authority_failure',
                failureType: 'project_missing',
                code: 'AUTHORITY_FAILURE_PROJECT_MISSING',
                message: 'Stage transition response missing project data',
                context: {
                  fact: 'project',
                  stage: 'detailed_outline',
                  projectId: projectId ?? undefined,
                  source: 'renderer',
                  traceId: undefined
                },
                recoverability: 'refresh_project',
                recoverable: true,
                noticeKey: 'authority.project_missing',
                occurredAt: new Date().toISOString()
              })
            )
            return
          }
          throw new Error('Incomplete stage session result: payload or nextStage missing')
        } catch {
          setGenerationNotice(
            createAuthorityFailureNotice({
              type: 'authority_failure',
              failureType: 'ipc_failure',
              code: 'AUTHORITY_FAILURE_IPC_FAILURE',
              message: 'Stage transition IPC call failed',
              context: {
                fact: 'stage',
                stage: 'detailed_outline',
                projectId: projectId ?? undefined,
                source: 'renderer',
                traceId: undefined
              },
              recoverability: 'manual_retry',
              recoverable: true,
              noticeKey: 'authority.ipc_unavailable',
              occurredAt: new Date().toISOString()
            })
          )
        }
        return
      }

      const blockedMessages = plan.blockedBy.map((item) => item.message).filter(Boolean)
      setGenerationNotice({
        kind: 'error',
        title: '剧本入口还没放行',
        detail: summarizeIssues(blockedMessages, '先继续检查详细大纲和人物，再去剧本页查看状态。'),
        primaryAction: { label: '继续看详细大纲', stage: 'detailed_outline' },
        secondaryAction: { label: '去剧本页查看状态', stage: 'script' }
      })
    } finally {
      setCheckingScriptGate(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 xl:pr-2 pb-32 custom-scrollbar">
        <DetailedOutlineStageHeader
          onAIGenerate={() => void handleGenerateDetailedOutline()}
          busy={Boolean(generationStatus)}
        />

        <div className="max-w-4xl mb-6">
          <ProjectGenerationBanner status={generationStatus} />
        </div>

        <div className="max-w-4xl mb-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">
                这一页在做什么
              </p>
              <p className="text-sm font-black text-white/85">
                先把 10 集规划块拆成可直接写剧本的逐集细纲。
              </p>
              <p className="text-[11px] text-white/40 leading-relaxed">
                这一页只认逐集细纲本身。每一集单独编辑，不再做一层段落卡再套一层单集卡。
              </p>
            </div>
            <div className="hidden lg:flex flex-col items-end gap-2 text-right">
              <span className="text-[10px] uppercase tracking-widest text-white/20">当前进度</span>
              <span className="text-[12px] font-black text-orange-400">
                {filledCount}/{Math.max(totalEpisodes, 1)} 集已填充逐场
              </span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={async () => {
                if (!projectId) {
                  setGenerationNotice(
                    createAuthorityFailureNotice({
                      type: 'authority_failure',
                      failureType: 'project_missing',
                      code: 'AUTHORITY_FAILURE_PROJECT_MISSING',
                      message: 'No active project',
                      context: {
                        fact: 'project',
                        stage: 'detailed_outline',
                        projectId: undefined,
                        source: 'renderer',
                        traceId: undefined
                      },
                      recoverability: 'refresh_project',
                      recoverable: true,
                      noticeKey: 'authority.project_missing',
                      occurredAt: new Date().toISOString()
                    })
                  )
                  return
                }
                try {
                  const result = await window.api.workspace.changeProjectStage({
                    projectId,
                    targetStage: 'outline'
                  })
                  if (result.project && result.payload && result.nextStage) {
                    hydrateStagePayload(result.payload)
                    applyStageTransition(result.nextStage, result.project)
                    return
                  }
                  if (!result.project) {
                    setGenerationNotice(
                      createAuthorityFailureNotice({
                        type: 'authority_failure',
                        failureType: 'project_missing',
                        code: 'AUTHORITY_FAILURE_PROJECT_MISSING',
                        message: 'Stage transition response missing project data',
                        context: {
                          fact: 'project',
                          stage: 'detailed_outline',
                          projectId: projectId ?? undefined,
                          source: 'renderer',
                          traceId: undefined
                        },
                        recoverability: 'refresh_project',
                        recoverable: true,
                        noticeKey: 'authority.project_missing',
                        occurredAt: new Date().toISOString()
                      })
                    )
                    return
                  }
                  throw new Error('Incomplete stage session result: payload or nextStage missing')
                } catch {
                  setGenerationNotice(
                    createAuthorityFailureNotice({
                      type: 'authority_failure',
                      failureType: 'ipc_failure',
                      code: 'AUTHORITY_FAILURE_IPC_FAILURE',
                      message: 'Stage transition IPC call failed',
                      context: {
                        fact: 'stage',
                        stage: 'detailed_outline',
                        projectId: projectId ?? undefined,
                        source: 'renderer',
                        traceId: undefined
                      },
                      recoverability: 'manual_retry',
                      recoverable: true,
                      noticeKey: 'authority.ipc_unavailable',
                      occurredAt: new Date().toISOString()
                    })
                  )
                }
              }}
              className="rounded-xl border border-white/10 px-4 py-2 text-[11px] font-black text-white/75 hover:text-white hover:bg-white/5 transition-colors"
            >
              回粗纲继续改
            </button>
            <button
              onClick={() => void handleGoToScriptStage()}
              disabled={checkingScriptGate}
              className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-[11px] font-black text-orange-300 hover:bg-orange-500/15 transition-colors"
            >
              {checkingScriptGate ? '正在核对剧本入口…' : '去剧本页查看状态'}
            </button>
          </div>
        </div>

        {!hasDetailedOutlineBlocks && !generationStatus && (
          <div className="max-w-4xl mb-6 rounded-2xl border border-orange-500/20 bg-orange-500/8 p-5">
            <p className="text-[10px] uppercase tracking-widest text-orange-300 font-black">
              正式详细大纲还没生成成功
            </p>
            <p className="mt-1 text-sm font-black text-white/90">
              你现在看到的如果只是下面那部分“规划块对照 /
              粗纲原句”，那只是参考底稿，不算正式详纲，剧本也不会放行。
            </p>
            <p className="mt-2 text-[11px] text-white/65">
              先点上面的“AI 帮我补这一版”，等逐集细纲真正生成出来，再往剧本页走。
            </p>
          </div>
        )}

        {hasDetailedOutlineBlocks && (
          <div className="max-w-4xl">
            <DetailedOutlineActsPanel
              acts={sectionInputs}
              downstreamLocked={Boolean(generationStatus)}
              onChange={setDetailedOutlineSectionSummary}
              onEpisodeChange={setDetailedOutlineEpisodeBeatSummary}
              onSceneBySceneChange={setDetailedOutlineEpisodeBeatSceneByScene}
            />
          </div>
        )}

        <div className="max-w-4xl mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">
                规划块对照
              </p>
              <p className="text-sm font-black text-white/85">
                下面先按块看，再按集核对，确保没有漏集、跳集或写偏。
              </p>
            </div>
            <span className="hidden lg:inline text-[10px] text-white/30">
              逐集细纲才是剧本唯一真源
            </span>
          </div>

          <div className="space-y-4">
            {detailedOutlineBlocks.map((block) => (
              <div
                key={block.blockNo}
                className="rounded-2xl border border-white/6 bg-black/10 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-[11px] font-black text-white/80">第 {block.blockNo} 块</p>
                  <span className="text-[10px] text-orange-300/80">
                    {blockLabels[block.blockNo] ||
                      formatEpisodeRange(block.startEpisode, block.endEpisode)}
                  </span>
                </div>
                <p className="text-[12px] text-white/55 leading-relaxed">{block.summary}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-3 mt-4">
            {outlineEpisodes.map((episode) => (
              <div
                key={episode.episodeNo}
                className="rounded-2xl border border-white/6 bg-black/10 px-4 py-4"
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <p className="text-[11px] font-black text-white/80">第 {episode.episodeNo} 集</p>
                  <span className="text-[10px] text-white/25">粗纲原句</span>
                </div>
                <p className="text-[12px] text-white/55 leading-relaxed">
                  {episode.summary || '这一集在粗纲里还是空白，当前应显示为待补而不是从 UI 消失。'}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
