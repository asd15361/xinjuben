import { WorkspaceInput } from './WorkspaceCommons'

interface ActInputItem {
  key: 'opening' | 'midpoint' | 'climax' | 'ending'
  label: string
  hint: string
}

interface DetailedOutlineActsPanelProps {
  acts: ActInputItem[]
  values: Record<ActInputItem['key'], string>
  downstreamLocked: boolean
  onChange: (actKey: ActInputItem['key'], value: string) => void
}

export function DetailedOutlineActsPanel(props: DetailedOutlineActsPanelProps) {
  const { acts, values, downstreamLocked, onChange } = props

  return (
    <div className="space-y-5">
      {acts.map((act, index) => (
        <div key={act.key} className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-black text-orange-400">{index + 1}</span>
            </div>
            <div className="space-y-1">
              <p className="text-[12px] font-black text-white/85">{act.label}</p>
              <p className="text-[11px] text-white/40 leading-relaxed">{act.hint}</p>
              <p className="text-[10px] uppercase tracking-widest text-white/20">
                这里要写清楚：这一段主角先被什么逼，怎么升级，结尾留什么钩子。
              </p>
            </div>
          </div>

          <WorkspaceInput
            label="这一阶段的剧情推进"
            placeholder={act.hint}
            value={values[act.key]}
            onChange={(value) => onChange(act.key, value)}
            multiline
            rows={8}
            disabled={downstreamLocked}
          />
        </div>
      ))}
    </div>
  )
}
