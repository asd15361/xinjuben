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

test('20 episode faction matrix prompt uses lightweight roster requirements', () => {
  const prompt = buildFactionMatrixAgentPrompt({
    storyIntent: buildStoryIntent(),
    totalEpisodes: 20
  })

  assert.match(prompt, /至少拆解出 2 个一级势力/)
  assert.match(prompt, /每个二级分支必须包含至少 2 个人物占位符/)
  assert.doesNotMatch(prompt, /至少拆解出 3 个一级势力/)
  assert.doesNotMatch(prompt, /每个二级分支必须包含至少 3 个人物占位符/)
})

test('60 episode faction matrix prompt keeps full roster requirements', () => {
  const prompt = buildFactionMatrixAgentPrompt({
    storyIntent: buildStoryIntent(),
    totalEpisodes: 60
  })

  assert.match(prompt, /至少拆解出 3 个一级势力/)
  assert.match(prompt, /每个二级分支必须包含至少 3 个人物占位符/)
})
