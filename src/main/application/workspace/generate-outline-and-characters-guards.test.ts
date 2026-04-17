import test from 'node:test'
import assert from 'node:assert/strict'

import type { CharacterDraftDto } from '../../../shared/contracts/workflow.ts'
import { isCharacterBundleStructurallyComplete } from '../../../shared/domain/workflow/character-contract.ts'
import { validateStructuredOutline } from './rough-outline-validation.ts'

test('outline guard rejects incomplete outline bundle instead of falling back', () => {
  const result = validateStructuredOutline({
    outline: {
      title: '修仙传',
      genre: '玄幻',
      theme: '不争',
      protagonist: '黎明',
      mainConflict: '黎明被逼亮底',
      summary: '总述',
      episodes: Array.from({ length: 10 }, (_, index) => ({
        episodeNo: index + 1,
        summary: `第${index + 1}集`
      }))
    },
    targetEpisodeCount: 30
  })

  assert.equal(result.ok, false)
  assert.equal(result.code, 'episode_count_short')
})

test('outline guard accepts fully structured outline bundle', () => {
  const result = validateStructuredOutline({
    outline: {
      title: '修仙传',
      genre: '玄幻',
      theme: '不争',
      protagonist: '黎明',
      mainConflict: '黎明被逼亮底',
      summary: '总述',
      episodes: Array.from({ length: 3 }, (_, index) => ({
        episodeNo: index + 1,
        summary: `第${index + 1}集`
      }))
    },
    targetEpisodeCount: 3
  })

  assert.equal(result.ok, true)
})

test('outline guard reports empty single-episode summary explicitly', () => {
  const result = validateStructuredOutline({
    outline: {
      title: '修仙传',
      genre: '玄幻',
      theme: '不争',
      protagonist: '黎明',
      mainConflict: '黎明被逼亮底',
      summary: '总述',
      episodes: [
        { episodeNo: 1, summary: '第1集' },
        { episodeNo: 2, summary: '' },
        { episodeNo: 3, summary: '第3集' }
      ]
    },
    targetEpisodeCount: 3
  })

  assert.equal(result.ok, false)
  assert.equal(result.code, 'episode_summary_missing')
  assert.deepStrictEqual(result.emptyEpisodeNos, [2])
})

test('character guard rejects bundles missing protagonist/antagonist', () => {
  const characters: CharacterDraftDto[] = [
    {
      name: '小柔',
      biography: '人物小传',
      publicMask: '',
      hiddenPressure: '',
      fear: '',
      protectTarget: '',
      conflictTrigger: '',
      advantage: '',
      weakness: '',
      goal: '',
      arc: ''
    }
  ]

  assert.equal(
    isCharacterBundleStructurallyComplete({
      characters,
      protagonist: '黎明',
      antagonist: '李科'
    }),
    false
  )
})

test('character guard rejects bundles with weak role contract even when names are present', () => {
  const characters: CharacterDraftDto[] = [
    {
      name: '黎明',
      biography: '人物小传',
      publicMask: '',
      hiddenPressure: '',
      fear: '',
      protectTarget: '',
      conflictTrigger: '',
      advantage: '能忍',
      weakness: '太在意身边人',
      goal: '守住钥匙',
      arc: '从隐忍到亮底'
    },
    {
      name: '李科',
      biography: '人物小传',
      publicMask: '',
      hiddenPressure: '',
      fear: '',
      protectTarget: '',
      conflictTrigger: '',
      advantage: '',
      weakness: '自负',
      goal: '逼出钥匙',
      arc: '越压越失控'
    }
  ]

  assert.equal(
    isCharacterBundleStructurallyComplete({
      characters,
      protagonist: '黎明',
      antagonist: '李科'
    }),
    false
  )
})
