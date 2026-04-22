import { Download } from 'lucide-react'

interface StageExportButtonProps {
  onClick: () => void
}

export function StageExportButton(props: StageExportButtonProps): JSX.Element {
  return (
    <button
      onClick={props.onClick}
      className="flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2 text-[11px] font-black text-white/78 hover:text-white hover:bg-white/5 transition-colors"
    >
      <Download size={14} />
      一键下载
    </button>
  )
}
