import { useEffect, useRef, useState } from 'react'
import { getChatStagePrimaryActionLabel } from '../../../chat/ui/chat-stage-entry'

export function ChatComposer(props: {
  disabled: boolean
  busy: boolean
  canConfirm: boolean
  canGenerate: boolean
  confirmed: boolean
  onSend: (text: string) => void
  onConfirm: () => void
  onGenerate: () => void
}): JSX.Element {
  const [draft, setDraft] = useState('')
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  const sendDisabled = props.disabled || props.busy || !draft.trim()

  useEffect(() => {
    if (!props.disabled && !props.busy) {
      inputRef.current?.focus()
    }
  }, [props.busy, props.disabled])

  function focusComposerSoon(): void {
    window.requestAnimationFrame(() => {
      inputRef.current?.focus()
    })
  }

  function handleKeyDown(e: React.KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      const text = draft.trim()
      if (text) {
        setDraft('')
        props.onSend(text)
        focusComposerSoon()
      }
    }
  }

  return (
    <div className="mt-auto pt-4 border-t border-white/[0.05]">
      {/* 创作功能区 */}
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
          <p className="text-[11px] text-white/50 tracking-wider">
            {props.canGenerate
              ? '创作底账已就绪，下一步进入人物小传'
              : '先把世界观、阵营、角色池和冲突说出来'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={props.onConfirm}
            disabled={!props.canConfirm}
            className="rounded-lg px-4 py-2 text-[11px] font-black border border-white/10 text-white disabled:opacity-30 transition-all hover:bg-white/5 active:scale-[0.98]"
          >
            {props.confirmed ? '信息总结已就绪' : '确认当前总结'}
          </button>
          <button
            onClick={props.onGenerate}
            disabled={!props.canGenerate}
            className="rounded-lg px-4 py-2 text-[11px] font-black text-[#050505] disabled:opacity-30 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/10"
            style={{ background: '#FF7A00' }}
          >
            {getChatStagePrimaryActionLabel(props.confirmed)}
          </button>
        </div>
      </div>

      {/* 输入区 */}
      <div className="relative group">
        <textarea
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="直接说题材、主角、当前困境、核心冲突，或者先丢一个你最想写的画面"
          className="w-full resize-none bg-white/[0.04] border border-white/10 rounded-2xl px-5 py-4 pr-24 text-[13px] text-white placeholder-white/20 focus:outline-none focus:border-orange-500/30 focus:bg-white/[0.06] transition-all min-h-[80px] max-h-40 custom-scrollbar"
          disabled={props.busy || props.disabled}
        />
        <button
          onClick={() => {
            const text = draft.trim()
            if (!text) return
            setDraft('')
            props.onSend(text)
            focusComposerSoon()
          }}
          disabled={sendDisabled}
          className="absolute right-3 bottom-3 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest border border-white/10 text-white hover:bg-white/10 transition-all disabled:opacity-0 pointer-events-auto"
        >
          发送
        </button>
      </div>
      <p className="text-[10px] text-white/20 mt-3 text-center tracking-[0.1em]">
        提示：先把世界观、阵营/场域、角色池、主角困境和核心冲突说实
      </p>
    </div>
  )
}
