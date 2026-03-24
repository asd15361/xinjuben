import { Sparkles } from 'lucide-react'
import { switchStageSession } from '../../../app/services/stage-session-service'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { useStageStore } from '../../../store/useStageStore'
import { ensureOutlineEpisodeShape } from '../../../../../shared/domain/workflow/outline-episodes'
import { OutlineBasicsPanel } from './OutlineBasicsPanel'

export function OutlineStage() {
  const outline = useStageStore((state) => state.outline)
  const setOutline = useStageStore((state) => state.setOutline)
  const projectId = useWorkflowStore((state) => state.projectId)
  const episodeCount = ensureOutlineEpisodeShape(outline).summaryEpisodes.filter((episode) =>
    episode.summary.trim()
  ).length

  async function handleGoToCharacterStage(): Promise<void> {
    if (!projectId) return
    const result = await switchStageSession(projectId, 'character')
    if (!result) {
      return
    }
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto pr-1 xl:pr-2 space-y-8 pb-32 custom-scrollbar">
        <div className="flex items-center justify-between gap-4 border-b border-white/[0.05] pb-6 mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
              <Sparkles size={18} className="text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white/90">粗略大纲</h2>
              <p className="text-[11px] text-white/40 mt-0.5">
                先把故事主骨架立住。每一集先写清楚发生什么、冲突怎么抬、钩子落在哪。
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 rounded-xl border border-white/8 bg-white/[0.02] px-3 py-2">
              <span className="text-[10px] uppercase tracking-widest text-white/25 font-bold">
                当前粗纲
              </span>
              <span className="text-[12px] font-black text-orange-400">{episodeCount || 0} 集</span>
            </div>
            <button
              onClick={() => {
                void handleGoToCharacterStage()
              }}
              className="rounded-xl px-5 py-2.5 text-xs font-black text-[#050505] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/20"
              style={{ background: '#FF7A00' }}
            >
              确认：进入人物小传
            </button>
          </div>
        </div>

        <div className="max-w-4xl space-y-8">
          <OutlineBasicsPanel outline={outline} onChange={setOutline} />
        </div>
      </div>
    </div>
  )
}
