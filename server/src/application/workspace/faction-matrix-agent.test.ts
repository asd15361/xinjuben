import test from 'node:test'
import assert from 'node:assert/strict'

import { buildFactionMatrixAgentPrompt } from './faction-matrix-agent.ts'
import type { StoryIntentPackageDto } from '@shared/contracts/intake'

function buildStoryIntent(): StoryIntentPackageDto {
  return {
    titleHint: '魔尊血脉',
    genre: '男频修仙',
    protagonist: '林烬',
    antagonist: '仙盟大小姐',
    coreConflict: '废柴少年被仙盟大小姐利用，查清父母旧仇并掌控魔尊血脉',
    generationBriefText: '【项目】魔尊血脉｜20集\n林烬的母亲吊坠被踩碎后觉醒魔尊血脉。',
    officialKeyCharacters: [],
    lockedCharacterNames: [],
    themeAnchors: [],
    worldAnchors: [],
    relationAnchors: [],
    dramaticMovement: []
  }
}

test('20 episode faction matrix prompt uses compact but multi-camp roster requirements', () => {
  const prompt = buildFactionMatrixAgentPrompt({
    storyIntent: buildStoryIntent(),
    totalEpisodes: 20
  })

  assert.match(prompt, /至少拆解出 3 个一级势力/)
  assert.match(prompt, /每个二级分支必须包含至少 2 个人物占位符/)
  assert.doesNotMatch(prompt, /每个二级分支必须包含至少 3 个人物占位符/)
  assert.match(prompt, /第三方旧案\/中立\/隐秘遗脉方/)
  assert.match(prompt, /至少 2 条关键交叉关系/)
  assert.match(prompt, /3-5 个高复用可拍场景/)
  assert.match(prompt, /同一场景反复承载不同阵营冲突/)
  assert.match(prompt, /默认角色池预算：3 个核心人物、3 个轻量人物、5 个功能人物/)
  assert.match(prompt, /同一个功能位可以跨多个场景复用/)
  assert.match(prompt, /reusableRoleKey/)
  assert.match(prompt, /reuseSceneKeys/)
})

test('hidden bloodline xianxia prompt forbids turning protagonist into a public demon leader', () => {
  const prompt = buildFactionMatrixAgentPrompt({
    storyIntent: buildStoryIntent(),
    totalEpisodes: 20
  })

  assert.match(prompt, /题材策略层/)
  assert.match(prompt, /隐藏血脉修仙项目/)
  assert.match(prompt, /禁止把主角前期写成魔渊宗宗主/)
  assert.match(prompt, /真女主和反派大小姐必须分开/)
  assert.match(prompt, /吊坠碎片是贯穿线索/)
  assert.match(prompt, /禁止自动加入退婚/)
})

test('marketProfile strategy prevents xianxia fallback rules from leaking into female CEO projects', () => {
  const prompt = buildFactionMatrixAgentPrompt({
    storyIntent: {
      ...buildStoryIntent(),
      genre: '男频修仙',
      marketProfile: {
        audienceLane: 'female',
        subgenre: '女频霸总甜宠'
      },
      generationBriefText: '用户旧描述里误写过魔尊血脉和宗门，但当前项目选择是女频霸总甜宠。'
    },
    totalEpisodes: 20
  })

  assert.match(prompt, /策略：女频霸总甜宠/)
  assert.match(prompt, /集团|豪门/)
  assert.doesNotMatch(prompt, /隐藏血脉修仙项目/)
  assert.doesNotMatch(prompt, /魔渊宗宗主/)
})

test('60 episode faction matrix prompt keeps full roster requirements', () => {
  const prompt = buildFactionMatrixAgentPrompt({
    storyIntent: buildStoryIntent(),
    totalEpisodes: 60
  })

  assert.match(prompt, /至少拆解出 8 个一级势力/)
  assert.match(prompt, /全表角色位最低 30 个，标准建议 39 个/)
  assert.match(prompt, /默认角色池预算：5 个核心人物、5 个轻量人物、10 个功能人物/)
  assert.match(prompt, /群像\/跑龙套/)
})
