import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildDetailedOutlineGenerationSuccessNotice,
  getDetailedOutlineGenerationActionLabel
} from './detailed-outline-stage-label.ts'

test('getDetailedOutlineGenerationActionLabel keeps generate wording before any detailed outline exists', () => {
  assert.equal(getDetailedOutlineGenerationActionLabel(false), '生成这一版详细大纲')
})

test('getDetailedOutlineGenerationActionLabel flips to regenerate wording when detailed outline already exists', () => {
  assert.equal(getDetailedOutlineGenerationActionLabel(true), '重新生成这一版详细大纲')
})

test('buildDetailedOutlineGenerationSuccessNotice marks overwrite clearly when blocks already existed', () => {
  const notice = buildDetailedOutlineGenerationSuccessNotice(true)

  assert.equal(notice.title, '详细大纲已经重新生成好了')
  assert.equal(notice.primaryAction?.label, '继续看详细大纲')
  assert.equal(notice.secondaryAction?.label, '去剧本')
})
