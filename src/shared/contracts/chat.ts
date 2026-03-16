export type ChatRoleDto = 'user' | 'assistant'

export interface ChatMessageDto {
  role: ChatRoleDto
  text: string
  createdAt: number
}
