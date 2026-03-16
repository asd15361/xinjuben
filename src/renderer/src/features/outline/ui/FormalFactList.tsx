import type { FormalFact } from '../../../../../shared/contracts/workflow'

export function FormalFactList(input: {
  facts: FormalFact[]
  onConfirm: (factId: string) => void
  onRemove: (factId: string) => void
}) {
  if (input.facts.length === 0) {
    return null
  }

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">已声明正式事实</p>
      {input.facts.map((fact) => (
        <div
          key={fact.id}
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 flex items-start justify-between gap-3"
        >
          <div className="space-y-1">
            <p className="text-sm font-bold text-white/80">
              {fact.label} <span className="text-[10px] text-white/35">[{fact.level}] [{fact.status}]</span>
            </p>
            <p className="text-[11px] text-white/45">{fact.description}</p>
            <p className="text-[10px] text-white/25">
              {fact.authorityType} / {fact.declaredBy} / {fact.declaredStage}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {fact.status !== 'confirmed' && (
              <button
                onClick={() => input.onConfirm(fact.id)}
                className="text-[11px] text-emerald-300/80 hover:text-emerald-200"
              >
                确认
              </button>
            )}
            <button
              onClick={() => input.onRemove(fact.id)}
              className="text-[11px] text-red-300/80 hover:text-red-200"
            >
              删除
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
