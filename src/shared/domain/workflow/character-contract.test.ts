import test from 'node:test'
import assert from 'node:assert/strict'
import type { CharacterProfileV2Dto } from '../../contracts/character-profile-v2.ts'
import type { CharacterDraftDto } from '../../contracts/workflow.ts'

import {
  isCharacterBundleStructurallyComplete,
  isCharacterDraftStructurallyComplete,
  isCharacterStageReady,
  resolveCharacterContractAnchors
} from './character-contract.ts'

type CompleteCharacter = CharacterDraftDto & Partial<CharacterProfileV2Dto>

function makeCompleteCharacter(input: {
  name: string
  biography?: string
  publicMask?: string
  hiddenPressure?: string
  fear?: string
  protectTarget?: string
  conflictTrigger?: string
  advantage?: string
  weakness?: string
  goal?: string
  arc?: string
  identity?: string
  values?: string
  plotFunction?: string
}): CompleteCharacter {
  const name = input.name
  return {
    name,
    biography: input.biography || `${name}在当前主线里有明确人物小传。`,
    publicMask: input.publicMask || `${name}的表面演法。`,
    hiddenPressure: input.hiddenPressure || `${name}的隐藏压力。`,
    fear: input.fear || `${name}害怕失去关键关系。`,
    protectTarget: input.protectTarget || `${name}最想守住关键关系。`,
    conflictTrigger: input.conflictTrigger || `${name}被逼到现场会立刻动作。`,
    advantage: input.advantage || `${name}的优势。`,
    weakness: input.weakness || `${name}的弱点。`,
    goal: input.goal || `${name}的目标。`,
    arc: input.arc || `起点：${name}被旧立场压住；触发：核心冲突逼到眼前；摇摆：旧信念失效；代价选择：拿关键关系下注；终局变化：完成真实站位。`,
    depthLevel: 'core',
    appearance: `${name}的外在形象。`,
    personality: `${name}的性格特点。`,
    identity: input.identity || `${name}的身份。`,
    values: input.values || `${name}的价值观。`,
    plotFunction: input.plotFunction || `${name}的剧情作用。`
  } as CompleteCharacter
}

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

test('isCharacterDraftStructurallyComplete rejects legacy-only character records', () => {
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
    false
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

test('isCharacterDraftStructurallyComplete requires legacy and V2 fields together', () => {
  assert.equal(
    isCharacterDraftStructurallyComplete({
      name: '黎明',
      biography: '黎明是玄玉宫弟子，长期藏锋等待反击。',
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
    false
  )
})

test('isCharacterDraftStructurallyComplete rejects V2-only core profiles missing legacy fields', () => {
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
    false
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
        makeCompleteCharacter({
          name: '黎明',
          biography: '玄玉宫弟子',
          advantage: '能忍',
          weakness: '太在意身边人',
          goal: '守住钥匙',
          arc: '从隐忍到亮底'
        }),
        makeCompleteCharacter({
          name: '李科',
          biography: '恶霸',
          advantage: '资源强',
          weakness: '自负',
          goal: '逼出钥匙',
          arc: '越压越失控'
        })
      ]
    }),
    true
  )
})

// ── 【第二刀】模糊名称匹配测试 ──────────────────────────────────

test('isCharacterBundleStructurallyComplete fuzzy matches protagonist with parenthetical suffix', () => {
  const completeChar = makeCompleteCharacter({
    name: '黎明（男主）',
    biography: '玄玉宫弟子',
    advantage: '能忍',
    weakness: '太在意身边人',
    goal: '守住钥匙',
    arc: '从隐忍到亮底'
  })
  assert.equal(
    isCharacterBundleStructurallyComplete({
      characters: [completeChar],
      protagonist: '黎明'
    }),
    true
  )
})

test('isCharacterBundleStructurallyComplete fuzzy matches antagonist with faction suffix', () => {
  const protagonist = makeCompleteCharacter({
    name: '黎明',
    biography: '玄玉宫弟子',
    advantage: '能忍',
    weakness: '太在意身边人',
    goal: '守住钥匙',
    arc: '从隐忍到亮底'
  })
  const antagonist = makeCompleteCharacter({
    name: '李科（反派）',
    biography: '恶霸',
    advantage: '资源强',
    weakness: '自负',
    goal: '逼出钥匙',
    arc: '越压越失控'
  })
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
  const protagonist = makeCompleteCharacter({
    name: '林夜',
    biography: '云隐宗废柴弟子',
    advantage: '血脉初醒',
    weakness: '容易误信善意',
    goal: '查清身世',
    arc: '从被蒙蔽到掌控血脉'
  })
  const antagonist = makeCompleteCharacter({
    name: '林若雪',
    biography: '林家大小姐，伪装善意利用主角。',
    publicMask: '高洁优雅的名门贵女',
    advantage: '仙盟资源',
    weakness: '傲慢',
    goal: '夺取血脉',
    arc: '从伪善操控到败露',
    identity: '林家大小姐',
    values: '家族名声高于一切',
    plotFunction: '伪装善意利用主角并制造信任背叛'
  })

  assert.equal(
    isCharacterBundleStructurallyComplete({
      characters: [protagonist, antagonist],
      protagonist: '林夜',
      antagonist: '名门正派大小姐'
    }),
    true
  )
})

test('isCharacterBundleStructurallyComplete does not require literal generic protagonist anchor', () => {
  const protagonist = makeCompleteCharacter({
    name: '叶辰',
    biography: '青云宗外门弟子，被众人视作废柴，体内藏着魔尊血脉。',
    advantage: '魔尊血脉爆发力强',
    weakness: '血脉失控会伤及身边人',
    goal: '查清身世并保护身边人',
    arc: '从隐忍废柴到掌控血脉'
  })

  assert.equal(
    isCharacterBundleStructurallyComplete({
      characters: [protagonist],
      protagonist: '主角'
    }),
    true
  )
})

test('isCharacterBundleStructurallyComplete fuzzy matches with substring containment', () => {
  const char = makeCompleteCharacter({
    name: '黎明',
    biography: '玄玉宫弟子',
    advantage: '能忍',
    weakness: '太在意身边人',
    goal: '守住钥匙',
    arc: '从隐忍到亮底'
  })
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
