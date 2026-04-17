import test from 'node:test'
import assert from 'node:assert/strict'

import { getFormalFactSemanticLabel, isFormalFactSemanticLabel } from './semantic-label.ts'

test('getFormalFactSemanticLabel maps draft pressure facts to canonical opponent pressure', () => {
  const fact = {
    label: 'draft_李科施压线',
    description: '李科是主角当前最直接的外部压力来源之一，正在把冲突推向主角被逼亮底。'
  }

  assert.equal(getFormalFactSemanticLabel(fact), '对手压力')
  assert.equal(isFormalFactSemanticLabel(fact, '对手压力'), true)
})

test('getFormalFactSemanticLabel keeps key relationship facts on one semantic label', () => {
  const fact = {
    label: 'draft_关键人物关系',
    description: '黎明是李诚阳的第十九个徒弟。'
  }

  assert.equal(getFormalFactSemanticLabel(fact), '关键关系')
  assert.equal(isFormalFactSemanticLabel(fact, '关键关系'), true)
})
