import test from 'node:test'
import assert from 'node:assert/strict'

import { isConfirmedStoryIntentForTranscript } from '../../../../../shared/domain/workflow/confirmed-story-intent.ts'

function buildTruthTranscript(
  messages: Array<{ role: 'user' | 'assistant'; text: string }>
): string {
  return messages
    .filter((message) => message.role === 'user' && message.text.trim())
    .map((message) => `用户：${message.text.trim()}`)
    .join('\n')
}

test('confirmation truth ignores assistant summary messages when checking transcript equality', () => {
  const messages = [
    { role: 'user' as const, text: '把这个剧本改成30集' },
    {
      role: 'assistant' as const,
      text: '我已经把当前聊天整理成正式创作信息，后面只按这版往下走：\n\n【项目】修仙传｜30集'
    }
  ]
  const truthTranscript = buildTruthTranscript(messages)

  assert.equal(
    isConfirmedStoryIntentForTranscript(
      {
        titleHint: '修仙传',
        genre: '玄幻',
        tone: '',
        audience: '',
        sellingPremise: '卖点',
        coreDislocation: '错位',
        emotionalPayoff: '情绪',
        protagonist: '黎明',
        antagonist: '李科',
        coreConflict: '冲突',
        endingDirection: '开放',
        officialKeyCharacters: ['黎明', '李科'],
        lockedCharacterNames: ['黎明', '李科'],
        themeAnchors: [],
        worldAnchors: [],
        relationAnchors: [],
        dramaticMovement: [],
        manualRequirementNotes: '',
        freeChatFinalSummary: '总结',
        generationBriefText: '【项目】修仙传｜30集',
        confirmedChatTranscript: '用户：把这个剧本改成30集'
      },
      truthTranscript
    ),
    true
  )
})
