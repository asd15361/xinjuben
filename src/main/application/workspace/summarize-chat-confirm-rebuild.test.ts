import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeChatTranscriptForGeneration } from './normalize-chat-transcript.ts'

test('confirm flow input stays user-only even if chat contains old structured summary', () => {
  const transcript = `
用户：最开始先按10集聊。
AI：我已经把当前聊天整理成正式创作信息，后面只按这版往下走：

【项目】修仙传｜10集
【主角】黎明
用户：现在改了，不做10集了，要做30集。
`.trim()

  const normalized = normalizeChatTranscriptForGeneration(transcript)
  assert.match(normalized, /30集/)
  assert.doesNotMatch(normalized, /【项目】修仙传｜10集/)
})
