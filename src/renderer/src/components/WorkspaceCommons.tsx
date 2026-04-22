import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, AlertCircle, CheckCircle, X } from 'lucide-react'
import { useState } from 'react'

// ── ValidationBadge ──
interface BadgeProps {
  score: number
  label: string
}

export function ValidationBadge({ score, label }: BadgeProps): JSX.Element {
  const color =
    score >= 80
      ? 'text-green-400 border-green-500/30 bg-green-500/10'
      : score >= 60
        ? 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10'
        : 'text-red-400 border-red-500/30 bg-red-500/10'

  const Icon = score >= 80 ? CheckCircle : AlertCircle

  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border ${color}`}
    >
      <Icon size={11} strokeWidth={2.5} />
      {label} · {score}分
    </span>
  )
}

// ── WorkspaceInput ──
interface InputProps {
  label: string
  placeholder: string
  value: string
  onChange: (v: string) => void
  hint?: string
  multiline?: boolean
  rows?: number
  disabled?: boolean
}

export function WorkspaceInput({
  label,
  placeholder,
  value,
  onChange,
  hint,
  multiline,
  rows = 4,
  disabled
}: InputProps): JSX.Element {
  return (
    <div className="space-y-2">
      <label className="block text-[11px] font-bold uppercase tracking-widest text-white/40">
        {label}
      </label>
      {multiline ? (
        <textarea
          rows={rows}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 resize-none focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
        />
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-orange-500/50 focus:bg-white/8 transition-all"
        />
      )}
      {hint && <p className="text-[10px] text-white/25">{hint}</p>}
    </div>
  )
}

// ── HintPanel ── (柔性建议侧边板)
export interface Hint {
  type: 'market' | 'logic' | 'warning'
  title: string
  body: string
  confidence: 'high' | 'mid' | 'low'
}

interface HintPanelProps {
  hints: Hint[]
  title?: string
}

export function HintPanel({ hints, title = 'AI 赋能建议' }: HintPanelProps): JSX.Element {
  const [dismissed, setDismissed] = useState<number[]>([])

  const visible = hints.filter((_, i) => !dismissed.includes(i))

  if (visible.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-white/15 text-xs">
        暂无建议 · 系统监测中...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] uppercase tracking-widest font-bold text-white/25">{title}</p>
      <AnimatePresence>
        {hints.map((hint, i) => {
          if (dismissed.includes(i)) return null
          const borderColor =
            hint.confidence === 'high'
              ? 'border-orange-500/30'
              : hint.confidence === 'mid'
                ? 'border-yellow-500/20'
                : 'border-white/10'
          const dotColor =
            hint.confidence === 'high'
              ? 'bg-orange-500'
              : hint.confidence === 'mid'
                ? 'bg-yellow-400'
                : 'bg-white/20'

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={`relative bg-white/3 border ${borderColor} rounded-xl p-4 pr-8`}
            >
              <button
                onClick={() => setDismissed((prev) => [...prev, i])}
                className="absolute top-3 right-3 text-white/20 hover:text-white/50 transition-colors"
              >
                <X size={12} />
              </button>
              <div className="flex items-start gap-3">
                <Lightbulb size={14} className="text-orange-400/70 mt-0.5 shrink-0" />
                <div>
                  <p className="text-[11px] font-bold text-white/70 mb-1">{hint.title}</p>
                  <p className="text-[11px] leading-relaxed text-white/40">{hint.body}</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 mt-3">
                <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                <span className="text-[9px] uppercase tracking-widest text-white/20">
                  {hint.confidence === 'high'
                    ? '高置信度'
                    : hint.confidence === 'mid'
                      ? '中置信度'
                      : '低置信度'}
                </span>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
