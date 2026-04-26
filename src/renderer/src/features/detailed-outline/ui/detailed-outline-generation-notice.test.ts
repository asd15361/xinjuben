import test from 'node:test'
import assert from 'node:assert/strict'

import { buildDetailedOutlineFailureNotice } from './detailed-outline-generation-notice.ts'

test('buildDetailedOutlineFailureNotice maps anchor roster contract gate code', () => {
  const notice = buildDetailedOutlineFailureNotice(
    'detailed_outline_anchor_roster_missing'
  )

  assert.equal(notice.title, '还不能直接生成详细大纲')
  assert.equal(notice.primaryAction?.stage, 'character')
  assert.equal(notice.primaryAction?.label, '回人物页补齐')
})

test('buildDetailedOutlineFailureNotice explains API timeout error plainly', () => {
  const notice = buildDetailedOutlineFailureNotice(
    'detailed_outline_generation_failed:ai_request_timeout:60000ms'
  )

  assert.equal(notice.title, '详细大纲这次超时了')
  assert.equal(notice.detail, 'AI 请求超时（60 秒）。这一步还没有正式结果，直接重试即可。')
})

test('buildDetailedOutlineFailureNotice explains incomplete model payload plainly', () => {
  const notice = buildDetailedOutlineFailureNotice(
    'detailed_outline_generation_failed:detailed_outline_model_incomplete'
  )

  assert.equal(notice.title, '详细大纲这次没有补成功')
  assert.equal(notice.detail, 'AI 已返回详细大纲，但结构没收完整，系统没法确认这版详纲。')
})

test('buildDetailedOutlineFailureNotice explains replaced run plainly', () => {
  const notice = buildDetailedOutlineFailureNotice(
    'detailed_outline_generation_failed:workspace_generation_aborted:replaced'
  )

  assert.equal(notice.title, '上一轮详细大纲请求已被新请求替换')
  assert.equal(
    notice.detail,
    '同一项目的详细大纲任务又发起了一次，系统已自动取消旧请求，当前以后发起的那一轮为准。'
  )
})
