import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildOutlineCharacterGenerationFailureNotice,
  buildOutlineCharacterGenerationSuccessNotice,
  getOutlineCharacterGenerationActionLabel
} from './outline-character-generation.ts'

test('getOutlineCharacterGenerationActionLabel stays on generate before any outline or character exists', () => {
  assert.equal(
    getOutlineCharacterGenerationActionLabel({
      outlineEpisodeCount: 0,
      characterCount: 0
    }),
    '生成粗纲和人物'
  )
})

test('getOutlineCharacterGenerationActionLabel flips to regenerate once outline or character content exists', () => {
  assert.equal(
    getOutlineCharacterGenerationActionLabel({
      outlineEpisodeCount: 3,
      characterCount: 0
    }),
    '重新生成粗纲和人物'
  )

  assert.equal(
    getOutlineCharacterGenerationActionLabel({
      outlineEpisodeCount: 0,
      characterCount: 2
    }),
    '重新生成粗纲和人物'
  )
})

test('buildOutlineCharacterGenerationSuccessNotice keeps character-stage follow-up on the current page', () => {
  const notice = buildOutlineCharacterGenerationSuccessNotice({
    currentStage: 'character',
    hadExistingContent: true
  })

  assert.equal(notice.title, '粗纲和人物已经重新生成好了')
  assert.equal(notice.primaryAction?.label, '继续看人物')
  assert.equal(notice.primaryAction?.stage, 'character')
  assert.equal(notice.secondaryAction?.label, '去详细大纲')
  assert.equal(notice.secondaryAction?.stage, 'detailed_outline')
})

test('buildOutlineCharacterGenerationFailureNotice sends missing seven questions back to chat confirmation', () => {
  const notice = buildOutlineCharacterGenerationFailureNotice({
    currentStage: 'outline',
    hadExistingContent: true,
    error: new Error('rough_outline_requires_confirmed_seven_questions')
  })

  assert.equal(notice.title, '这次没能重新生成粗纲和人物')
  assert.equal(notice.detail, '先去确认七问，再继续生成粗纲和人物')
  assert.equal(notice.primaryAction?.label, '回聊天确认七问')
  assert.equal(notice.primaryAction?.stage, 'chat')
  assert.equal(notice.secondaryAction?.label, '继续看粗纲')
  assert.equal(notice.secondaryAction?.stage, 'outline')
})

test('buildOutlineCharacterGenerationFailureNotice sends missing story intent back to chat confirmation', () => {
  const notice = buildOutlineCharacterGenerationFailureNotice({
    currentStage: 'character',
    hadExistingContent: false,
    error: new Error('confirmed_story_intent_missing')
  })

  assert.equal(notice.title, '这次没能生成粗纲和人物')
  assert.equal(notice.detail, '请先重新点一次“确认信息”，这版聊天真相还没正式锁住')
  assert.equal(notice.primaryAction?.label, '回聊天确认信息')
  assert.equal(notice.primaryAction?.stage, 'chat')
  assert.equal(notice.secondaryAction?.label, '继续看人物')
  assert.equal(notice.secondaryAction?.stage, 'character')
})
