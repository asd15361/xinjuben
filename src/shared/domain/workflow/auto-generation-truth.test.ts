import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveProjectEpisodeCount } from './episode-count.ts'

function hasStableTargetEpisodes(targetEpisodes: number): boolean {
  return Number.isFinite(targetEpisodes) && Math.floor(targetEpisodes) > 0
}

test('auto-chain guard rejects missing target episode truth', () => {
  assert.equal(hasStableTargetEpisodes(0), false)
  assert.equal(hasStableTargetEpisodes(Number.NaN), false)
})

test('auto-chain guard accepts target episodes from confirmed story intent', () => {
  const targetEpisodes = resolveProjectEpisodeCount({
    storyIntent: {
      titleHint: '修仙传',
      genre: '',
      tone: '',
      audience: '',
      sellingPremise: '',
      coreDislocation: '',
      emotionalPayoff: '',
      protagonist: '',
      antagonist: '',
      coreConflict: '',
      endingDirection: '',
      officialKeyCharacters: [],
      lockedCharacterNames: [],
      themeAnchors: [],
      worldAnchors: [],
      relationAnchors: [],
      dramaticMovement: [],
      manualRequirementNotes: '',
      freeChatFinalSummary: '',
      generationBriefText: '【项目】修仙传｜30集',
      confirmedChatTranscript: '用户：确认30集'
    }
  })

  assert.equal(hasStableTargetEpisodes(targetEpisodes), true)
  assert.equal(targetEpisodes, 30)
})
