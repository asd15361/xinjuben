import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { ChatIntakePanel } from '../../workspace/ui/ChatIntakePanel'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { useStageStore } from '../../../store/useStageStore'
import { useChatStageActions } from './useChatStageActions'
import { createInitialChatMessages } from '../../workspace/ui/chat/ChatTypes'

export function ChatStage() {
  const setStage = useWorkflowStore((s) => s.setStage)
  const generationStatus = useWorkflowStore((s) => s.generationStatus)
  const setChatMessages = useWorkflowStore((s) => s.setChatMessages)
  const storyIntent = useWorkflowStore((s) => s.storyIntent)
  const outline = useStageStore((s) => s.outline)
  const characters = useStageStore((s) => s.characters)
  const { projectId, status, handleGenerate } = useChatStageActions()
  const [sessionKey, setSessionKey] = useState(0)

  const projectLocked = !projectId

  return (
    <div className="h-full overflow-hidden flex flex-col relative">
      {/* 头部：包含控制项与精简状态 */}
      <div className="shrink-0 flex items-center justify-between gap-4 mb-4 border-b border-white/[0.05] pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <MessageCircle size={16} className="text-orange-400" />
          </div>
          <div>
            <h2 className="text-sm font-black text-white/90">剧情灵感孵化器</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="w-1 h-1 rounded-full bg-orange-500" />
              <p className="text-[10px] text-white/50">{status}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(outline.title.trim() || characters.length > 0) && (
            <button
              onClick={() => setStage('outline')}
              className="rounded-lg px-3 py-1.5 text-[10px] font-black text-[#050505] transition-transform active:scale-95"
              style={{ background: '#FF7A00' }}
            >
              去粗纲确认
            </button>
          )}
          <button
            onClick={() => {
              setChatMessages(createInitialChatMessages())
              setSessionKey((v) => v + 1)
            }}
            className="rounded-lg px-3 py-1.5 text-[10px] font-black border border-white/10 text-white/50 hover:text-white hover:bg-white/5 transition-all"
            disabled={projectLocked}
          >
            清空重聊
          </button>
        </div>
      </div>

      {/* 核心聊天区：占满剩余空间 */}
      <div className="flex-1 min-h-0 flex flex-col">
        <ChatIntakePanel
          key={sessionKey}
          disabled={projectLocked}
          status={status}
          generationStatus={generationStatus}
          onGenerate={(chatTranscript) => handleGenerate(chatTranscript)}
        />
      </div>


      {/* 引导与背景状态 - 浮动或精简展示 */}
      {storyIntent?.freeChatFinalSummary && (
        <div className="absolute top-20 right-8 max-w-[200px] p-3 rounded-xl bg-orange-500/5 border border-orange-500/10 backdrop-blur-md z-20 pointer-events-none">
          <p className="text-[10px] font-black text-orange-400/60 uppercase tracking-tighter mb-1">当前故事收束</p>
          <p className="text-[10px] text-white/40 leading-relaxed italic line-clamp-3">
            {storyIntent.freeChatFinalSummary}
          </p>
        </div>
      )}
    </div>
  )
}
