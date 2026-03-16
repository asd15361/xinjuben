import { FileText } from 'lucide-react'

interface DetailedOutlineStageHeaderProps {
  onAIGenerate?: () => void
  busy?: boolean
}

export function DetailedOutlineStageHeader(props: DetailedOutlineStageHeaderProps) {
  return (
    <div className="flex items-center justify-between gap-4 mb-8 border-b border-white/[0.05] pb-6">
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <FileText size={18} className="text-orange-400" />
        </div>
        <div>
          <h2 className="text-lg font-black text-white/90">详细大纲</h2>
          <p className="text-[11px] text-white/40 mt-0.5">先把四个大阶段理顺。每一段都要写清楚推进、翻面和下一步钩子。</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          onClick={props.onAIGenerate}
          disabled={props.busy}
          className="rounded-xl px-5 py-2.5 text-xs font-black text-[#050505] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/20 disabled:opacity-40"
          style={{ background: '#FF7A00' }}
        >
          AI 帮我补这一版
        </button>
      </div>
    </div>
  )
}
