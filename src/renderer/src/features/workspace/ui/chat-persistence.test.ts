import test from 'node:test'
import assert from 'node:assert/strict'

import { CHAT_PENDING_MESSAGE_TEXT } from './chat/ChatTypes.ts'

function stripPendingMessages(messages: Array<{ text: string }>): Array<{ text: string }> {
  return messages.filter((message) => message.text !== CHAT_PENDING_MESSAGE_TEXT)
}

test('chat persistence payload excludes pending placeholder but keeps real messages', () => {
  const persisted = stripPendingMessages([
    { text: '用户：把这个剧本改成30集' },
    { text: CHAT_PENDING_MESSAGE_TEXT },
    { text: 'AI：我先帮你整理思路。' }
  ])

  assert.deepEqual(persisted, [
    { text: '用户：把这个剧本改成30集' },
    { text: 'AI：我先帮你整理思路。' }
  ])
})
