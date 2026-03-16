import type { FormalFact } from '../../../../../shared/contracts/workflow'

function getFactLevelLabel(level: FormalFact['level']): string {
  return level === 'core' ? '核心设定' : '补充设定'
}

function getFactStatusLabel(status: FormalFact['status']): string {
  return status === 'confirmed' ? '已确认' : '待确认'
}

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
      <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">已添加的关键设定</p>
      {input.facts.map((fact) => (
        <div
          key={fact.id}
          className="rounded-xl border border-white/10 bg-black/20 px-4 py-3 flex items-start justify-between gap-3"
        >
          <div className="space-y-1">
            <p className="text-sm font-bold text-white/80">
              {fact.label}{' '}
              <span className="text-[10px] text-white/35">
                [{getFactLevelLabel(fact.level)}] [{getFactStatusLabel(fact.status)}]
              </span>
            </p>
            <p className="text-[11px] text-white/45">{fact.description}</p>
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
