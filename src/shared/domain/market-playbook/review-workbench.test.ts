import test from 'node:test'
import assert from 'node:assert/strict'

import type { MarketPlaybookDraftDto } from '../../contracts/market-playbook.ts'
import {
  applyMarketPlaybookReviewEdits,
  buildMarketPlaybookActivationPreview
} from './review-workbench.ts'

function makeDraft(): MarketPlaybookDraftDto {
  return {
    id: 'draft-test',
    name: '测试打法包草案',
    sourceSampleIds: ['sample-a'],
    audienceLane: 'male',
    subgenre: '男频玄幻修仙',
    sourceMonth: '2026-06',
    version: 'draft-1',
    status: 'draft',
    extractedPatterns: [
      {
        id: 'p1',
        name: '开局压迫',
        type: 'opening_pressure',
        description: '废灵根受辱',
        appliesTo: { audienceLane: 'male', subgenre: '男频玄幻修仙' },
        promptInstruction: '开局必须当众受辱',
        qualitySignal: '废灵根 当众受辱',
        examples: []
      },
      {
        id: 'p2',
        name: '爽点兑现',
        type: 'payoff',
        description: '测灵台爆裂',
        appliesTo: { audienceLane: 'male', subgenre: '男频玄幻修仙' },
        promptInstruction: '测灵台爆裂',
        qualitySignal: '测灵台爆裂 长老反噬',
        examples: []
      },
      {
        id: 'p3',
        name: '集尾钩子',
        type: 'hook',
        description: '仙界令牌发烫',
        appliesTo: { audienceLane: 'male', subgenre: '男频玄幻修仙' },
        promptInstruction: '仙界令牌压到眼前',
        qualitySignal: '仙界令牌 发烫',
        examples: []
      }
    ],
    antiPatterns: ['不要开局讲世界观'],
    promptRules: ['每集施压反击留钩子'],
    qualitySignals: ['废灵根 当众受辱'],
    createdAt: '2026-06-01T00:00:00.000Z',
    updatedAt: '2026-06-01T00:00:00.000Z'
  }
}

test('P11: applyMarketPlaybookReviewEdits trims fields and rebuilds promptRules/qualitySignals', () => {
  const reviewed = applyMarketPlaybookReviewEdits({
    draft: makeDraft(),
    name: '  六月男频修仙打法包  ',
    version: '  v2  ',
    patterns: [
      {
        id: 'p1',
        promptInstruction: '  测灵台必须开局受辱  ',
        qualitySignal: '  测灵台 废灵根  '
      },
      {
        id: 'p2',
        promptInstruction: '  爽点必须实质反噬  ',
        qualitySignal: '  长老反噬 众人震惊  '
      }
    ],
    antiPatternsText: ' 不要解释世界观 \n\n 不要让主角哭着求饶 ',
    reviewNotesText: ' 已人工审核 \n 可进入启用预览 '
  })

  assert.equal(reviewed.name, '六月男频修仙打法包')
  assert.equal(reviewed.version, 'v2')
  assert.equal(reviewed.extractedPatterns[0].promptInstruction, '测灵台必须开局受辱')
  assert.equal(reviewed.extractedPatterns[1].qualitySignal, '长老反噬 众人震惊')
  assert.deepEqual(reviewed.antiPatterns, ['不要解释世界观', '不要让主角哭着求饶'])
  assert.deepEqual(reviewed.promptRules.slice(0, 2), ['测灵台必须开局受辱', '爽点必须实质反噬'])
  assert.deepEqual(reviewed.qualitySignals.slice(0, 2), ['测灵台 废灵根', '长老反噬 众人震惊'])
  assert.deepEqual(reviewed.reviewNotes, ['已人工审核', '可进入启用预览'])
})

test('P11: buildMarketPlaybookActivationPreview validates before activation', () => {
  const preview = buildMarketPlaybookActivationPreview({
    draft: makeDraft(),
    activateAt: '2026-06-02T00:00:00.000Z',
    existingActivePlaybooks: []
  })

  assert.equal(preview.validation.valid, true)
  assert.ok(preview.playbook)
  assert.equal(preview.playbook!.status, 'active')
  assert.ok(preview.promptPreview.includes('不能覆盖稳定创作内核'))
})

test('P11: buildMarketPlaybookActivationPreview blocks invalid draft', () => {
  const invalid = makeDraft()
  invalid.extractedPatterns = invalid.extractedPatterns.slice(0, 2)

  const preview = buildMarketPlaybookActivationPreview({
    draft: invalid,
    existingActivePlaybooks: []
  })

  assert.equal(preview.validation.valid, false)
  assert.equal(preview.playbook, null)
  assert.ok(preview.validation.issues.some((issue) => issue.includes('patterns 至少 3 个')))
})
