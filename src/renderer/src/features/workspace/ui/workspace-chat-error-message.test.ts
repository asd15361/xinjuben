import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildWorkspaceChatFailureMessage,
  normalizeWorkspaceChatErrorMessage
} from './workspace-chat-error-message.ts'

test('normalizeWorkspaceChatErrorMessage strips remote invoke and summary wrapper noise', () => {
  const message = normalizeWorkspaceChatErrorMessage(
    "Error invoking remote method 'workspace:confirm-story-intent-from-chat': Error: summary_generation_failed:ai_request_timeout:35000ms"
  )

  assert.equal(message, 'AI 请求超时（35 秒）')
})

test('normalizeWorkspaceChatErrorMessage strips remote invoke timeout error name noise', () => {
  const message = normalizeWorkspaceChatErrorMessage(
    "Error invoking remote method 'workspace:generate-outline-and-characters': TimeoutError: ai_request_timeout:45000ms"
  )

  assert.equal(message, 'AI 请求超时（45 秒）')
})

test('buildWorkspaceChatFailureMessage explains incomplete payload plainly', () => {
  assert.equal(
    buildWorkspaceChatFailureMessage(
      '确认信息失败',
      'summary_generation_failed:summary_payload_incomplete'
    ),
    '确认信息失败：AI 已返回内容，但关键信息没收齐，系统没法确认这版信息'
  )
})

test('buildWorkspaceChatFailureMessage explains parse failure plainly', () => {
  assert.equal(
    buildWorkspaceChatFailureMessage(
      '确认信息失败',
      'summary_generation_failed:summary_payload_parse_failed'
    ),
    '确认信息失败：AI 已返回内容，但结构不合法，系统没法确认这版信息'
  )
})

test('buildWorkspaceChatFailureMessage explains interrupted generation plainly', () => {
  assert.equal(
    buildWorkspaceChatFailureMessage(
      '确认信息失败',
      'summary_generation_failed:workspace_generation_aborted:owner_destroyed'
    ),
    '确认信息失败：这次生成已中断，重新发起即可'
  )
})

test('buildWorkspaceChatFailureMessage explains missing confirmed story intent plainly', () => {
  assert.equal(
    buildWorkspaceChatFailureMessage('生成失败', 'confirmed_story_intent_missing'),
    '生成失败：请先重新点一次“确认信息”，这版聊天真相还没正式锁住'
  )
})

test('buildWorkspaceChatFailureMessage explains seven questions confirmation requirement plainly', () => {
  assert.equal(
    buildWorkspaceChatFailureMessage('生成失败', 'seven_questions_confirmation_required'),
    '生成失败：七问已经并入骨架流程，请直接生成人物小传和剧本骨架'
  )
})

test('buildWorkspaceChatFailureMessage explains short outline batch plainly', () => {
  assert.equal(
    buildWorkspaceChatFailureMessage('生成失败', 'rough_outline_incomplete:episode_count_short'),
    '生成失败：AI 已返回粗纲，但集数不够，系统没法确认这版粗纲'
  )
})

test('buildWorkspaceChatFailureMessage explains empty episode summary plainly', () => {
  assert.equal(
    buildWorkspaceChatFailureMessage(
      '生成失败',
      'rough_outline_incomplete:episode_summary_missing'
    ),
    '生成失败：AI 已返回粗纲，但有分集没写实，系统没法确认这版粗纲'
  )
})

test('buildWorkspaceChatFailureMessage explains rough outline parse failure plainly', () => {
  assert.equal(
    buildWorkspaceChatFailureMessage('生成失败', 'rough_outline_batch_parse_failed'),
    '生成失败：AI 已返回粗纲内容，但结构不合法，系统没法确认这版粗纲'
  )
})

test('buildWorkspaceChatFailureMessage explains missing regenerated outline result plainly', () => {
  assert.equal(
    buildWorkspaceChatFailureMessage('生成失败', 'rough_outline_result_missing'),
    '生成失败：这次没拿到新的粗纲结果，系统还不能替换当前版本'
  )
})

test('buildWorkspaceChatFailureMessage explains failed seven questions confirmation save plainly', () => {
  assert.equal(
    buildWorkspaceChatFailureMessage('生成失败', 'seven_questions_confirm_save_failed'),
    '生成失败：旧七问保存失败；现在请直接重新生成人物小传和骨架'
  )
})

test('buildWorkspaceChatFailureMessage explains character profile v2 runtime failure plainly', () => {
  assert.equal(
    buildWorkspaceChatFailureMessage(
      '生成失败',
      'character_profile_v2_generation_failed:玄玉宫:provider terminated'
    ),
    '生成失败：人物小传生成失败，请重试'
  )
})

test('buildWorkspaceChatFailureMessage explains character profile v2 parse failure plainly', () => {
  assert.equal(
    buildWorkspaceChatFailureMessage(
      '生成失败',
      'character_profile_v2_parse_failed:黑沼盟:json_parse_failed'
    ),
    '生成失败：AI 已返回人物小传，但结构不合法，系统没法继续生成粗纲'
  )
})

test('buildWorkspaceChatFailureMessage explains authority failure for character contract plainly', () => {
  assert.equal(
    buildWorkspaceChatFailureMessage(
      '生成失败',
      'Error invoking remote method \'workspace:generate-outline-and-characters-from-confirmed-seven-questions\': AuthorityFailureError: [AUTHORITY_FAILURE_INCOMPLETE_RESULT] Authority failure for "characterDrafts": [guardian:character-persistence] Character save would create invalid upstream state. Upstream outline incomplete. Issues: character_contract_incomplete.'
    ),
    '生成失败：人物结果生成出来了，但保存时被旧人物合同拦住了；请先检查主角、对手和当前人物小传是否完整'
  )
})
