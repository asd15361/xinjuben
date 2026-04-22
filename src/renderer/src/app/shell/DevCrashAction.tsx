import { AlertTriangle } from 'lucide-react'

interface DevCrashActionProps {
  onTrigger: () => void
}

export function DevCrashAction({ onTrigger }: DevCrashActionProps): JSX.Element | null {
  if (!import.meta.env.DEV) return null

  return (
    <button
      onClick={onTrigger}
      className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-red-400 transition-colors"
    >
      <AlertTriangle size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
      Simulate Failure
    </button>
  )
}
