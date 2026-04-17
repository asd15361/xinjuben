import test from 'node:test'
import assert from 'node:assert/strict'

import type { CharacterDraftDto } from '../../../shared/contracts/workflow.ts'
import { normalizeCharacterDrafts } from '../../../shared/domain/workflow/character-draft-normalization.ts'

test('formal character output keeps model-written fields after normalization', () => {
  const rawCharacters: CharacterDraftDto[] = [
    {
      name: '小柔',
      biography: '乞丐的女儿，起初不喜欢黎明，后被其智慧打动。',
      publicMask: '表面冷着脸，不轻易信人。',
      hiddenPressure: '一直被李科当筹码盯着。',
      fear: '最怕自己拖累黎明。',
      protectTarget: '想守住自己还能选的那条路。',
      conflictTrigger: '李科再拿她逼黎明，她就会改站位。',
      advantage: '能把关系变化变成真正压力。',
      weakness: '越在意谁，越容易被拿来做杠杆。',
      goal: '活下来，并看清谁值得靠近。',
      arc: '从看不懂黎明到真正站到他这边。'
    }
  ]

  const normalized = normalizeCharacterDrafts(rawCharacters)
  assert.equal(normalized[0]?.publicMask, '表面冷着脸，不轻易信人。')
  assert.equal(normalized[0]?.arc, '从看不懂黎明到真正站到他这边。')
})
