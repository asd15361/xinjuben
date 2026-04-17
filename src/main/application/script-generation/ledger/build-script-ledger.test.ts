import test from 'node:test'
import assert from 'node:assert/strict'

import { buildScriptStateLedger } from './build-script-ledger.ts'

test('buildScriptStateLedger tracks custody lock, injury streak, and tactic repetition', () => {
  const ledger = buildScriptStateLedger({
    storyIntent: null,
    outline: {
      title: '修仙传',
      genre: '修仙',
      theme: '忍到反咬',
      mainConflict: '黎明被李科和残党围逼',
      protagonist: '黎明',
      summary: 'summary',
      summaryEpisodes: [],
      facts: []
    },
    characters: [
      {
        name: '黎明',
        biography: '守钥人',
        publicMask: '',
        hiddenPressure: '',
        fear: '小柔出事',
        protectTarget: '小柔',
        conflictTrigger: '小柔被拿住',
        advantage: '能反设局',
        weakness: '太想护人',
        goal: '守住钥匙',
        arc: '从忍到反咬'
      },
      {
        name: '李科',
        biography: '反派',
        publicMask: '',
        hiddenPressure: '',
        fear: '',
        protectTarget: '',
        conflictTrigger: '',
        advantage: '权势压人',
        weakness: '自负',
        goal: '逼出钥匙',
        arc: '失控'
      }
    ],
    script: [
      {
        sceneNo: 18,
        screenplay: '第18集\n黎明掏出血契原件，李科被押回候审。',
        action: '黎明吐血后掏出血契原件，执事将李科押回候审。',
        dialogue: '黎明：血契在这。\n执事：把李科押回候审。',
        emotion: '黎明强撑着站住。'
      },
      {
        sceneNo: 19,
        screenplay: '第19集\n合议堂对质三证，李科被押入地牢。',
        action: '黎明咳出黑血，把账本和密信拍上桌。李科被押入地牢。',
        dialogue: '黎明：账本、密信、血契都在这里。\n李诚阳：押入地牢。',
        emotion: '黎明毒发跪地，李科嘶吼。'
      }
    ]
  })

  const lead = ledger.characters.find((character) => character.name === '黎明')
  const villain = ledger.characters.find((character) => character.name === '李科')

  assert.equal(lead?.continuityStatus.injuryStatus, '重伤')
  assert.equal(lead?.continuityStatus.injuryEpisodeStreak, 2)
  assert.equal(villain?.continuityStatus.custodyStatus, 'captured')
  assert.equal(villain?.continuityStatus.canActDirectly, false)
  assert.equal(villain?.continuityStatus.custodyEpisodeStreak, 2)
  assert.ok((ledger.usedTactics || []).filter((item) => item === 'paper_evidence').length >= 2)
  assert.ok(ledger.preflight.issues.some((issue) => issue.code === 'injury_streak_overload'))
  assert.ok(ledger.preflight.issues.some((issue) => issue.code === 'character_custody_lock'))
})
