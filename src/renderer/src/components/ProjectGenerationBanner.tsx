import type { ProjectGenerationStatusDto } from '../../../shared/contracts/generation'
import { switchStageSession } from '../app/services/stage-session-service'
import { useWorkflowStore } from '../app/store/useWorkflowStore'
import { useProjectGenerationProgress } from '../app/hooks/useProjectGenerationProgress'

export function ProjectGenerationBanner(props: {
  status: ProjectGenerationStatusDto | null
}): JSX.Element | null {
  const notice = useWorkflowStore((state) => state.generationNotice)
  const projectId = useWorkflowStore((state) => state.projectId)
  const clearGenerationNotice = useWorkflowStore((state) => state.clearGenerationNotice)
  const { elapsedSeconds, estimatedSeconds, progressPercent } = useProjectGenerationProgress(
    props.status
  )

  async function handleSwitch(
    stage: NonNullable<NonNullable<typeof notice>['primaryAction']>['stage']
  ): Promise<void> {
    clearGenerationNotice()
    if (!projectId) return
    const result = await switchStageSession(projectId, stage)
    if (!result) {
      return
    }
  }

  if (!props.status && !notice) return null

  if (props.status) {
    return (
      <div className="rounded-2xl border border-orange-500/20 bg-orange-500/8 px-4 py-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] text-orange-300 font-black uppercase tracking-widest">
              {props.status.title}
            </p>
            <p className="text-sm font-black text-white/90">这一步还在处理中，请先别切来切去。</p>
          </div>
          <p className="shrink-0 text-[11px] text-orange-200/85 font-bold">
            已处理 {elapsedSeconds}/{estimatedSeconds} 秒 · {progressPercent}%
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-500 transition-[width] duration-700"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[11px] text-white/70 leading-relaxed">{props.status.detail}</p>
      </div>
    )
  }

  const toneClass =
    notice?.kind === 'success'
      ? 'border-emerald-500/20 bg-emerald-500/10'
      : 'border-rose-500/20 bg-rose-500/10'
  const eyebrowClass = notice?.kind === 'success' ? 'text-emerald-300' : 'text-rose-300'
  const buttonClass =
    notice?.kind === 'success'
      ? 'bg-emerald-300 text-[#062b1c] hover:bg-emerald-200'
      : 'bg-rose-300 text-[#30070f] hover:bg-rose-200'

  return (
    <div className={`rounded-2xl px-4 py-4 space-y-3 border ${toneClass}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className={`text-[10px] font-black uppercase tracking-widest ${eyebrowClass}`}>
            {notice?.kind === 'success' ? '这一步已经完成' : '这一步没有成功'}
          </p>
          <p className="text-sm font-black text-white/90">{notice?.title}</p>
        </div>
        <button
          onClick={() => clearGenerationNotice()}
          className="shrink-0 rounded-full border border-white/10 px-3 py-1 text-[10px] font-bold text-white/55 hover:text-white hover:bg-white/5 transition-colors"
        >
          关闭
        </button>
      </div>
      <p className="text-[11px] text-white/70 leading-relaxed">{notice?.detail}</p>
      <div className="flex flex-wrap items-center gap-2">
        {notice?.primaryAction && (
          <button
            onClick={() => {
              void handleSwitch(notice.primaryAction!.stage)
            }}
            className={`rounded-xl px-4 py-2 text-[11px] font-black transition-colors ${buttonClass}`}
          >
            {notice.primaryAction.label}
          </button>
        )}
        {notice?.secondaryAction && (
          <button
            onClick={() => {
              void handleSwitch(notice.secondaryAction!.stage)
            }}
            className="rounded-xl border border-white/10 px-4 py-2 text-[11px] font-black text-white/75 hover:text-white hover:bg-white/5 transition-colors"
          >
            {notice.secondaryAction.label}
          </button>
        )}
      </div>
    </div>
  )
}
