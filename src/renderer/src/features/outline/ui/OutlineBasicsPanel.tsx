import type { ChangeEvent } from 'react'
import { WorkspaceInput } from '../../../components/WorkspaceCommons'
import type { OutlineDraftDto } from '../../../../../shared/contracts/workflow'
import {
  ensureOutlineEpisodeShape,
  normalizeOutlineEpisodes,
  outlineEpisodesToSummary
} from '../../../../../shared/domain/workflow/outline-episodes'

function syncTextareaHeight(
  event:
    | Pick<ChangeEvent<HTMLTextAreaElement>, 'currentTarget'>
    | { currentTarget: HTMLTextAreaElement }
): void {
  const target = event.currentTarget
  target.style.height = '0px'
  target.style.height = `${target.scrollHeight}px`
}

export function OutlineBasicsPanel(input: {
  outline: OutlineDraftDto
  onChange: (data: Partial<OutlineDraftDto>) => void
}): JSX.Element {
  const { outline, onChange } = input
  const normalizedOutline = ensureOutlineEpisodeShape(outline)
  const episodes = normalizedOutline.summaryEpisodes.map((episode, idx) => ({
    key: `episode-${episode.episodeNo}`,
    index: idx,
    episodeNo: episode.episodeNo,
    content: episode.summary
  }))

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">
              这一页在做什么
            </p>
            <p className="text-sm font-black text-white/85">先把戏的骨架钉住，再进人物。</p>
            <p className="text-[11px] text-white/40 leading-relaxed">
              你现在先不用追求很细，只要把每一集的大事、冲突和结尾钩子说清楚，后面的人物和详纲才有东西可接。
            </p>
          </div>
          <div className="hidden lg:flex flex-col items-end gap-2 text-right">
            <span className="text-[10px] uppercase tracking-widest text-white/20">工作方式</span>
            <span className="text-[12px] font-black text-orange-400">按集修改</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WorkspaceInput
          label="剧本名称"
          placeholder="暂定个响亮的题目"
          value={outline.title}
          onChange={(value) => onChange({ title: value })}
        />
        <WorkspaceInput
          label="题材类型"
          placeholder="例如：都市、悬疑、甜宠等"
          value={outline.genre}
          onChange={(value) => onChange({ genre: value })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WorkspaceInput
          label="核心主题"
          placeholder="故事想要传达的灵魂或深层意义"
          value={outline.theme}
          onChange={(value) => onChange({ theme: value })}
        />
        <WorkspaceInput
          label="主角设定"
          placeholder="谁是主角？TA 有什么秘密或底牌？"
          value={outline.protagonist}
          onChange={(value) => onChange({ protagonist: value })}
        />
        <WorkspaceInput
          label="核心冲突"
          placeholder="谁在逼债？谁在复仇？矛盾点在哪里？"
          value={outline.mainConflict}
          onChange={(value) => onChange({ mainConflict: value })}
        />
      </div>

      {/* 分集窗口展示 */}
      <div className="pt-8 border-t border-white/[0.05]">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
          <h3 className="text-sm font-black text-white/90 uppercase tracking-widest">
            分集剧情视窗
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {episodes.length > 0 ? (
            episodes.map((episode) => {
              return (
                <div
                  key={episode.key}
                  className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-5 hover:border-orange-500/30 transition-all"
                >
                  <div className="flex gap-4">
                    <div className="shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                        <span className="text-xs font-black text-orange-400">
                          {episode.episodeNo}
                        </span>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="text-[11px] font-black text-white/30 uppercase tracking-tighter">
                          {`第 ${episode.episodeNo} 集`}
                        </p>
                        <span className="text-[10px] text-white/20">
                          这一集发生什么，结尾挂什么
                        </span>
                      </div>
                      <textarea
                        className="w-full overflow-hidden bg-transparent text-[13px] text-white/70 leading-relaxed outline-none focus:text-white/90 transition-colors resize-none"
                        value={episode.content}
                        rows={3}
                        style={{ minHeight: '88px' }}
                        ref={(node) => {
                          if (node) syncTextareaHeight({ currentTarget: node })
                        }}
                        onChange={(e) => {
                          syncTextareaHeight(e)
                          const nextEpisodes = normalizeOutlineEpisodes(
                            episodes.map((current) => ({
                              episodeNo: current.episodeNo,
                              summary:
                                current.episodeNo === episode.episodeNo
                                  ? e.target.value
                                  : current.content
                            })),
                            episodes.length
                          )
                          onChange({
                            summaryEpisodes: nextEpisodes,
                            summary: outlineEpisodesToSummary(nextEpisodes)
                          })
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })
          ) : (
            <WorkspaceInput
              label="剧情大纲（暂无分集数据，请重新生成或手动录入）"
              placeholder="第1集... 第2集..."
              value={outline.summary}
              onChange={(value) => {
                const fallbackOutline = ensureOutlineEpisodeShape({ ...outline, summary: value })
                onChange({
                  summary: fallbackOutline.summary,
                  summaryEpisodes: fallbackOutline.summaryEpisodes
                })
              }}
              multiline
              rows={10}
            />
          )}
        </div>
      </div>
    </div>
  )
}
