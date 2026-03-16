import type { OutlineDraftDto } from '../../../../../shared/contracts/workflow'
import { getConfirmedFormalFacts } from '../../../../../shared/domain/formal-fact/selectors'

export function ConfirmedFormalFactsPanel(input: {
  outline: OutlineDraftDto
  title: string
  description: string
  emptyMessage: string
}) {
  const facts = getConfirmedFormalFacts(input.outline)

  return (
    <div className="rounded-2xl border border-white/10 bg-white/3 px-5 py-4 space-y-3">
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-widest text-white/20 font-bold">{input.title}</p>
        <p className="text-[11px] text-white/45 leading-relaxed">{input.description}</p>
      </div>

      {facts.length === 0 ? (
        <p className="text-[11px] text-yellow-200/60">{input.emptyMessage}</p>
      ) : (
        <div className="space-y-2">
          {facts.map((fact) => (
            <div key={fact.id} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-bold text-white/85">{fact.label}</p>
                <span className="text-[10px] text-emerald-300/70 uppercase tracking-widest">confirmed</span>
              </div>
              <p className="mt-1 text-[11px] text-white/50 leading-relaxed">{fact.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
