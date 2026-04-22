import test from 'node:test'
import assert from 'node:assert/strict'

import type {
  CharacterDraftDto,
  OutlineDraftDto
} from '../../../../../shared/contracts/workflow.ts'
import { resolveDetailedOutlineEntryBlock } from './detailed-outline-entry-guard.ts'

function createOutline(): OutlineDraftDto {
  return {
    title: '修仙传',
    genre: '仙侠',
    theme: '代价',
    mainConflict: '争夺掌门令',
    protagonist: '林砚',
    summary: '少年卷入仙门争斗。',
    summaryEpisodes: [{ episodeNo: 1, summary: '开局被追杀。' }],
    facts: []
  }
}

function createCharacter(): CharacterDraftDto {
  return {
    name: '林砚',
    biography: '落魄外门弟子。',
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
}

test('resolveDetailedOutlineEntryBlock sends empty character roster back to character stage first', () => {
  const code = resolveDetailedOutlineEntryBlock({
    outline: createOutline(),
    characters: []
  })

  assert.equal(code, 'detailed_outline_character_missing')
})

test('resolveDetailedOutlineEntryBlock no longer blocks detailed outline on missing confirmed facts', () => {
  const code = resolveDetailedOutlineEntryBlock({
    outline: createOutline(),
    characters: [createCharacter()]
  })

  assert.equal(code, null)
})

test('resolveDetailedOutlineEntryBlock allows generation once character exists', () => {
  const outline = createOutline()

  const code = resolveDetailedOutlineEntryBlock({
    outline,
    characters: [createCharacter()]
  })

  assert.equal(code, null)
})
