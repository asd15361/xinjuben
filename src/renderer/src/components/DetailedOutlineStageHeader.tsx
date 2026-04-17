import { FileText } from 'lucide-react'
import { StageExportButton } from './StageExportButton'

interface DetailedOutlineStageHeaderProps {
  onAIGenerate?: () => void
  onExport?: () => void
  busy?: boolean
  aiGenerateLabel?: string
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
          <p className="text-[11px] text-white/40 mt-0.5">先生成这一版详细大纲，再按阶段对照分集粗纲检查推进、翻面和下一步钩子。</p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {props.onExport && <StageExportButton onClick={props.onExport} />}
        <button
          onClick={props.onAIGenerate}
          disabled={props.busy}
          className="rounded-xl px-5 py-2.5 text-xs font-black text-[#050505] transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/20 disabled:opacity-40"
          style={{ background: '#FF7A00' }}
        >
          {props.aiGenerateLabel || '生成这一版详细大纲'}
        </button>
      </div>
    </div>
  )
}
