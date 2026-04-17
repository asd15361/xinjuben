import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildShortDramaConstitutionFromStoryIntent,
  normalizeShortDramaConstitution,
  renderShortDramaConstitutionPromptBlock
} from './short-drama-constitution.ts'

test('buildShortDramaConstitutionFromStoryIntent seeds a constitution from story intent', () => {
  const constitution = buildShortDramaConstitutionFromStoryIntent({
    sellingPremise: '黎明被逼卷进一场反杀局',
    coreDislocation: '黎明以为忍住就能保全一切',
    emotionalPayoff: '一路反咬的爽感',
    protagonist: '黎明',
    antagonist: '李科',
    coreConflict: '黎明被逼在追杀和旧账之间反打',
    endingDirection: '最后把旧账打回去',
    dramaticMovement: ['先守人再反打', '每集都被逼着改打法']
  })

  assert.equal(constitution.corePrinciple, '快节奏、强冲突、稳情绪')
  assert.equal(constitution.coreEmotion, '一路反咬的爽感')
  assert.match(constitution.incitingIncident.disruption, /反杀局|反打/)
  assert.equal(constitution.protagonistArc.flawBelief, '黎明以为忍住就能保全一切')
  assert.equal(constitution.povPolicy.mode, 'single_protagonist')
  assert.deepEqual(constitution.povPolicy.allowedAuxiliaryViewpoints, ['李科'])
  assert.match(
    constitution.characterPolicy?.stateDrivenConflictRule || '',
    /人物当下心理状态|当前压力/
  )
})

test('normalizeShortDramaConstitution cleans empty nested fields', () => {
  const constitution = normalizeShortDramaConstitution({
    corePrinciple: '',
    coreEmotion: '',
    povPolicy: {
      mode: 'single_protagonist',
      allowedAuxiliaryViewpoints: ['李科', '', '  '],
      restriction: ''
    }
  })

  assert.equal(constitution?.corePrinciple, '快节奏、强冲突、稳情绪')
  assert.equal(constitution?.coreEmotion, '爽感持续兑现')
  assert.deepEqual(constitution?.povPolicy.allowedAuxiliaryViewpoints, ['李科'])
  assert.match(constitution?.povPolicy.restriction || '', /单主角视角/)
  assert.match(constitution?.characterPolicy?.noForcedStupidityRule || '', /降智/)
})

test('renderShortDramaConstitutionPromptBlock renders the constitution into prompt text', () => {
  const block = renderShortDramaConstitutionPromptBlock(
    buildShortDramaConstitutionFromStoryIntent({
      sellingPremise: '林秋被拖进反杀局',
      emotionalPayoff: '爽感',
      protagonist: '林秋',
      antagonist: '周沉',
      coreConflict: '林秋被逼反打'
    })
  )

  assert.match(block, /核心原则：快节奏、强冲突、稳情绪/)
  assert.match(block, /核心情绪：爽感/)
  assert.match(block, /视角规则：默认单主角视角/)
  assert.match(block, /人物行为边界：冲突=/)
})
