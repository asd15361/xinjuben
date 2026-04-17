import test from 'node:test'
import assert from 'node:assert/strict'
import { compactOverlongScreenplay } from './screenplay-repair-guard.ts'
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
