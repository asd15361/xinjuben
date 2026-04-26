import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildCharacterProfileCopyText,
  buildCharacterStageCopyText,
  buildFactionRosterCopyText,
  buildLightCharacterCopyText
} from './character-stage-copy-text.ts'
import type { CharacterStageSections } from './derive-character-stage-sections.ts'

test('buildCharacterProfileCopyText includes the useful full profile fields', () => {
  const text = buildCharacterProfileCopyText({
    name: '秦墨',
    appearance: '黑衣少年，身形清瘦',
    personality: '隐忍但不服输',
    identity: '外门废柴弟子',
    values: '欠他的必须讨回来',
    plotFunction: '承接血脉觉醒和复仇主线',
    protectTarget: '母亲吊坠',
    fear: '身世真相被夺',
    conflictTrigger: '吊坠被踩碎',
    goal: '查清父母旧案',
    publicMask: '废柴弟子',
    hiddenPressure: '魔尊血脉被封印',
    advantage: '血脉觉醒',
    weakness: '不知真相',
    arc: '从被欺辱到主动掌控力量',
    biography: '主角。'
  })

  assert.match(text, /## 秦墨/)
  assert.match(text, /外在形象：黑衣少年，身形清瘦/)
  assert.match(text, /性格特点：隐忍但不服输/)
  assert.match(text, /身份：外门废柴弟子/)
  assert.match(text, /价值观：欠他的必须讨回来/)
  assert.match(text, /剧情作用：承接血脉觉醒和复仇主线/)
  assert.match(text, /最想守：母亲吊坠/)
  assert.match(text, /暗里卡着：魔尊血脉被封印/)
  assert.match(text, /人物弧线：从被欺辱到主动掌控力量/)
})

test('buildCharacterProfileCopyText exposes cleaned biography without field-stitched template phrases', () => {
  const text = buildCharacterProfileCopyText({
    name: '李雪儿',
    appearance: '年约十八，容貌清丽',
    personality: '正义感强，率真冲动',
    identity: '掌门之女，青云宗筑基后期弟子',
    values: '正义、忠诚、家族荣誉',
    plotFunction: '作为主角在宗门内最直接的盟友',
    protectTarget: '林尘和父亲李掌门',
    fear: '父亲身败名裂',
    conflictTrigger: '有人当面羞辱或陷害林尘时',
    goal: '帮助林尘洗清冤屈',
    publicMask: '掌门之女',
    hiddenPressure: '父亲名声与魔尊血脉之间的矛盾',
    advantage: '掌门之女身份和青云宗剑法',
    weakness: '冲动',
    arc: '起点：天真冲动；触发：林尘被诬陷；摇摆：违反门规；代价选择：放弃精英身份；终局变化：独当一面。',
    biography:
      '李雪儿是掌门之女，青云宗筑基后期弟子，年约十八，容貌清丽。正义感强，率真冲动让李雪儿信奉正义、忠诚、家族荣誉。'
  })

  assert.match(text, /小传：李雪儿是掌门之女/)
  assert.equal(text.includes('身份是'), false)
  assert.equal(text.includes('性格底色'), false)
  assert.equal(text.includes('在戏里'), false)
  assert.equal(text.includes('牵动他的软肋'), false)
})

test('buildLightCharacterCopyText includes faction and role data', () => {
  const text = buildLightCharacterCopyText({
    entityId: 'c1',
    name: '执事位',
    summary: '执行宗门命令。',
    roleLayer: 'active',
    roleLayerLabel: '活跃人物',
    factionNames: ['正道联盟'],
    factionRole: '执事位',
    publicIdentity: '正道联盟执事',
    stance: '先执行上令',
    currentFunction: '盯具体人和事',
    voiceStyle: '命令式',
    identityMode: 'slot',
    upgradeCandidate: false,
    goalPreview: '撑住正道联盟',
    pressurePreview: '只能听命上层'
  })

  assert.match(text, /## 执事位/)
  assert.match(text, /阵营：正道联盟/)
  assert.match(text, /当前功能：盯具体人和事/)
})

test('buildFactionRosterCopyText includes members and seats', () => {
  const text = buildFactionRosterCopyText({
    factionId: 'f1',
    name: '正道联盟',
    factionType: 'sect',
    factionTypeLabel: '宗门',
    summary: '表面正义。',
    members: [{ entityId: 'c1', name: '柳清音', roleLayer: 'core', roleLayerLabel: '核心人物', isFullProfile: true }],
    placeholderSeats: [{ seatKey: 's1', label: '护法位', roleLayer: 'functional', roleLayerLabel: '功能人物' }],
    seatCount: 2
  })

  assert.match(text, /## 正道联盟/)
  assert.match(text, /柳清音 · 已升完整/)
  assert.match(text, /护法位 · 功能人物/)
})

test('buildCharacterStageCopyText groups all stage sections', () => {
  const sections: CharacterStageSections = {
    fullProfiles: [
      {
        name: '秦墨',
        biography: '主角。',
        publicMask: '废柴弟子',
        hiddenPressure: '魔尊血脉',
        fear: '',
        protectTarget: '',
        conflictTrigger: '',
        advantage: '',
        weakness: '',
        goal: '',
        arc: ''
      }
    ],
    lightCards: [],
    factionRoster: [],
    factionSeatCount: 0
  }

  const text = buildCharacterStageCopyText(sections)

  assert.match(text, /# 人物小传/)
  assert.match(text, /完整人物小传：1/)
  assert.match(text, /# 轻量人物卡/)
})
