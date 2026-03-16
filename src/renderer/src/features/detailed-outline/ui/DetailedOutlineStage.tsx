import { useStageStore } from '../../../store/useStageStore'
import { ProjectGenerationBanner } from '../../../components/ProjectGenerationBanner'
import { DetailedOutlineStageHeader } from '../../../components/DetailedOutlineStageHeader'
import { DetailedOutlineActsPanel } from '../../../components/DetailedOutlineActsPanel'
import { useDetailedOutlineStageActions } from './useDetailedOutlineStageActions'
import { buildFourActEpisodeRanges, resolveProjectEpisodeCount } from '../../../../../shared/domain/workflow/episode-count'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'

function formatEpisodeRange(startEpisode: number, endEpisode: number): string {
  return startEpisode === endEpisode ? `${startEpisode}集` : `${startEpisode}-${endEpisode}集`
}

export function DetailedOutlineStage() {
  const segments = useStageStore((s) => s.segments)
  const setSegment = useStageStore((s) => s.setSegment)
  const outline = useStageStore((s) => s.outline)
  const storyIntent = useWorkflowStore((s) => s.storyIntent)
  const filledCount = segments.filter((segment) => segment.content.trim()).length
  const { generationStatus, handleGenerateDetailedOutline } = useDetailedOutlineStageActions()
  const totalEpisodes = resolveProjectEpisodeCount({ outline, storyIntent })
  const ranges = buildFourActEpisodeRanges(totalEpisodes)
  const acts = [
    { key: 'opening' as const, label: `第一阶段：起（${formatEpisodeRange(ranges[0].startEpisode, ranges[0].endEpisode)}）`, hint: '先把人物入局、第一轮压强和点火动作钉住' },
    { key: 'midpoint' as const, label: `第二阶段：承（${formatEpisodeRange(ranges[1].startEpisode, ranges[1].endEpisode)}）`, hint: '让局面持续升级，把人一步步逼进更窄的选择里' },
    { key: 'climax' as const, label: `第三阶段：转（${formatEpisodeRange(ranges[2].startEpisode, ranges[2].endEpisode)}）`, hint: '把底牌、误判和最痛的代价一起逼到台前' },
    { key: 'ending' as const, label: `第四阶段：合（${formatEpisodeRange(ranges[3].startEpisode, ranges[3].endEpisode)}）`, hint: '先把这一轮真正收住，再把下一轮余波轻轻挂出去' }
  ]

  const actValues = {
    opening: segments.find((s) => s.act === 'opening')?.content ?? '',
    midpoint: segments.find((s) => s.act === 'midpoint')?.content ?? '',
    climax: segments.find((s) => s.act === 'climax')?.content ?? '',
    ending: segments.find((s) => s.act === 'ending')?.content ?? ''
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
              <p className="text-sm font-black text-white/85">把粗纲变成真正能往下写剧本的推进图。</p>
              <p className="text-[11px] text-white/40 leading-relaxed">
                这里先不追求字多，而是把每个大阶段的压力、翻面和收尾钩子排清楚。排顺了，后面剧本才不会乱。
              </p>
            </div>
            <div className="hidden lg:flex flex-col items-end gap-2 text-right">
              <span className="text-[10px] uppercase tracking-widest text-white/20">当前进度</span>
              <span className="text-[12px] font-black text-orange-400">{filledCount}/4 已写</span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl">
          <DetailedOutlineActsPanel acts={acts} values={actValues} downstreamLocked={Boolean(generationStatus)} onChange={setSegment} />
        </div>
      </div>
    </div>
  )
}
