import type { ProjectGenerationStatusDto } from '../../../shared/contracts/generation'
import { useProjectGenerationProgress } from '../app/hooks/useProjectGenerationProgress'

export function ProjectGenerationBanner(props: { status: ProjectGenerationStatusDto | null }) {
  const { progressPercent, remainingSeconds } = useProjectGenerationProgress(props.status)

  if (!props.status) return null

  return (
    <div className="rounded-2xl border border-orange-500/20 bg-orange-500/8 px-4 py-3 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] text-orange-300 font-black uppercase tracking-widest">{props.status.title}</p>
        <p className="text-[10px] text-white/55">{progressPercent}%</p>
      </div>
      <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
        <div className="h-full rounded-full bg-orange-500 transition-all duration-1000" style={{ width: `${progressPercent}%` }} />
      </div>
      <div className="flex items-center justify-between gap-3 text-[11px]">
        <div className="space-y-1">
          <p className="text-white/70">{props.status.detail}</p>
          {props.status.autoChain && props.status.nextTask && (
            <p className="text-[10px] text-orange-200/70">这一段结束后，会自动继续推进下一步。</p>
          )}
        </div>
        <p className="shrink-0 text-orange-300/85 font-bold">预计还要 {remainingSeconds} 秒</p>
      </div>
    </div>
  )
}
