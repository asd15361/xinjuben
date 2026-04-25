import test from 'node:test'
import assert from 'node:assert/strict'

import { getChatStagePrimaryActionLabel } from './chat-stage-entry.ts'

test('chat stage primary action label points to character and outline after intent confirmation', () => {
  assert.equal(getChatStagePrimaryActionLabel(true), '进入人物小传')
})

test('chat stage primary action label stays on info confirmation before intent is locked', () => {
  assert.equal(getChatStagePrimaryActionLabel(false), '确认总结并进入人物小传')
})
