import test from 'node:test'
import assert from 'node:assert/strict'
import { parseAiRepairedScene } from './parse-ai-repaired-scene.ts'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow'

function createFallbackScene(): ScriptSegmentDto {
  return {
    sceneNo: 3,
    screenplay: `第3集

3-1 王母宫前［外］［日］
人物：黎明，小柔，李科
△黎明挡在小柔身前，逼李科停手。
李科：（冷笑）你真当我不敢动她？
黎明：（盯住李科）你今天敢伸手，我就让你当街下不来台。

3-2 王母宫石阶［外］［夜］
人物：黎明，小柔
△小柔追上黎明，把刚刚听来的消息塞给他。
小柔：（压低声音）李科今晚还会回来，他已经盯上你怀里的东西。
△黎明回头望向黑掉的庙门，袖中钥匙突然发烫。`,
    action: '',
    dialogue: '',
    emotion: '',
    legacyFormat: false
  }
}

test('parseAiRepairedScene rejects ellipsis-compressed repaired drafts directly', () => {
  const fallback = createFallbackScene()
  const repaired = `第3集

3-1 王母宫前［外］［日］
人物：黎明，小柔，李科
△黎明挡在小柔身前，逼李科停手…
李科：（冷笑）你真当我不敢动她…
黎明：（盯住李科）你今天敢伸手…

3-2 王母宫石阶［外］［夜］
人物：黎明，小柔
△小柔追上黎明，把消息塞给他…
小柔：（压低声音）李科今晚还会回来…
△黎明回头望向庙门，钥匙突然发烫…`

  assert.throws(() => parseAiRepairedScene(repaired, fallback), /repair_scene_parse_failed/)
})

// ─────────────────────────────────────────────────────────────────────────────
// repair 链关键事实：parseAiRepairedScene 只更新 A/D/E，不更新 screenplay/screenplayScenes
// ─────────────────────────────────────────────────────────────────────────────

function createOneSceneFallback() {
  return {
    sceneNo: 5,
    screenplay: `第5集

5-1 夜
人物：林守钥
△ 林守钥贴在墙根，心跳如擂鼓。`,
    action: '',
    dialogue: '',
    emotion: '',
    screenplayScenes: [{ sceneCode: '5-1', sceneHeading: '5-1 夜', characterRoster: ['林守钥'] }],
    legacyFormat: false
  }
}

test('REPAIR CHAIN: parseAiRepairedScene refreshes screenplay/screenplayScenes after A/D/E repair', () => {
  const fallback = createOneSceneFallback()
  const repairedADE = `Action:
△ 收夜香的车来了。林守钥早已挪到牢门边。

Dialogue:
林守钥：收夜香？

Emotion:
△ 林守钥把竹管奋力掷出！`

  const result = parseAiRepairedScene(repairedADE, fallback)

  assert.equal(result.sceneNo, 5)
  assert.ok(result.action.includes('收夜香'), 'action should be updated from repair')
  assert.ok(result.dialogue.includes('收夜香'), 'dialogue should be updated from repair')
  // screenplay and screenplayScenes are now refreshed from the rebuilt screenplay
  assert.ok(result.screenplay, 'screenplay should be returned after repair')
  assert.ok(result.screenplayScenes, 'screenplayScenes should be returned after repair')
  assert.equal(result.screenplay!.includes('第5集'), true, 'rebuilt screenplay should have episode heading')
})
