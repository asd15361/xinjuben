import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeOutlineStoryIntent } from './outline-story-intent.ts'

test('normalizeOutlineStoryIntent only cleans input and does not backfill from fallback argument', () => {
  const normalized = normalizeOutlineStoryIntent({
    protagonist: '黎明表面无武功',
    officialKeyCharacters: ['黎明表面无武功', '小柔'],
    generationBriefText: '【项目】修仙传｜30 集'
  })

  assert.equal(normalized.protagonist, '黎明')
  assert.deepEqual(normalized.officialKeyCharacters, ['黎明', '小柔'])
  assert.equal(normalized.sellingPremise, '')
  assert.equal(normalized.antagonist, '')
})
