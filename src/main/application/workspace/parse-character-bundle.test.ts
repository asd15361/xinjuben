import assert from 'node:assert/strict'
import test from 'node:test'

import { parseCharacterBundleText } from './parse-character-bundle.ts'

function buildEnglishCharacterPayload(): string {
  return JSON.stringify({
    characters: [
      {
        name: 'Lin Yue',
        biography: 'A courier forced into the center of the case.',
        publicMask: 'Looks calm and compliant.',
        hiddenPressure: 'Her brother is being watched.',
        fear: 'Losing the only witness.',
        protectTarget: 'Her younger brother.',
        conflictTrigger: 'Any threat to the witness list.',
        advantage: 'She remembers every handoff route.',
        weakness: 'She trusts guilt over evidence.',
        goal: 'Pull the witness out alive.',
        arc: 'From hiding to forcing the confrontation.',
        roleLayer: 'emotion lever',
        activeBlockNos: [3, '1', 2, 3, 'bad', 0, -1]
      }
    ]
  })
}

test('parseCharacterBundleText parses English JSON keys and normalizes activeBlockNos', () => {
  const result = parseCharacterBundleText(buildEnglishCharacterPayload())

  assert.ok(result?.characters)
  assert.strictEqual(result.characters?.length, 1)
  assert.deepStrictEqual(result?.characters?.[0], {
    name: 'Lin Yue',
    biography: 'A courier forced into the center of the case.',
    publicMask: 'Looks calm and compliant.',
    hiddenPressure: 'Her brother is being watched.',
    fear: 'Losing the only witness.',
    protectTarget: 'Her younger brother.',
    conflictTrigger: 'Any threat to the witness list.',
    advantage: 'She remembers every handoff route.',
    weakness: 'She trusts guilt over evidence.',
    goal: 'Pull the witness out alive.',
    arc: 'From hiding to forcing the confrontation.',
    roleLayer: 'emotion lever',
    activeBlockNos: [1, 2, 3]
  })
})

test('parseCharacterBundleText parses common Chinese keys from AI text payloads', () => {
  const result = parseCharacterBundleText(`
角色1
姓名：苏婉
人物小传：表面是律师助理，实际在替父亲扛旧案。
表面身份：做事温和，不抢话。
隐藏压力：父亲留下的账本随时会炸。
最怕失去：最后一个愿意替她作证的人。
守护对象：妹妹
冲突触发点：有人拿妹妹逼她交账本。
优势：记忆细密，能从废纸里还原证据链。
弱点：一旦涉及家人就会失衡。
目标：保住妹妹并把账本送上桌。
人物弧线：从只想遮掩到主动作证。
人物分层：情感杠杆层
登场板块：第3板块、第1板块、第3板块
`)

  assert.ok(result?.characters)
  assert.strictEqual(result?.characters?.[0]?.name, '苏婉')
  assert.strictEqual((result?.characters?.[0] as any)?.roleLayer, '情感杠杆层')
  assert.deepStrictEqual((result?.characters?.[0] as any)?.activeBlockNos, [1, 3])
})

test('parseCharacterBundleText does not fabricate roleLayer or activeBlockNos when keys are absent', () => {
  const result = parseCharacterBundleText(
    JSON.stringify({
      characters: [
        {
          name: '赵衡',
          biography: '只给了基础人物信息。',
          publicMask: '看起来沉得住气。',
          hiddenPressure: '旧债未清。',
          fear: '证人先开口。',
          protectTarget: '母亲',
          conflictTrigger: '有人翻出旧案。',
          advantage: '手里有旧档案。',
          weakness: '不擅长求助。',
          goal: '先把母亲送走。',
          arc: '从拖延到正面应战。'
        }
      ]
    })
  )

  assert.ok(result?.characters)
  const character = result?.characters?.[0]
  assert.ok(character)
  assert.strictEqual('roleLayer' in character, false)
  assert.strictEqual('activeBlockNos' in character, false)
})

test('parseCharacterBundleText normalizes bad roleLayer and activeBlockNos without inventing useful data', () => {
  const result = parseCharacterBundleText(
    JSON.stringify({
      characters: [
        {
          name: '钱昭',
          biography: '坏值测试。',
          publicMask: '沉默。',
          hiddenPressure: '被盯上。',
          fear: '家人出事。',
          protectTarget: '弟弟',
          conflictTrigger: '旧账被翻。',
          advantage: '手快。',
          weakness: '急躁。',
          goal: '活着离场。',
          arc: '从躲避到回身。',
          roleLayer: 42,
          activeBlockNos: ['无', 0, -2, 1.5]
        }
      ]
    })
  )

  assert.ok(result?.characters)
  assert.strictEqual((result?.characters?.[0] as any)?.roleLayer, '')
  assert.deepStrictEqual((result?.characters?.[0] as any)?.activeBlockNos, [])
})

test('parseCharacterBundleText normalizes polluted descriptive names back to real anchors', () => {
  const result = parseCharacterBundleText(
    JSON.stringify({
      characters: [
        {
          name: '黎明表面无武功',
          biography: '主角一直藏锋。'
        },
        {
          name: '被妖兽蛇子',
          biography: '外部威胁逼近。'
        },
        {
          name: '被逼亮底',
          biography: '这不是人物。'
        }
      ]
    })
  )

  assert.ok(result?.characters)
  assert.deepStrictEqual(
    result?.characters?.map((character) => character.name),
    ['黎明', '妖兽蛇子']
  )
})
