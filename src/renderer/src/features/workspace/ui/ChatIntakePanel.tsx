import { useEffect, useMemo, useState } from 'react'
import type { ProjectGenerationStatusDto } from '../../../../../shared/contracts/generation'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { ProjectGenerationBanner } from '../../../components/ProjectGenerationBanner'
import { ChatComposer } from './chat/ChatComposer'
import { ChatMessageList } from './chat/ChatMessageList'
import { createInitialChatMessages } from './chat/ChatTypes'
import type { ChatMessage } from './chat/ChatTypes'

export function ChatIntakePanel(props: {
  disabled: boolean
  status: string
  generationStatus: ProjectGenerationStatusDto | null
  onGenerate: (chatTranscript: string) => Promise<void>
}) {
  const projectId = useWorkflowStore((state) => state.projectId)
  const messages = useWorkflowStore((state) => state.chatMessages)
  const setMessages = useWorkflowStore((state) => state.setChatMessages)
  const [busy, setBusy] = useState(false)
  const generationBusy = Boolean(props.generationStatus)

  useEffect(() => {
    if (!projectId || messages.length > 0) return
    setMessages(createInitialChatMessages())
  }, [messages.length, projectId, setMessages])

  const chatTranscript = useMemo(() => {
    return messages
      .map((m) => `${m.role === 'user' ? '用户' : '剧情执笔人'}：${m.text}`)
      .join('\n')
  }, [messages])

  const canGenerate = useMemo(() => {
    const answered = messages.filter((m) => m.role === 'user' && m.text.trim()).length
    return answered >= 1 && !busy && !generationBusy && !props.disabled
  }, [busy, generationBusy, messages, props.disabled])

  async function handleSend(text: string): Promise<void> {
    if (!text.trim() || busy || generationBusy || props.disabled) return

    const userMessage: ChatMessage = { role: 'user', text: text.trim(), createdAt: Date.now() }
    setMessages([...messages, userMessage])
    setBusy(true)

    try {
      // 这里的战略是：调用真实的 AI 接口进行回复，并注入引导逻辑
      const response = await window.api.ai.generate({
        task: 'free_chat' as any, // 确保符合 DTO 要求的任务类型
        prompt: `你是一个专业的剧本策划助手。当前用户输入是：“${text}”。
        之前的对话历史是：\n${chatTranscript}\n
        你的任务：
        1. 哪怕用户只发了一句话，也要基于你的戏剧知识给出专业评论。
        2. 主动、自然地引导用户补充“题材、主角困境、核心冲突、爽点、反转”中的某一项细节。
        3. 说话要专业、直接、清楚，不要撒娇，不要扮演暧昧人格，不要用夸张口头禅。
        4. 回复必须短小精悍，不要超过 120 字。
        5. 优先帮用户把故事说实，不要空泛鼓励。`
      })



      setMessages([
        ...messages,
        userMessage,
        { role: 'assistant', text: response.text || '我在整理你的创作信息，马上继续。', createdAt: Date.now() }
      ])
    } catch (error) {
      console.error('AI Reply Failure:', error)
      setMessages([
        ...messages,
        userMessage,
        { role: 'assistant', text: '这次回复没有拿稳。你可以继续补一句关键信息，或者直接先生成第一版粗纲和人物。', createdAt: Date.now() }
      ])
    } finally {
      setBusy(false)
    }
  }

  async function handleGenerate(): Promise<void> {
    if (!canGenerate) return
    setBusy(true)
    try {
      await props.onGenerate(chatTranscript)
      // 成功后的反馈已经在外面处理（跳转或状态更新）
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error || '生成失败')
      setMessages([
        ...messages,
        {
          role: 'assistant',
          text: `生成失败：${message}。先别换方向，继续补题材、主角困境或核心冲突，我再帮你收一版。`,
          createdAt: Date.now()
        }
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 relative">
      <div className="flex-1 min-h-0 flex flex-col bg-white/[0.01] rounded-2xl border border-white/[0.03] p-4 lg:p-6 mb-4 overflow-hidden">
        <ChatMessageList messages={messages} />
        <div className="mx-2 mb-2">
          <ProjectGenerationBanner status={props.generationStatus} />
        </div>
      </div>

      <ChatComposer
        disabled={props.disabled}
        busy={busy || generationBusy}
        canGenerate={canGenerate}
        onSend={(text) => void handleSend(text)}
        onGenerate={() => void handleGenerate()}
      />

      {props.disabled && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-50 flex items-center justify-center rounded-2xl border border-white/5">
          <p className="text-[11px] text-white/90 bg-black px-5 py-2.5 rounded-full border border-orange-500/30 shadow-2xl font-black tracking-widest uppercase">
            请先选中项目，再开始这轮创作
          </p>
        </div>
      )}
    </div>
  )
}
