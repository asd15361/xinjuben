import type { ChatMessageDto, ChatRoleDto } from '../../../../../../shared/contracts/chat'

export type ChatRole = ChatRoleDto
export type ChatMessage = ChatMessageDto

export function createInitialChatMessages(): ChatMessage[] {
  return [
    {
      role: 'assistant',
      text: '先把故事说清楚就行。你可以直接告诉我题材、主角、当前困境、你最想打的冲突，或者先丢一个你脑子里最有感觉的画面，我来帮你把它整理成能继续往下写的第一版粗纲和人物。',
      createdAt: Date.now()
    }
  ]
}
