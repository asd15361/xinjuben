import test from 'node:test'
import assert from 'node:assert/strict'

import {
  assembleScenesForEpisode,
  createSceneGenerationPrompt,
  type SceneScaffoldInput
} from './create-scene-generation-prompt.ts'

function buildInput(overrides: Partial<SceneScaffoldInput> = {}): SceneScaffoldInput {
  return {
    episodeNo: 1,
    sceneNo: 2,
    sceneCode: '1-2',
    timeOfDay: '夜',
    characters: ['林守钥', '沈黑虎'],
    setup: '林守钥堵住后门，不让沈黑虎带着账册离开。',
    tension: '沈黑虎已经摸到刀柄，院外脚步越来越近。',
    hookEnd: '账册已经被沈黑虎一把扯走，林守钥手背当场见血。',
    budgetChars: 350,
    prevSceneHook: '布袋口已经被人踩住。',
    prevSceneOutcome: '林守钥抢慢半步，账册露出半角。',
    isLastScene: true,
    ...overrides
  }
}

test('scene prompt puts hook landing contract into explicit visible-outcome rules', () => {
  const prompt = createSceneGenerationPrompt(buildInput())

  assert.match(prompt, /NOT part of the current production episode-level chain/)
  assert.match(prompt, /本场 Hook 结尾：账册已经被沈黑虎一把扯走/)
  assert.match(prompt, /最后一句已经发生的可见后果/)
  assert.match(prompt, /对方已有可见反应/)
  assert.match(prompt, /威胁已经落地/)
  assert.match(prompt, /关键物件状态已变/)
  assert.match(prompt, /✅ 好的结尾（观众已经看到变化）/)
  assert.match(prompt, /❌ 弱的结尾（变化尚未发生，只是逼近或观察）/)
  assert.match(prompt, /宁可把动作往前推一步/)
  assert.match(prompt, /本场为当集最后一场/)
})

test('scene prompt keeps format contract and forbids episode header in single-scene output', () => {
  const prompt = createSceneGenerationPrompt(buildInput({ isLastScene: false }))

  assert.match(prompt, /本场只输出剧本片段，不输出「第X集」标题/)
  assert.match(prompt, /第一行必须是场景标题/)
  assert.match(prompt, /禁止使用 Action: \/ Dialogue: \/ Emotion:/)
})

test('assembleScenesForEpisode adds only one episode heading', () => {
  const assembled = assembleScenesForEpisode(1, [
    '1-1 日\n人物：林守钥\n△门被撞开。\n林守钥：把账册交出来。',
    '1-2 夜\n人物：林守钥，沈黑虎\n△刀已经压到门缝。\n沈黑虎：你来晚了。'
  ])

  assert.match(assembled, /^第1集/m)
  assert.equal((assembled.match(/第1集/g) || []).length, 1)
  assert.match(assembled, /1-1 日/)
  assert.match(assembled, /1-2 夜/)
})
