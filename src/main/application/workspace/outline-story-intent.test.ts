import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeOutlineStoryIntent } from './outline-story-intent.ts'

test('normalizeOutlineStoryIntent only cleans input and does not backfill from fallback argument', () => {
  const normalized = normalizeOutlineStoryIntent(
    {
      protagonist: '黎明表面无武功',
      officialKeyCharacters: ['黎明表面无武功', '小柔'],
      generationBriefText: '【项目】修仙传｜30集'
    },
    {
      titleHint: '修仙传',
      genre: '玄幻',
      tone: '',
      audience: '',
      sellingPremise: '旧卖点',
      coreDislocation: '旧错位',
      emotionalPayoff: '旧情绪',
      protagonist: '旧主角',
      antagonist: '旧反派',
      coreConflict: '旧冲突',
      endingDirection: '旧结局',
      officialKeyCharacters: ['旧主角'],
      lockedCharacterNames: ['旧主角'],
      themeAnchors: ['旧主题'],
      worldAnchors: ['旧世界'],
      relationAnchors: ['旧关系'],
      dramaticMovement: ['旧推进'],
      manualRequirementNotes: '旧备注',
      freeChatFinalSummary: '旧总结',
      generationBriefText: '【项目】旧项目｜10集'
    }
  )

  assert.equal(normalized.protagonist, '黎明')
  assert.deepEqual(normalized.officialKeyCharacters, ['黎明', '小柔'])
  assert.equal(normalized.sellingPremise, '')
  assert.equal(normalized.antagonist, '')
})
