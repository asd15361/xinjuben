import test from 'node:test'
import assert from 'node:assert/strict'

import { getChatStagePrimaryActionLabel } from './chat-stage-entry.ts'

test('chat stage primary action label points to seven questions after intent confirmation', () => {
  assert.equal(getChatStagePrimaryActionLabel(true), '进入七问确认')
})

test('chat stage primary action label stays on info confirmation before intent is locked', () => {
  assert.equal(getChatStagePrimaryActionLabel(false), '生成前先确认信息')
})
