import test from 'node:test'
import assert from 'node:assert/strict'

import { CHAT_PENDING_MESSAGE_TEXT } from './chat/ChatTypes.ts'

test('pending chat placeholder uses dedicated sentinel text', () => {
  assert.equal(CHAT_PENDING_MESSAGE_TEXT, '__pending_ai_reply__')
})
