import test from 'node:test'
import assert from 'node:assert/strict'

import {
  isCharacterBundleStructurallyComplete,
  isCharacterDraftStructurallyComplete,
  isCharacterStageReady,
  resolveCharacterContractAnchors
} from './character-contract.ts'

test('resolveCharacterContractAnchors falls back to outline protagonist when story intent is absent', () => {
  assert.deepEqual(
    resolveCharacterContractAnchors({
      storyIntent: null,
      outline: { protagonist: '黎明' }
    }),
    { protagonist: '黎明', antagonist: undefined }
  )
})

test('resolveCharacterContractAnchors prefers specific outline protagonist over generic story protagonist', () => {
  assert.deepEqual(
    resolveCharacterContractAnchors({
      storyIntent: { protagonist: '主角', antagonist: '名门正派大小姐' } as never,
      outline: { protagonist: '林夜' }
    }),
    { protagonist: '林夜', antagonist: '名门正派大小姐' }
  )
})

test('isCharacterDraftStructurallyComplete accepts legacy V1 contract', () => {
  assert.equal(
    isCharacterDraftStructurallyComplete({
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
    }),
    true
  )

  assert.equal(
    isCharacterDraftStructurallyComplete({
      name: '黎明',
      biography: '玄玉宫弟子',
      publicMask: '',
      hiddenPressure: '',
      fear: '',
      protectTarget: '',
      conflictTrigger: '',
      advantage: '',
      weakness: '太在意身边人',
      goal: '守住钥匙',
      arc: '从隐忍到亮底'
    }),
    false
  )
})

test('isCharacterDraftStructurallyComplete accepts V2 five-dimension contract', () => {
  assert.equal(
    isCharacterDraftStructurallyComplete({
      name: '黎明',
      biography: '',
      publicMask: '表面示弱',
      hiddenPressure: '一旦亮底会牵连师门',
      fear: '小柔出事',
      protectTarget: '小柔',
      conflictTrigger: '小柔被拿来逼供',
      advantage: '能在压力场里藏锋',
      weakness: '太想护人',
      goal: '守住钥匙',
      arc: '从忍让到反咬',
      depthLevel: 'core',
      appearance: '瘦削冷静的年轻弟子',
      personality: '表面温吞，实则极能忍',
      identity: '玄玉宫弟子',
      values: '护人比露脸更重要',
      plotFunction: '负责把被动局面拧成反设局'
    } as never),
    true
  )

  assert.equal(
    isCharacterDraftStructurallyComplete({
      name: '苏婉',
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
      appearance: '清瘦女医者',
      personality: '稳，嘴硬心软',
      identity: '医庐掌灯人',
      values: '先救活，再谈规矩',
      plotFunction: '给主角传信换证'
    } as never),
    true
  )
})

test('isCharacterDraftStructurallyComplete no longer blocks V2 core profiles for missing legacy-only fields', () => {
  assert.equal(
    isCharacterDraftStructurallyComplete({
      name: '黎明',
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
      depthLevel: 'core',
      appearance: '黑衣冷脸，眼尾有旧伤',
      personality: '沉静，压得越狠越会算',
      identity: '被打压的宗门弟子',
      values: '先护住自己人，再翻桌',
      plotFunction: '负责把被动局面一步步翻回主控'
    } as never),
    true
  )
})

test('isCharacterBundleStructurallyComplete rejects bundles missing antagonist anchor or required fields', () => {
  const completeLead = {
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
  }
  const incompleteEnemy = {
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

  assert.equal(
    isCharacterBundleStructurallyComplete({
      characters: [completeLead, incompleteEnemy],
      protagonist: '黎明',
      antagonist: '李科'
    }),
    false
  )
})

test('isCharacterStageReady keeps outline and character contract on one predicate', () => {
  assert.equal(
    isCharacterStageReady({
      outline: {
        title: '修仙传',
        theme: '不争',
        mainConflict: '黎明被逼亮底',
        summary: '李科拿小柔逼黎明亮底。',
        protagonist: '黎明'
      },
      storyIntent: {
        protagonist: '黎明',
        antagonist: '李科'
      } as never,
      characters: [
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
          advantage: '资源强',
          weakness: '自负',
          goal: '逼出钥匙',
          arc: '越压越失控'
        }
      ]
    }),
    true
  )
})

// ── 【第二刀】模糊名称匹配测试 ──────────────────────────────────

test('isCharacterBundleStructurallyComplete fuzzy matches protagonist with parenthetical suffix', () => {
  const completeChar = {
    name: '黎明（男主）',
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
  }
  assert.equal(
    isCharacterBundleStructurallyComplete({
      characters: [completeChar],
      protagonist: '黎明'
    }),
    true
  )
})

test('isCharacterBundleStructurallyComplete fuzzy matches antagonist with faction suffix', () => {
  const protagonist = {
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
  }
  const antagonist = {
    name: '李科（反派）',
    biography: '恶霸',
    publicMask: '',
    hiddenPressure: '',
    fear: '',
    protectTarget: '',
    conflictTrigger: '',
    advantage: '资源强',
    weakness: '自负',
    goal: '逼出钥匙',
    arc: '越压越失控'
  }
  assert.equal(
    isCharacterBundleStructurallyComplete({
      characters: [protagonist, antagonist],
      protagonist: '黎明',
      antagonist: '李科'
    }),
    true
  )
})

test('isCharacterBundleStructurallyComplete accepts generic size-jie antagonist from profile text', () => {
  const protagonist = {
    name: '林夜',
    biography: '云隐宗废柴弟子',
    publicMask: '',
    hiddenPressure: '',
    fear: '',
    protectTarget: '',
    conflictTrigger: '',
    advantage: '血脉初醒',
    weakness: '容易误信善意',
    goal: '查清身世',
    arc: '从被蒙蔽到掌控血脉'
  }
  const antagonist = {
    name: '林若雪',
    biography: '林家大小姐，伪装善意利用主角。',
    publicMask: '高洁优雅的名门贵女',
    hiddenPressure: '',
    fear: '',
    protectTarget: '',
    conflictTrigger: '',
    advantage: '仙盟资源',
    weakness: '傲慢',
    goal: '夺取血脉',
    arc: '从伪善操控到败露'
  }

  assert.equal(
    isCharacterBundleStructurallyComplete({
      characters: [protagonist, antagonist],
      protagonist: '林夜',
      antagonist: '名门正派大小姐'
    }),
    true
  )
})

test('isCharacterBundleStructurallyComplete fuzzy matches with substring containment', () => {
  const char = {
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
  }
  // anchor is a substring of the generated name
  assert.equal(
    isCharacterBundleStructurallyComplete({
      characters: [
        {
          ...char,
          name: '黎明·玄玉宫'
        }
      ],
      protagonist: '黎明'
    }),
    true
  )
  // generated name is a substring of the anchor
  assert.equal(
    isCharacterBundleStructurallyComplete({
      characters: [char],
      protagonist: '黎明（主角方向）'
    }),
    true
  )
})
