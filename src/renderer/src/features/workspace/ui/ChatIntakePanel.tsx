import { useEffect, useMemo, useState } from 'react'
import type { ProjectGenerationStatusDto } from '../../../../../shared/contracts/generation'
import type { StorySynopsisReadiness } from '../../../../../shared/domain/intake/story-synopsis.ts'
import { inspectProjectIntakeReadiness } from '../../../../../shared/domain/intake/story-synopsis.ts'
import { renderChineseCharacterNamingGuidelines } from '../../../../../shared/domain/intake/character-naming-guidelines.ts'
import { isConfirmedStoryIntentForTranscript } from '../../../../../shared/domain/workflow/confirmed-story-intent'
import { useWorkflowStore } from '../../../app/store/useWorkflowStore'
import { ProjectGenerationBanner } from '../../../components/ProjectGenerationBanner'
import { ChatComposer } from './chat/ChatComposer'
import { ChatMessageList } from './chat/ChatMessageList'
import { CHAT_PENDING_MESSAGE_TEXT, createInitialChatMessages } from './chat/ChatTypes'
import type { ChatMessage } from './chat/ChatTypes'
import { buildWorkspaceChatFailureMessage } from './workspace-chat-error-message'
import { apiSaveChatMessages, apiGenerateText } from '../../../services/api-client.ts'

