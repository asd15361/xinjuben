import test from 'node:test'
import assert from 'node:assert/strict'
import { compactOverlongScreenplay, shouldAcceptRepairCandidate, collectEpisodeGuardFailures } from './screenplay-repair-guard.ts'
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

test('collectEpisodeGuardFailures detects missing payoff fields', () => {
  const scene: ScriptSegmentDto = {
    sceneNo: 1,
    action: '',
    dialogue: '',
    emotion: '',
    payoffType: '打脸', // 有爽点类型，但是缺少其他必要字段
    screenplay: '第1集\n\n1-1 客厅［内］［日］\n人物：张三，李四\n△张三看着李四。\n张三：你好。'
  }
  const failures = collectEpisodeGuardFailures(scene)
  assert.ok(failures.some(f => f.code === 'payoff_missing'))
  assert.ok(failures.find(f => f.code === 'payoff_missing')?.detail.includes('爽点字段缺失'))
})

test('shouldAcceptRepairCandidate rejects mismatched payoff fields', () => {
  const original: ScriptSegmentDto = {
    sceneNo: 1,
    action: '',
    dialogue: '',
    emotion: '',
    payoffType: '打脸',
    payoffLevel: 'major',
    payoffBeatSlot: 'reversal',
    payoffOwnerName: '张三',
    payoffExecution: '张三当众打了李四一耳光'
  }
  const mismatched: ScriptSegmentDto = {
    ...original,
    payoffType: '逆袭', // 爽点类型被修改了
    screenplay: original.screenplay || ''
  }
  assert.equal(shouldAcceptRepairCandidate(original, mismatched), false)
})

test('collectEpisodeGuardFailures detects missing payoff content in script', () => {
  const scene: ScriptSegmentDto = {
    sceneNo: 1,
    action: '',
    dialogue: '',
    emotion: '',
    payoffType: '打脸',
    payoffLevel: 'major',
    payoffBeatSlot: 'reversal',
    payoffOwnerName: '张三',
    pressureActorName: '李四',
    payoffTargetName: '李四',
    payoffExecution: '张三当众打了李四一耳光',
    screenplay: '第1集\n\n1-1 客厅［内］［日］\n人物：张三，王五\n△张三看着王五。\n张三：你好。' // 李四没有出现，也没有打耳光的动作
  }
  const failures = collectEpisodeGuardFailures(scene)
  assert.ok(failures.some(f => f.code === 'payoff_not_present'))
  assert.ok(failures.some(f => f.detail.includes('未出现施压角色「李四」')))
  assert.ok(failures.some(f => f.detail.includes('未出现爽点目标角色「李四」')))
  assert.ok(failures.some(f => f.detail.includes('未体现爽点执行逻辑')))
})
