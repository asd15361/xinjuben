import test from 'node:test'
import assert from 'node:assert/strict'

import { validateStageInputContract } from './validate-stage-input.ts'
import type { CharacterDraftDto, OutlineDraftDto } from '../../../shared/contracts/workflow.ts'

function createOutline(): OutlineDraftDto {
  return {
    title: '修仙传',
    genre: '玄幻修仙',
    theme: '不争',
    mainConflict: '黎明被逼亮底',
    protagonist: '黎明',
    summary: '李科拿小柔逼黎明亮底。',
    summaryEpisodes: [{ episodeNo: 1, summary: '李科逼黎明亮底。' }],
    facts: []
  }
}

function createCharacters(): CharacterDraftDto[] {
  return [
    {
      name: '黎明',
      biography: '玄玉宫弟子',
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
      biography: '恶霸',
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
}

function createCompleteCharacters(): CharacterDraftDto[] {
  return [
    {
      name: '黎明',
      biography: '玄玉宫弟子，负责守住钥匙。',
      publicMask: '闹市里的低调年轻人',
      hiddenPressure: '一旦亮底就会把钥匙和身边人一起推上台面',
      fear: '小柔因自己出事',
      protectTarget: '小柔',
      conflictTrigger: '李科拿小柔逼他亮底',
      advantage: '会忍也会算',
      weakness: '太在意要护的人',
      goal: '守住钥匙并护住小柔',
      arc: '从藏武忍让走到被逼反咬'
    },
    {
      name: '李科',
      biography: '闹市恶霸，盯着黎明和小柔。',
      publicMask: '嚣张强势的地头蛇',
      hiddenPressure: '被蛇子缠上后急着找替身和出口',
      fear: '自己先被蛇子拖死',
      protectTarget: '自己',
      conflictTrigger: '拿不到钥匙就继续拿小柔逼人',
      advantage: '狠、敢压人',
      weakness: '自负又短视',
      goal: '逼出钥匙并压住黎明',
      arc: '一路加码直到把自己也拖进局里'
    }
  ]
}

test('validateStageInputContract keeps character and detailed_outline on the same character predicate', () => {
  const payload = {
    storyIntent: {
      protagonist: '黎明',
      antagonist: '李科'
    } as never,
    outline: createOutline(),
    characters: createCharacters(),
    segments: [],
    script: []
  }

  const characterValidation = validateStageInputContract('character', payload)
  const detailedOutlineValidation = validateStageInputContract('detailed_outline', payload)

  assert.equal(characterValidation.ready, false)
  assert.equal(detailedOutlineValidation.ready, false)
  assert.ok(
    characterValidation.issues.some((issue) => issue.code === 'character_contract_incomplete')
  )
  assert.ok(
    detailedOutlineValidation.issues.some(
      (issue) => issue.code === 'detailed_outline_character_contract_weak'
    )
  )
})

test('validateStageInputContract no longer blocks detailed_outline when confirmed formal facts are missing', () => {
  const validation = validateStageInputContract('detailed_outline', {
    storyIntent: {
      protagonist: '黎明',
      antagonist: '李科'
    } as never,
    outline: createOutline(),
    characters: createCompleteCharacters(),
    segments: [],
    script: []
  })

  assert.equal(validation.ready, true)
  assert.deepEqual(validation.issues, [])
})

test('validateStageInputContract accepts V2 character contract at character stage', () => {
  const validation = validateStageInputContract('character', {
    storyIntent: {
      protagonist: '黎明',
      antagonist: '李科'
    } as never,
    outline: createOutline(),
    characters: [
      {
        name: '黎明',
        biography: '',
        publicMask: '表面示弱',
        hiddenPressure: '一旦亮底会牵连小柔',
        fear: '小柔出事',
        protectTarget: '小柔',
        conflictTrigger: '李科再拿小柔逼他',
        advantage: '能在压力里藏锋',
        weakness: '越想护人越会露底',
        goal: '守住钥匙',
        arc: '从藏锋到反设局',
        depthLevel: 'core',
        appearance: '瘦削冷脸的年轻弟子',
        personality: '外冷内忍',
        identity: '玄玉宫弟子',
        values: '先护人，再亮底',
        plotFunction: '把被动局面反拧回自己手里'
      },
      {
        name: '李科',
        biography: '',
        publicMask: '',
        hiddenPressure: '',
        fear: '',
        protectTarget: '',
        conflictTrigger: '',
        advantage: '',
        weakness: '',
        goal: '',
        arc: '',
        depthLevel: 'mid',
        appearance: '衣着张扬的地头蛇',
        personality: '自负凶狠',
        identity: '闹市恶霸',
        values: '位置比人命更重要',
        plotFunction: '持续给主角施压'
      }
    ] as never,
    segments: [],
    script: []
  })

  assert.equal(validation.ready, true)
  assert.deepEqual(validation.issues, [])
})
