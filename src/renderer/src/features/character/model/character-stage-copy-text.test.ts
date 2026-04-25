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
  assert.match(text, /最想守：母亲吊坠/)
  assert.match(text, /暗里卡着：魔尊血脉被封印/)
  assert.match(text, /人物弧线：从被欺辱到主动掌控力量/)
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
