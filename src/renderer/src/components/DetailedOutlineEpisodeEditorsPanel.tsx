import { AutoGrowTextarea } from './AutoGrowTextarea'
import type { DetailedOutlineStageViewModel } from '../features/detailed-outline/model/build-detailed-outline-view-model'

interface DetailedOutlineEpisodeEditorsPanelProps {
  episodes: DetailedOutlineStageViewModel['episodeEditors']
  downstreamLocked: boolean
  onEpisodeChange: (
    actKey: DetailedOutlineStageViewModel['episodeEditors'][number]['actKey'],
    episodeNo: number,
    value: string
  ) => void
}

export function DetailedOutlineEpisodeEditorsPanel(
  props: DetailedOutlineEpisodeEditorsPanelProps
): JSX.Element {
  const { episodes, downstreamLocked, onEpisodeChange } = props

  return (
    <div className="space-y-4">
      {episodes.map((episode) => (
        <div
          key={episode.episodeNo}
          className="rounded-2xl border border-white/8 bg-white/[0.02] p-5 space-y-3"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[12px] font-black text-white/90">第 {episode.episodeNo} 集</p>
                <span className="rounded-full border border-orange-500/20 bg-orange-500/10 px-2 py-1 text-[10px] font-black text-orange-300">
                  {episode.actLabel}
                </span>
              </div>
              <p className="text-[11px] text-white/40 leading-relaxed">
                把这一集具体怎么推、压强怎么升级、结尾挂什么写清楚。
              </p>
              {episode.segmentContent.trim() && (
                <p className="text-[10px] text-white/30 leading-relaxed">
                  阶段参考：{episode.segmentContent}
                </p>
              )}
            </div>
          </div>

          {episode.sceneByScene.length > 0 && (
            <div className="space-y-3">
              {episode.sceneByScene.map((scene) => (
                <div
                  key={`${episode.episodeNo}-${scene.sceneNo ?? 'scene'}`}
                  className="rounded-2xl border border-white/6 bg-black/15 px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-[11px] font-black text-white/80">
                      第 {scene.sceneNo ?? 0} 场
                    </p>
                    <span className="text-[10px] text-white/30">
                      {[scene.location, scene.timeOfDay].filter(Boolean).join(' / ') || '场景待补'}
                    </span>
                  </div>
                  <div className="space-y-2 text-[11px] leading-relaxed text-white/60">
                    {scene.setup && (
                      <p>
                        <span className="text-white/40">起手：</span>
                        {scene.setup}
                      </p>
                    )}
                    {scene.tension && (
                      <p>
                        <span className="text-white/40">压强：</span>
                        {scene.tension}
                      </p>
                    )}
                    {scene.hookEnd && (
                      <p>
                        <span className="text-white/40">场尾钩：</span>
                        {scene.hookEnd}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <AutoGrowTextarea
            value={episode.summary}
            onChange={(value) => onEpisodeChange(episode.actKey, episode.episodeNo, value)}
            disabled={downstreamLocked}
            placeholder="把这一集最具体的推进动作、压强变化、代价和钩子写清楚。"
          />
        </div>
      ))}
    </div>
  )
}
