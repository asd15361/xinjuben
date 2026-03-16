import { useEffect, useRef } from 'react'
import type { ChatMessage } from './ChatTypes'

function formatRole(role: ChatMessage['role']): string {
  return role === 'user' ? '你' : 'AI'
}

export function ChatMessageList(props: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' })
  }, [props.messages.length])

  return (
    <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar">
      <div className="space-y-4 pb-6">
        {props.messages.map((m) => (
          <div
            key={`${m.role}_${m.createdAt}`}
            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl border px-5 py-4 text-[13px] leading-relaxed shadow-xl break-words overflow-hidden ${m.role === 'user'
                  ? 'border-orange-500/30 bg-orange-500/10 text-white'
                  : 'border-white/10 bg-white/[0.03] text-white/90'
                }`}
            >
              <p className="text-[10px] font-black tracking-[0.2em] text-white/40 mb-2 uppercase">{formatRole(m.role)}</p>
              <p className="whitespace-pre-wrap">{m.text}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>

  )
}

