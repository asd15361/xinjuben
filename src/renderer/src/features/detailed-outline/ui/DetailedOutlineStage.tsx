import { switchStageSession } from '../../../app/services/stage-session-service'
import { useStageStore } from '../../../store/useStageStore'
import { ProjectGenerationBanner } from '../../../components/ProjectGenerationBanner'
import { DetailedOutlineStageHeader } from '../../../components/DetailedOutlineStageHeader'
import { DetailedOutlineEpisodeEditorsPanel } from '../../../components/DetailedOutlineEpisodeEditorsPanel'
import { useState, useMemo } from 'react'
import { useDetailedOutlineStageActions } from './useDetailedOutlineStageActions.ts'
import { ensureOutlineEpisodeShape } from '../../../../../shared/domain/workflow/outline-episodes.ts'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { createAuthorityFailureNotice } from '../../../app/utils/authority-failure-notice'
import { buildDetailedOutlineStageViewModel } from '../model/build-detailed-outline-view-model.ts'
import { useProjectStageExport } from '../../../app/hooks/useProjectStageExport.ts'
import { resolveDetailedOutlineEntryBlock } from './detailed-outline-entry-guard.ts'
import { buildDetailedOutlineFailureNotice } from './detailed-outline-generation-notice.ts'
import { getDetailedOutlineGenerationActionLabel } from './detailed-outline-stage-label.ts'

export function DetailedOutlineStage() {
  const segments = useStageStore((s) => s.segments)
  const setSegmentEpisodeBeat = useStageStore((s) => s.setSegmentEpisodeBeat)
  const outline = useStageStore((s) => s.outline)
  const characters = useStageStore((s) => s.characters)
  const projectId = useWorkflowStore((s) => s.projectId)
  const setGenerationNotice = useWorkflowStore((s) => s.setGenerationNotice)
  const exportStage = useProjectStageExport()
  const { generationStatus, generationBusy, handleGenerateDetailedOutline } =
    useDetailedOutlineStageActions()
  const [checkingScriptGate, setCheckingScriptGate] = useState(false)
  const normalizedOutline = useMemo(() => ensureOutlineEpisodeShape(outline), [outline])
  const hasDetailedOutlineBlocks = segments.length > 0
  const stageViewModel = useMemo(
    () => buildDetailedOutlineStageViewModel(normalizedOutline, segments),
    [normalizedOutline, segments]
  )
  const { totalEpisodes, filledCount, episodeEditors } = stageViewModel
  const outlineEpisodes = normalizedOutline.summaryEpisodes
  const entryBlockCode = useMemo(
    () => resolveDetailedOutlineEntryBlock({ outline: normalizedOutline, characters }),
    [characters, normalizedOutline]
  )
  const entryBlockNotice = useMemo(
    () => (entryBlockCode ? buildDetailedOutlineFailureNotice(entryBlockCode) : null),
    [entryBlockCode]
  )

  const handleSwitchToStage = async (
    targetStage: 'outline' | 'character' | 'detailed_outline' | 'script'
  ) => {
    if (!projectId) return

    try {
      const result = await switchStageSession(projectId, targetStage)
      if (!result) {
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
      }
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
  }

  const handleGoToScriptStage = async (): Promise<void> => {
    if (!projectId) return

    setCheckingScriptGate(true)
    try {
      await handleSwitchToStage('script')
    } finally {
      setCheckingScriptGate(false)
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 xl:pr-2 pb-32 custom-scrollbar">
        <DetailedOutlineStageHeader
          onAIGenerate={() => void handleGenerateDetailedOutline()}
          onExport={() => {
            void exportStage('detailed_outline')
          }}
          busy={generationBusy}
          aiGenerateLabel={getDetailedOutlineGenerationActionLabel(hasDetailedOutlineBlocks)}
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
                先把当前粗纲拆成可直接写剧本的逐集细纲。
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
              onClick={() => {
                void handleSwitchToStage('outline')
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
              {checkingScriptGate ? '正在打开剧本页…' : '去剧本页继续写'}
            </button>
          </div>
        </div>

        {!hasDetailedOutlineBlocks && !generationStatus && (
          <>
            {entryBlockNotice ? (
              <div className="max-w-4xl mb-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5">
                <p className="text-[10px] uppercase tracking-widest text-rose-300 font-black">
                  还不能直接生成详细大纲
                </p>
                <p className="mt-1 text-sm font-black text-white/90">{entryBlockNotice.title}</p>
                <p className="mt-2 text-[11px] text-white/70 leading-relaxed">
                  {entryBlockNotice.detail}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {entryBlockNotice.primaryAction && (
                    <button
                      onClick={() => {
                        void handleSwitchToStage(
                          entryBlockNotice.primaryAction!.stage as 'outline' | 'character'
                        )
                      }}
                      className="rounded-xl bg-rose-300 px-4 py-2 text-[11px] font-black text-[#30070f] hover:bg-rose-200 transition-colors"
                    >
                      {entryBlockNotice.primaryAction.label}
                    </button>
                  )}
                  <button
                    onClick={() => {
                      void handleSwitchToStage('detailed_outline')
                    }}
                    className="rounded-xl border border-white/10 px-4 py-2 text-[11px] font-black text-white/75 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    留在详细大纲页
                  </button>
                </div>
              </div>
            ) : (
              <div className="max-w-4xl mb-6 rounded-2xl border border-orange-500/20 bg-orange-500/8 p-5">
                <p className="text-[10px] uppercase tracking-widest text-orange-300 font-black">
                  正式详细大纲还没生成成功
                </p>
                <p className="mt-1 text-sm font-black text-white/90">
                  你现在看到的如果只是下面那部分“规划块对照 / 粗纲原句”，那只是参考底稿，不算正式详纲。
                </p>
                <p className="mt-2 text-[11px] text-white/65">
                  先点上面的“AI 帮我补这一版”，等逐集细纲真正生成出来，再往剧本页走。
                </p>
              </div>
            )}
          </>
        )}

        {hasDetailedOutlineBlocks && (
          <div className="max-w-4xl">
            <DetailedOutlineEpisodeEditorsPanel
              episodes={episodeEditors}
              downstreamLocked={Boolean(generationStatus)}
              onEpisodeChange={setSegmentEpisodeBeat}
            />
          </div>
        )}

        <div className="max-w-4xl mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">
                逐集粗纲对照
              </p>
              <p className="text-sm font-black text-white/85">
                这里按集核对粗纲原句，避免逐集细纲写着写着丢集、跳集或写偏。
              </p>
            </div>
            <span className="hidden lg:inline text-[10px] text-white/30">
              主编辑真相只保留逐集一层
            </span>
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
