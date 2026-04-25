import test from 'node:test'
import assert from 'node:assert/strict'

import { extractPromptVariables } from './prompt-variables.ts'

test('extractPromptVariables prefers explicit pendant over generic xianxia key item', () => {
  const vars = extractPromptVariables({
    titleHint: '魔尊血脉',
    genre: '男频修仙',
    protagonist: '主角',
    antagonist: '名门正派大小姐',
    coreConflict: '主角觉醒魔尊血脉，被正道觊觎。',
    generationBriefText:
      '男主的母亲留下的吊坠被人一脚踩碎，吊坠碎片引动魔尊血脉，后续还藏有父母线索。'
  } as never)

  assert.match(vars.coreItem, /吊坠/)
  assert.doesNotMatch(vars.coreItem, /秘宝钥匙/)
})
