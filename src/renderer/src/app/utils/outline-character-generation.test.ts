import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildOutlineCharacterGenerationFailureNotice,
  buildOutlineCharacterPartialSuccessNotice,
  buildOutlineCharacterGenerationSuccessNotice,
  getOutlineCharacterGenerationActionLabel
} from './outline-character-generation.ts'

test('getOutlineCharacterGenerationActionLabel stays on generate before any outline or character exists', () => {
  assert.equal(
    getOutlineCharacterGenerationActionLabel({
      outlineEpisodeCount: 0,
      characterCount: 0
    }),
    '生成人物小传和骨架'
  )
})

test('getOutlineCharacterGenerationActionLabel flips to regenerate once outline or character content exists', () => {
  assert.equal(
    getOutlineCharacterGenerationActionLabel({
      outlineEpisodeCount: 3,
      characterCount: 0
    }),
    '重新生成人物小传和骨架'
  )

  assert.equal(
    getOutlineCharacterGenerationActionLabel({
      outlineEpisodeCount: 0,
      characterCount: 2
    }),
    '重新生成人物小传和骨架'
  )
})

test('buildOutlineCharacterGenerationSuccessNotice keeps character-stage follow-up on the current page', () => {
  const notice = buildOutlineCharacterGenerationSuccessNotice({
    currentStage: 'character',
    hadExistingContent: true
  })

  assert.equal(notice.title, '人物小传和骨架已经重新生成好了')
  assert.equal(notice.primaryAction?.label, '继续看人物')
  assert.equal(notice.primaryAction?.stage, 'character')
  assert.equal(notice.secondaryAction?.label, '去详细大纲')
  assert.equal(notice.secondaryAction?.stage, 'detailed_outline')
})

test('buildOutlineCharacterPartialSuccessNotice explains recovered rough outline failure', () => {
  const notice = buildOutlineCharacterPartialSuccessNotice({
    currentStage: 'character',
    hadExistingContent: false
  })

  assert.equal(notice.kind, 'warning')
  assert.equal(notice.title, '人物小传已经生成，骨架未写入')
  assert.match(notice.detail, /人物小传和世界底账/)
  assert.match(notice.detail, /不再写入临时骨架/)
  assert.equal(notice.primaryAction?.label, '继续看人物')
  assert.equal(notice.secondaryAction?.label, '去剧本骨架')
  assert.equal(notice.secondaryAction?.stage, 'outline')
})

test('buildOutlineCharacterGenerationFailureNotice treats missing seven questions as legacy detail', () => {
  const notice = buildOutlineCharacterGenerationFailureNotice({
    currentStage: 'outline',
    hadExistingContent: true,
    error: new Error('rough_outline_requires_confirmed_seven_questions')
  })

  assert.equal(notice.title, '这次没能重新生成人物小传和骨架')
  assert.equal(notice.detail, '这次卡在旧七问前置条件，请直接重新生成人物小传和骨架')
  assert.equal(notice.primaryAction?.label, '继续看粗纲')
  assert.equal(notice.primaryAction?.stage, 'outline')
  assert.equal(notice.secondaryAction, undefined)
})

test('buildOutlineCharacterGenerationFailureNotice sends missing story intent back to chat confirmation', () => {
  const notice = buildOutlineCharacterGenerationFailureNotice({
    currentStage: 'character',
    hadExistingContent: false,
    error: new Error('confirmed_story_intent_missing')
  })

  assert.equal(notice.title, '这次没能生成人物小传和骨架')
  assert.equal(notice.detail, '请先重新点一次“确认信息”，这版聊天真相还没正式锁住')
  assert.equal(notice.primaryAction?.label, '回聊天确认信息')
  assert.equal(notice.primaryAction?.stage, 'chat')
  assert.equal(notice.secondaryAction?.label, '继续看人物')
  assert.equal(notice.secondaryAction?.stage, 'character')
})
