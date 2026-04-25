import { useRef, type MouseEvent } from 'react'
import { Check, Copy } from 'lucide-react'

async function writeClipboardText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  document.execCommand('copy')
  document.body.removeChild(textarea)
}

export function CopyTextButton(input: {
  getText: () => string
  label?: string
  copiedLabel?: string
  title?: string
  className?: string
}): JSX.Element {
  const label = input.label || '复制'
  const copiedLabel = input.copiedLabel || '已复制'
  const labelRef = useRef<HTMLSpanElement | null>(null)
  const copyIconRef = useRef<HTMLSpanElement | null>(null)
  const copiedIconRef = useRef<HTMLSpanElement | null>(null)
  const resetTimerRef = useRef<number | null>(null)

  function setClipboardFeedback(active: boolean): void {
    if (labelRef.current) {
      labelRef.current.textContent = active ? copiedLabel : label
    }

    copyIconRef.current?.classList.toggle('hidden', active)
    copiedIconRef.current?.classList.toggle('hidden', !active)
  }

  async function handleCopy(event: MouseEvent<HTMLButtonElement>): Promise<void> {
    event.preventDefault()
    event.stopPropagation()

    const text = input.getText().trim()
    if (!text) return

    await writeClipboardText(text)
    setClipboardFeedback(true)

    if (resetTimerRef.current !== null) {
      window.clearTimeout(resetTimerRef.current)
    }

    resetTimerRef.current = window.setTimeout(() => {
      setClipboardFeedback(false)
      resetTimerRef.current = null
    }, 1400)
  }

  return (
    <button
      type="button"
      onClick={(event) => void handleCopy(event)}
      title={input.title || input.label || '复制内容'}
      className={
        input.className ||
        'inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[10px] font-black text-white/45 transition-all hover:border-orange-500/30 hover:bg-orange-500/10 hover:text-orange-200'
      }
    >
      <span ref={copyIconRef} aria-hidden="true">
        <Copy size={12} />
      </span>
      <span ref={copiedIconRef} aria-hidden="true" className="hidden">
        <Check size={12} />
      </span>
      <span ref={labelRef}>{label}</span>
    </button>
  )
}
