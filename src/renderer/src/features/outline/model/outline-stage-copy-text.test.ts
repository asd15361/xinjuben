import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildEntityStoreCopyText,
  buildFormalFactsCopyText,
  buildOutlineBasicsCopyText,
  buildOutlineEpisodeCopyText,
  buildOutlineStageCopyText
} from './outline-stage-copy-text.ts'

test('buildOutlineEpisodeCopyText formats one episode', () => {
  const text = buildOutlineEpisodeCopyText({
    episodeNo: 1,
    summary: '吊坠被踩碎，主角首次觉醒。'
  })

  assert.match(text, /## 第 1 集/)
  assert.match(text, /剧情：吊坠被踩碎/)
})

test('buildOutlineBasicsCopyText includes outline basics and episodes', () => {
  const text = buildOutlineBasicsCopyText({
    title: '魔尊归来',
    genre: '男频修仙',
    theme: '废柴逆袭',
    protagonist: '秦墨',
    mainConflict: '魔尊血脉被正道觊觎',
    summary: '主角被欺辱后觉醒。',
    summaryEpisodes: [{ episodeNo: 1, summary: '吊坠破碎。' }],
    facts: []
  })

  assert.match(text, /# 剧本骨架/)
  assert.match(text, /剧本名称：魔尊归来/)
  assert.match(text, /# 分集剧情/)
})

test('buildEntityStoreCopyText includes factions and characters', () => {
  const text = buildEntityStoreCopyText({
    factions: [
      {
        id: 'f1',
        projectId: 'p1',
        type: 'faction',
        name: '正道联盟',
        aliases: [],
        summary: '表面正义。',
        tags: [],
        provenance: {
          provenanceTier: 'system_inferred',
          originAuthorityType: 'system_inferred',
          originDeclaredBy: 'system',
          sourceStage: 'outline',
          createdAt: 'now',
          updatedAt: 'now'
        },
        factionType: 'sect',
        memberCharacterIds: []
      }
    ],
    characters: [
      {
        id: 'c1',
        projectId: 'p1',
        type: 'character',
        name: '柳清音',
        aliases: [],
        summary: '反派大小姐。',
        tags: [],
        provenance: {
          provenanceTier: 'system_inferred',
          originAuthorityType: 'system_inferred',
          originDeclaredBy: 'system',
          sourceStage: 'outline',
          createdAt: 'now',
          updatedAt: 'now'
        },
        roleLayer: 'core',
        goals: [],
        pressures: [],
        linkedFactionIds: [],
        linkedLocationIds: [],
        linkedItemIds: []
      }
    ],
    relations: [],
    items: [],
    locations: []
  })

  assert.match(text, /# 世界底账/)
  assert.match(text, /正道联盟：表面正义。/)
  assert.match(text, /柳清音：反派大小姐。/)
})

test('buildFormalFactsCopyText includes fact status', () => {
  const text = buildFormalFactsCopyText([
    {
      id: 'fact1',
      label: '母亲吊坠',
      description: '吊坠不是一次性道具。',
      linkedToPlot: true,
      linkedToTheme: true,
      authorityType: 'user_declared',
      status: 'confirmed',
      level: 'core',
      declaredBy: 'user',
      declaredStage: 'outline',
      createdAt: 'now',
      updatedAt: 'now'
    }
  ])

  assert.match(text, /## 母亲吊坠/)
  assert.match(text, /状态：confirmed/)
})

test('buildOutlineStageCopyText joins outline, entity store and facts', () => {
  const text = buildOutlineStageCopyText({
    outline: {
      title: '魔尊归来',
      genre: '',
      theme: '',
      protagonist: '',
      mainConflict: '',
      summary: '',
      summaryEpisodes: [],
      facts: []
    },
    entityStore: null
  })

  assert.match(text, /# 剧本骨架/)
  assert.match(text, /# 世界底账/)
  assert.match(text, /# 核心设定/)
})
