import { GitBranch } from 'lucide-react'
import { SevenQuestionsReviewPanel } from './SevenQuestionsReviewPanel'

export function SevenQuestionsStage(): JSX.Element {
  return (
    <div className="h-full overflow-hidden flex flex-col relative">
      <div className="shrink-0 flex items-center justify-between gap-4 mb-4 border-b border-white/[0.05] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <GitBranch size={16} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white/90">七问篇章</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1 h-1 rounded-full bg-orange-500" />
              <p className="text-[10px] text-white/50">先确认篇章骨架，再去跑粗纲和人物</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1 xl:pr-2">
        <SevenQuestionsReviewPanel />
      </div>
    </div>
  )
}