export function ChatIntakePanel(props: {
  disabled: boolean
  status: string
  generationStatus: ProjectGenerationStatusDto | null
  onConfirmIntent: (chatTranscript: string) => Promise<{
    generationBriefText: string
    readiness: StorySynopsisReadiness
  }>
  onGenerate: (chatTranscript: string) => Promise<void>
}): JSX.Element | null {
  const projectId = useWorkflowStore((state) => state.projectId)
  const messages = useWorkflowStore((state) => state.chatMessages)
  const setMessages = useWorkflowStore((state) => state.setChatMessages)
  const storyIntent = useWorkflowStore((state) => state.storyIntent)
  const [busy, setBusy] = useState(false)
  const generationBusy = Boolean(props.generationStatus)

  async function persistChatMessages(nextMessages: ChatMessage[]): Promise<void> {
    if (!projectId) return
    await apiSaveChatMessages({
      projectId,
      chatMessages: nextMessages.filter((message) => message.text !== CHAT_PENDING_MESSAGE_TEXT)
    })
  }

  async function safePersistChatMessages(nextMessages: ChatMessage[]): Promise<void> {
    try {
      await persistChatMessages(nextMessages)
    } catch (error) {
      console.warn('Chat persistence failed:', error)
    }
  }

  useEffect(() => {
    if (!projectId || messages.length > 0) return
    setMessages(createInitialChatMessages())
  }, [messages.length, projectId, setMessages])

  const chatTranscript = useMemo(() => {
    return messages.map((m) => `${m.role === 'user' ? '用户' : '剧情执笔人'}：${m.text}`).join('\n')
  }, [messages])
  const truthTranscript = useMemo(() => {
    return messages
      .filter((message) => message.role === 'user' && message.text.trim())
      .map((message) => `用户：${message.text.trim()}`)
      .join('\n')
  }, [messages])

  const canGenerate = useMemo(() => {
    const answered = messages.filter((m) => m.role === 'user' && m.text.trim()).length
    return answered >= 1 && !busy && !generationBusy && !props.disabled
  }, [busy, generationBusy, messages, props.disabled])
  const hasConfirmedCurrentInfo = isConfirmedStoryIntentForTranscript(storyIntent, truthTranscript)
  const intakeReadiness = useMemo(() => inspectProjectIntakeReadiness(storyIntent), [storyIntent])
  const canGenerateFromConfirmedInfo =
    canGenerate && hasConfirmedCurrentInfo && intakeReadiness.ready

  async function handleSend(text: string): Promise<void> {
    if (!text.trim() || busy || generationBusy || props.disabled) return

    const userMessage: ChatMessage = { role: 'user', text: text.trim(), createdAt: Date.now() }
    const pendingMessage: ChatMessage = {
      role: 'assistant',
      text: CHAT_PENDING_MESSAGE_TEXT,
      createdAt: Date.now() + 1
    }
    const pendingMessages = [...messages, userMessage, pendingMessage]
    setMessages(pendingMessages)
    setBusy(true)

    try {
      const response = await apiGenerateText({
        task: 'general',
        prompt: `你是一个专业的剧本策划助手。当前用户输入是：”${text}”。
        之前的对话历史是：\n${chatTranscript}\n
        你的任务：
        1. 哪怕用户只发了一句话，也要基于你的戏剧知识给出专业评论。
        2. 主动、自然地引导用户补充”世界观/背景、阵营/场域、角色池、主角困境、核心冲突、爽点、反转”中的某一项细节。
        3. 如果用户还没说世界是什么、有哪些阵营/组织/地点、有哪些核心角色和功能角色，优先追问这些底账。
        4. 如果用户说“你帮我取名/我不会取名/随便取”，你必须直接给一版可用角色名册，不要继续追问用户来取名。
        ${renderChineseCharacterNamingGuidelines()}
        5. 说话要专业、直接、清楚，不要撒娇，不要扮演暧昧人格，不要用夸张口头禅。
        6. 回复必须短小精悍，不要超过 160 字。
        7. 优先帮用户把故事说实，不要空泛鼓励。`
      })

      const nextMessages: ChatMessage[] = [
        ...messages,
        userMessage,
        {
          role: 'assistant',
          text: response.text || '我在整理你的创作信息，马上继续。',
          createdAt: Date.now()
        }
      ]
      setMessages(nextMessages)
      await safePersistChatMessages(nextMessages)
    } catch (error) {
      console.error('AI Reply Failure:', error)
      const nextMessages: ChatMessage[] = [
        ...messages,
        userMessage,
        {
          role: 'assistant',
          text: buildWorkspaceChatFailureMessage('回复失败', error),
          createdAt: Date.now()
        }
      ]
      setMessages(nextMessages)
      await safePersistChatMessages(nextMessages)
    } finally {
      setBusy(false)
    }
  }

  async function handleGenerate(): Promise<void> {
    if (!canGenerateFromConfirmedInfo) return
    setBusy(true)
    try {
      await props.onGenerate(truthTranscript)
      // 成功后的反馈已经在外面处理（跳转或状态更新）
    } catch (error) {
      const nextMessages: ChatMessage[] = [
        ...messages,
        {
          role: 'assistant',
          text: buildWorkspaceChatFailureMessage('生成失败', error),
          createdAt: Date.now()
        }
      ]
      setMessages(nextMessages)
      await safePersistChatMessages(nextMessages)
    } finally {
      setBusy(false)
    }
  }

  async function handleConfirmIntent(): Promise<void> {
    if (!canGenerate) return
    setBusy(true)
    try {
      const { generationBriefText, readiness } = await props.onConfirmIntent(truthTranscript)

      let readinessText = ''
      if (readiness.ready) {
        readinessText = '\n\n✅ 创作底账已具备进入人物小传所需信息。'
      } else {
        readinessText =
          '\n\n⚠️ 创作底账还缺以下关键项：' +
          readiness.missing.map((m) => `\n- ${m}`).join('') +
          '\n\n请继续补充这些信息，再进入人物小传。'
      }

      const nextMessages: ChatMessage[] = [
        ...messages,
        {
          role: 'assistant',
          text: `我已经把当前聊天整理成一版创作信息总结。${readiness.ready ? '当前可以进入人物小传；剧本骨架会在人物小传确认后再生成。' : '请继续补齐世界观、阵营/场域和角色底账。'}${readinessText}\n\n创作信息总结：\n\n${generationBriefText}`,
          createdAt: Date.now()
        }
      ]
      setMessages(nextMessages)
      await safePersistChatMessages(nextMessages)
    } catch (error) {
      const nextMessages: ChatMessage[] = [
        ...messages,
        {
          role: 'assistant',
          text: buildWorkspaceChatFailureMessage('确认信息失败', error),
          createdAt: Date.now()
        }
      ]
      setMessages(nextMessages)
      await safePersistChatMessages(nextMessages)
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
        canConfirm={canGenerate}
        canGenerate={canGenerateFromConfirmedInfo}
        confirmed={hasConfirmedCurrentInfo}
        onSend={(text) => void handleSend(text)}
        onConfirm={() => void handleConfirmIntent()}
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
