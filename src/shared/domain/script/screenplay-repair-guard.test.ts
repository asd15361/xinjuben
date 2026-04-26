import test from 'node:test'
import assert from 'node:assert/strict'
import { compactOverlongScreenplay, shouldAcceptRepairCandidate } from './screenplay-repair-guard.ts'
import type { ScriptSegmentDto } from '../../contracts/workflow.ts'

function createOverlongScene(): ScriptSegmentDto {
  const repeatedAction =
    '△黎明在逼压中仍强撑镇定，把每个动作都做满，不肯露出半点退意，逼得屋内气氛一层层绷紧。'
  const repeatedDialogueA =
    '黎明：（压着火气）你若真敢越线，今天这一步就不只是逼债，而是把整个安仁镇都拖下水。'
  const repeatedDialogueB =
    '李科：（逼近冷笑）我就越线了，你能如何？你藏着的东西、你护着的人，我今晚都要一起拿走。'
  const sceneBody = Array.from({ length: 7 })
    .flatMap(() => [repeatedAction, repeatedDialogueA, repeatedDialogueB])
    .join('\n')

  return {
    sceneNo: 2,
    action: '',
    dialogue: '',
    emotion: '',
    legacyFormat: false,
    screenplayScenes: [],
    screenplay: `第2集

2-1 李宅偏厅［内］［日］
人物：黎明，李科
${sceneBody}

2-2 李宅后院［外］［夜］
人物：黎明，李科，小柔
${sceneBody}`
  }
}

test('compactOverlongScreenplay refuses compacted versions that would fall below the active length contract', () => {
  const scene = createOverlongScene()
  const result = compactOverlongScreenplay(scene)

  assert.equal(result.screenplay, scene.screenplay)
})

test('shouldAcceptRepairCandidate can accept a rewrite that removes strategy contamination', () => {
  const contaminated: ScriptSegmentDto = {
    sceneNo: 1,
    action: '',
    dialogue: '',
    emotion: '',
    screenplay: '第1集\n\n1-1 集团会议室［内］［日］\n人物：苏晚，顾沉\n△宗门审判声响起。\n苏晚：我不会交出魔尊血脉。\n顾沉：先稳住。',
    screenplayScenes: []
  }
  const clean: ScriptSegmentDto = {
    ...contaminated,
    screenplay: '第1集\n\n1-1 集团会议室［内］［日］\n人物：苏晚，顾沉\n△集团会议室里，股权协议被推到苏晚面前。\n苏晚：我不会签这份契约。\n顾沉：先稳住。'
  }

  assert.equal(
    shouldAcceptRepairCandidate(contaminated, clean, {
      originalFailures: [
        {
          code: 'strategy_contamination',
          detail: '题材串味：当前题材策略「女频霸总甜宠」不应出现「魔尊血脉」。'
        }
      ],
      candidateFailures: []
    }),
    true
  )
})
