import type { OutlineDraftDto } from '../../../../../shared/contracts/workflow'
import { getConfirmedFormalFacts } from '../../../../../shared/domain/formal-fact/selectors'

interface DownstreamFactAnchorPanelProps {
  outline: OutlineDraftDto
  stageLabel: string
  title: string
  description: string
  emptyMessage: string
  usageRules: string[]
}

export function DownstreamFactAnchorPanel(props: DownstreamFactAnchorPanelProps) {
  const facts = getConfirmedFormalFacts(props.outline)
  const locked = facts.length === 0

  return (
    <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.06),rgba(16,16,16,0.32))] px-5 py-5 space-y-4">
      <div className="space-y-2">
        <p className="text-[10px] uppercase tracking-[0.32em] text-white/25 font-bold">已确认的核心设定</p>
        <p className="text-[13px] text-white/78 leading-relaxed">
          你现在在 <span className="font-black text-white">{props.stageLabel}</span>。
          这一页只负责把前面定下来的内容继续写实，不在这里临时改根。
        </p>
        <p className="text-[11px] text-white/45 leading-relaxed">{props.description}</p>
      </div>

      <div className="grid gap-3 2xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.9fr)]">
        <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-bold text-white/80">{props.title}</p>
            <span className="text-[10px] uppercase tracking-[0.24em] text-emerald-300/80">
              已确认 {facts.length} 条
            </span>
          </div>

          {locked ? (
            <p className="text-[11px] text-yellow-200/75 leading-relaxed">{props.emptyMessage}</p>
          ) : (
            <div className="space-y-2">
              {facts.map((fact) => (
                <div key={fact.id} className="rounded-xl border border-emerald-400/15 bg-emerald-400/6 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-bold text-white/90">{fact.label}</p>
                    <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">已确认</span>
                  </div>
                  <p className="mt-1 text-[11px] text-white/55 leading-relaxed">{fact.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/4 px-4 py-4 space-y-3">
          <p className="text-[11px] font-bold text-white/80">这一页只能做什么</p>
          <div className="space-y-2">
            {props.usageRules.map((rule) => (
              <p key={rule} className="text-[11px] text-white/56 leading-relaxed">
                · {rule}
              </p>
            ))}
          </div>
          <div className={`rounded-xl border px-3 py-3 ${locked ? 'border-yellow-400/20 bg-yellow-500/8' : 'border-emerald-400/15 bg-emerald-500/8'}`}>
            <p className={`text-[10px] uppercase tracking-[0.22em] font-bold ${locked ? 'text-yellow-200/70' : 'text-emerald-300/75'}`}>
              {locked ? '先回粗纲补这一步' : '可以继续往下写'}
            </p>
            <p className={`mt-1 text-[11px] leading-relaxed ${locked ? 'text-yellow-100/72' : 'text-white/60'}`}>
              {locked
                ? '现在继续往下写，容易把根写乱。先把至少 1 条核心设定钉住，再继续会更稳。'
                : '继续编辑时，只把这些已经定下来的内容写进人物、推进和场景里。'}
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
