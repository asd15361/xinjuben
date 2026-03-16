import { useStageStore } from '../../../store/useStageStore'
import { ProjectGenerationBanner } from '../../../components/ProjectGenerationBanner'
import { DetailedOutlineStageHeader } from '../../../components/DetailedOutlineStageHeader'
import { DetailedOutlineActsPanel } from '../../../components/DetailedOutlineActsPanel'
import { useDetailedOutlineStageActions } from './useDetailedOutlineStageActions'
import { buildFourActEpisodeRanges, resolveProjectEpisodeCount } from '../../../../../shared/domain/workflow/episode-count'
import { ensureOutlineEpisodeShape } from '../../../../../shared/domain/workflow/outline-episodes'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'

function formatEpisodeRange(startEpisode: number, endEpisode: number): string {
  return startEpisode === endEpisode ? `${startEpisode}集` : `${startEpisode}-${endEpisode}集`
}

export function DetailedOutlineStage() {
  const segments = useStageStore((s) => s.segments)
  const setSegment = useStageStore((s) => s.setSegment)
  const setSegmentEpisodeBeat = useStageStore((s) => s.setSegmentEpisodeBeat)
  const outline = useStageStore((s) => s.outline)
  const setStage = useWorkflowStore((s) => s.setStage)
  const storyIntent = useWorkflowStore((s) => s.storyIntent)
  const filledCount = segments.filter((segment) => segment.content.trim()).length
  const { generationStatus, handleGenerateDetailedOutline } = useDetailedOutlineStageActions()
  const totalEpisodes = resolveProjectEpisodeCount({ outline, storyIntent })
  const outlineEpisodes = ensureOutlineEpisodeShape(outline).summaryEpisodes.filter((episode) => episode.summary.trim())
  const ranges = buildFourActEpisodeRanges(totalEpisodes)
  const acts = [
    { key: 'opening' as const, label: `第一阶段：起（${formatEpisodeRange(ranges[0].startEpisode, ranges[0].endEpisode)}）`, hint: '先把人物入局、第一轮压强和点火动作钉住', startEpisode: ranges[0].startEpisode, endEpisode: ranges[0].endEpisode },
    { key: 'midpoint' as const, label: `第二阶段：承（${formatEpisodeRange(ranges[1].startEpisode, ranges[1].endEpisode)}）`, hint: '让局面持续升级，把人一步步逼进更窄的选择里', startEpisode: ranges[1].startEpisode, endEpisode: ranges[1].endEpisode },
    { key: 'climax' as const, label: `第三阶段：转（${formatEpisodeRange(ranges[2].startEpisode, ranges[2].endEpisode)}）`, hint: '把底牌、误判和最痛的代价一起逼到台前', startEpisode: ranges[2].startEpisode, endEpisode: ranges[2].endEpisode },
    { key: 'ending' as const, label: `第四阶段：合（${formatEpisodeRange(ranges[3].startEpisode, ranges[3].endEpisode)}）`, hint: '先把这一轮真正收住，再把下一轮余波轻轻挂出去', startEpisode: ranges[3].startEpisode, endEpisode: ranges[3].endEpisode }
  ]

  function getActSegment(act: (typeof acts)[number]['key']) {
    return segments.find((segment) => segment.act === act)
  }

  function getActEpisodes(startEpisode: number, endEpisode: number, act: (typeof acts)[number]['key']) {
    return outlineEpisodes
      .filter((episode) => episode.episodeNo >= startEpisode && episode.episodeNo <= endEpisode)
      .map((episode) => ({
        episodeNo: episode.episodeNo,
        summary: getActSegment(act)?.episodeBeats?.find((beat) => beat.episodeNo === episode.episodeNo)?.summary ?? ''
      }))
  }

  const actValues = {
    opening: {
      summary: getActSegment('opening')?.content ?? '',
      episodes: getActEpisodes(ranges[0].startEpisode, ranges[0].endEpisode, 'opening')
    },
    midpoint: {
      summary: getActSegment('midpoint')?.content ?? '',
      episodes: getActEpisodes(ranges[1].startEpisode, ranges[1].endEpisode, 'midpoint')
    },
    climax: {
      summary: getActSegment('climax')?.content ?? '',
      episodes: getActEpisodes(ranges[2].startEpisode, ranges[2].endEpisode, 'climax')
    },
    ending: {
      summary: getActSegment('ending')?.content ?? '',
      episodes: getActEpisodes(ranges[3].startEpisode, ranges[3].endEpisode, 'ending')
    }
  } as const

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 xl:pr-2 pb-32 custom-scrollbar">
        <DetailedOutlineStageHeader onAIGenerate={() => void handleGenerateDetailedOutline()} busy={Boolean(generationStatus)} />

        <div className="max-w-4xl mb-6">
          <ProjectGenerationBanner status={generationStatus} />
        </div>

        <div className="max-w-4xl mb-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">这一页在做什么</p>
              <p className="text-sm font-black text-white/85">先把粗纲往前推进成可写剧本的详细作战图。</p>
              <p className="text-[11px] text-white/40 leading-relaxed">
                这一页先把每个阶段的压力、翻面和收尾钩子排清楚，再对照下面的分集粗纲逐集检查。这样用户不会只看到四段大话，却不知道每一集归哪一段。
              </p>
            </div>
            <div className="hidden lg:flex flex-col items-end gap-2 text-right">
              <span className="text-[10px] uppercase tracking-widest text-white/20">当前进度</span>
              <span className="text-[12px] font-black text-orange-400">{filledCount}/4 已写</span>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setStage('outline')}
              className="rounded-xl border border-white/10 px-4 py-2 text-[11px] font-black text-white/75 hover:text-white hover:bg-white/5 transition-colors"
            >
              回粗纲继续改
            </button>
            <button
              onClick={() => setStage('script')}
              className="rounded-xl border border-orange-500/20 bg-orange-500/10 px-4 py-2 text-[11px] font-black text-orange-300 hover:bg-orange-500/15 transition-colors"
            >
              详纲确认后去剧本
            </button>
          </div>
        </div>

        {filledCount === 0 && !generationStatus && (
          <div className="max-w-4xl mb-6 rounded-2xl border border-orange-500/20 bg-orange-500/8 p-5">
            <p className="text-[10px] uppercase tracking-widest text-orange-300 font-black">还没开始生成详细大纲</p>
            <p className="mt-1 text-sm font-black text-white/90">先点上面的“AI 帮我补这一版”，生成完成后会直接在这里显示。</p>
            <p className="mt-2 text-[11px] text-white/65">如果你想先改每一集的骨架，可以先回粗纲页把分集剧情钉稳，再回来生成。</p>
          </div>
        )}

        <div className="max-w-4xl">
          <DetailedOutlineActsPanel
            acts={acts}
            values={actValues}
            downstreamLocked={Boolean(generationStatus)}
            onChange={setSegment}
            onEpisodeChange={setSegmentEpisodeBeat}
          />
        </div>

        <div className="max-w-4xl mt-6 rounded-2xl border border-white/8 bg-white/[0.02] p-5">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-widest text-white/25 font-bold">分集对照</p>
              <p className="text-sm font-black text-white/85">下面这排是粗纲里的分集内容，用来对照详纲有没有漏集、跳集或挤成一团。</p>
            </div>
            <span className="hidden lg:inline text-[10px] text-white/30">按集核对，不要只看阶段标题</span>
          </div>
          <div className="grid grid-cols-1 gap-3">
            {outlineEpisodes.map((episode) => {
              const matchedRange = ranges.find(
                (range) => episode.episodeNo >= range.startEpisode && episode.episodeNo <= range.endEpisode
              )
              return (
                <div key={episode.episodeNo} className="rounded-2xl border border-white/6 bg-black/10 px-4 py-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <p className="text-[11px] font-black text-white/80">第 {episode.episodeNo} 集</p>
                    <span className="text-[10px] text-orange-300/80">
                      {matchedRange ? `对应 ${formatEpisodeRange(matchedRange.startEpisode, matchedRange.endEpisode)}` : '待分配'}
                    </span>
                  </div>
                  <p className="text-[12px] text-white/55 leading-relaxed">{episode.summary}</p>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
