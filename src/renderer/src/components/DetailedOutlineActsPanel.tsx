import { WorkspaceInput } from './WorkspaceCommons'

interface ActInputItem {
  key: 'opening' | 'midpoint' | 'climax' | 'ending'
  label: string
  hint: string
  startEpisode: number
  endEpisode: number
}

interface DetailedOutlineActsPanelProps {
  acts: ActInputItem[]
  values: Record<
    ActInputItem['key'],
    {
      summary: string
      episodes: Array<{ episodeNo: number; summary: string }>
    }
  >
  downstreamLocked: boolean
  onChange: (actKey: ActInputItem['key'], value: string) => void
  onEpisodeChange: (actKey: ActInputItem['key'], episodeNo: number, value: string) => void
}

export function DetailedOutlineActsPanel(props: DetailedOutlineActsPanelProps) {
  const { acts, values, downstreamLocked, onChange, onEpisodeChange } = props

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
            label="这一阶段在打什么仗"
            placeholder={act.hint}
            value={values[act.key].summary}
            onChange={(value) => onChange(act.key, value)}
            multiline
            rows={6}
            disabled={downstreamLocked}
          />

          <div className="rounded-2xl border border-white/6 bg-black/10 p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">逐集细纲</p>
                <p className="text-[11px] text-white/40 mt-1">把这一阶段拆到每一集。用户后面真正改的是这一层。</p>
              </div>
              <span className="text-[10px] text-orange-300/80">
                第 {act.startEpisode}{act.startEpisode === act.endEpisode ? '' : `-${act.endEpisode}`} 集
              </span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {values[act.key].episodes.map((episode) => (
                <div key={`${act.key}-${episode.episodeNo}`} className="rounded-xl border border-white/6 bg-white/[0.02] p-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-[11px] font-black text-white/80">第 {episode.episodeNo} 集</p>
                    <span className="text-[10px] text-white/25">这集具体怎么推，结尾挂什么</span>
                  </div>
                  <textarea
                    value={episode.summary}
                    onChange={(event) => onEpisodeChange(act.key, episode.episodeNo, event.target.value)}
                    disabled={downstreamLocked}
                    rows={4}
                    className="w-full resize-y rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-[12px] leading-relaxed text-white/75 outline-none focus:border-orange-500/30 focus:text-white/90 disabled:opacity-60"
                    placeholder="把这一集最具体的推进动作、压强变化、代价和钩子写清楚。"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
