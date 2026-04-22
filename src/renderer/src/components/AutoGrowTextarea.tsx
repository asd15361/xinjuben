import { useLayoutEffect, useRef } from 'react'

interface AutoGrowTextareaProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  disabled?: boolean
  className?: string
}

export function AutoGrowTextarea(props: AutoGrowTextareaProps): JSX.Element {
  const { value, onChange, placeholder, disabled = false, className = '' } = props
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = '0px'
    textarea.style.height = `${textarea.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      rows={1}
      className={`w-full resize-none overflow-hidden rounded-xl border border-white/8 bg-black/20 px-4 py-3 text-[12px] leading-relaxed text-white/75 outline-none focus:border-orange-500/30 focus:text-white/90 disabled:opacity-60 ${className}`}
    />
  )
}
