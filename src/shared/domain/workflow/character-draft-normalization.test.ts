import test from 'node:test'
import assert from 'node:assert/strict'

import {
  cleanCharacterLikeName,
  normalizeCharacterDrafts
} from './character-draft-normalization.ts'

test('cleanCharacterLikeName removes descriptive fragments and passive wrappers', () => {
  assert.equal(cleanCharacterLikeName('黎明表面无武功'), '黎明')
  assert.equal(cleanCharacterLikeName('被妖兽蛇子'), '妖兽蛇子')
  assert.equal(cleanCharacterLikeName('被逼亮底'), '')
  assert.equal(cleanCharacterLikeName('韦小宝实则另有目'), '韦小宝')
  assert.equal(cleanCharacterLikeName('妓院长大'), '')
  assert.equal(cleanCharacterLikeName('天地'), '')
})

test('normalizeCharacterDrafts dedupes polluted aliases back to the clean character anchor', () => {
  const drafts = normalizeCharacterDrafts([
    {
      name: '黎明表面无武功',
      biography: '旧脏名人物。',
      publicMask: '',
      hiddenPressure: '',
      fear: '',
      protectTarget: '',
      conflictTrigger: '',
      advantage: '',
      weakness: '',
      goal: '',
      arc: ''
    },
    {
      name: '黎明',
      biography: '真正主角。',
      publicMask: '表面低调藏锋。',
      hiddenPressure: '',
      fear: '',
      protectTarget: '',
      conflictTrigger: '',
      advantage: '',
      weakness: '',
      goal: '',
      arc: ''
    },
    {
      name: '被妖兽蛇子',
      biography: '外部威胁逼近。',
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
  ])

  assert.deepEqual(
    drafts.map((draft) => draft.name),
    ['黎明', '妖兽蛇子']
  )
  assert.equal(drafts[0]?.biography, '真正主角。')
})

test('normalizeCharacterDrafts drops legacy external-pressure pseudo characters', () => {
  const drafts = normalizeCharacterDrafts([
    {
      name: '被妖兽蛇子',
      biography: '被妖兽蛇子围着并缠身和小柔持续施压',
      publicMask: '被妖兽蛇子表面像一股越来越近的外压，不跟任何人讲道理。',
      hiddenPressure:
        '被妖兽蛇子不是站队角色，而是会顺着钥匙和局势裂口不断放大代价，谁失手它就咬谁。',
      fear: '被妖兽蛇子最怕的不是输赢，而是自己真正被看穿和被提前压回去。',
      protectTarget: '被妖兽蛇子只会守自己的扩张节奏和外压边界，不会替任何人守体面。',
      conflictTrigger: '只要李科继续逼近钥匙，或黎明亮底过猛，被妖兽蛇子就会立刻把外压推上台面。',
      advantage: '',
      weakness: '',
      goal: '被妖兽蛇子要把这条线里的漏洞和代价全部逼出来，让所有人都没法只靠嘴硬撑过去。',
      arc: '被妖兽蛇子会从远处逼近的危险，变成主线后段必须正面处理的实质灾难。'
    }
  ])

  assert.deepEqual(drafts, [])
})

test('normalizeCharacterDrafts keeps real characters even when legacy external-pressure fields polluted them', () => {
  const drafts = normalizeCharacterDrafts([
    {
      name: '李诚阳',
      biography: '玄玉宫道长，女性，35岁左右，在山中镇守。她是黎明的师父。',
      publicMask: '李诚阳表面像一股越来越近的外压，不跟任何人讲道理。',
      hiddenPressure: '李诚阳不是站队角色，而是会顺着钥匙和局势裂口不断放大代价，谁失手它就咬谁。',
      fear: '李诚阳最怕的不是输赢，而是自己真正被看穿和被提前压回去。',
      protectTarget: '李诚阳只会守自己的扩张节奏和外压边界，不会替任何人守体面。',
      conflictTrigger: '只要李科继续逼近钥匙，或黎明亮底过猛，李诚阳就会立刻把外压推上台面。',
      advantage: '',
      weakness: '',
      goal: '李诚阳要把这条线里的漏洞和代价全部逼出来，让所有人都没法只靠嘴硬撑过去。',
      arc: '李诚阳会从远处逼近的危险，变成主线后段必须正面处理的实质灾难。'
    }
  ])

  assert.deepEqual(
    drafts.map((draft) => draft.name),
    ['李诚阳']
  )
})
