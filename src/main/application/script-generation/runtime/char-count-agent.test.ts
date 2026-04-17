import test from 'node:test'
import assert from 'node:assert/strict'

import { buildCharCountAgentPrompt, resolveCharCountAgentMode } from './char-count-agent.ts'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow.ts'

test('resolveCharCountAgentMode detects fat and thin failures', () => {
  assert.equal(
    resolveCharCountAgentMode([
      { code: 'char_count', detail: '字数偏胖（当前约2050字，目标800-1800字，差250字）' }
    ]),
    'fat'
  )
  assert.equal(
    resolveCharCountAgentMode([
      { code: 'char_count', detail: '字数偏瘦（当前约720字，目标800-1800字，差80字）' }
    ]),
    'thin'
  )
  assert.equal(resolveCharCountAgentMode([{ code: 'hook_weak', detail: '集尾钩子偏弱' }]), null)
})

test('buildCharCountAgentPrompt builds a fat-script agent prompt on top of the previous screenplay', () => {
  // 新口径：countSceneChars() 用 getScreenplay()，action/dialogue 非空时优先拼接两者
  const body1 = String.fromCharCode(65).repeat(2000)
  const body2 = String.fromCharCode(65).repeat(2000)
  // action+dialogue = 4000 chars → 会被 countSceneChars() 读到
  const scene: ScriptSegmentDto = {
    sceneNo: 11,
    screenplay: `第11集\n\n11-1 夜｜地点：旧屋\n人物：黎明，李科\n△${body1}\n李科：${body2}`,
    action: body1,
    dialogue: body2,
    emotion: '',
    screenplayScenes: [
      {
        sceneCode: '11-1',
        sceneHeading: '11-1 夜',
        characterRoster: ['黎明', '李科'],
        body: body1 + '\n' + body2
      }
    ]
  }

  const prompt = buildCharCountAgentPrompt({
    previousScene: scene,
    failures: [{ code: 'char_count', detail: '字数偏胖（当前约4000字，目标800-1800字，差2200字）' }]
  })

  assert.match(prompt, /字数代理（char-count-agent）/)
  assert.match(prompt, /你只负责把上一版剧本的字数改回正式合同/)
  assert.match(prompt, /压缩硬指令：字数必须从当前约 \d+ 字压到 \d+-\d+ 字，这是合同硬红线/)
  assert.match(prompt, /你至少要实删 \d+ 字以上/)
  assert.match(prompt, /第1场当前约\d+字，必须压到 \d+ 字以内/)
  assert.match(prompt, /原有每个场号都必须保留，而且每个场号只能出现一次/)
  assert.match(prompt, /每一场至少保留 1 条有效△动作 \+ 2 条有效对白/)
  assert.match(prompt, /禁止输出 `#` \/ `##` markdown 场头/)
  assert.match(prompt, /不准新增场、不准拆场/)
  assert.match(prompt, /必须基于下面原稿直接改稿，不准从零重写/)
  assert.match(prompt, /【必须改的上一版原稿】/)
  // 新口径：密度分配
  assert.match(prompt, /每场字数预算/)
})

test('buildCharCountAgentPrompt builds a thin-script agent prompt that only thickens the current draft', () => {
  // 新口径口径：countSceneChars() 用 getScreenplay()，如果 action/dialogue/emotion 非空则优先拼接
  // 为了让测试可预测，直接用 screenplay 字数等于 failure detail 的数字
  const targetChars = 720
  const bodyContent = String.fromCharCode(65).repeat(targetChars)
  const scene: ScriptSegmentDto = {
    sceneNo: 7,
    screenplay: bodyContent,
    action: '',
    dialogue: '',
    emotion: '',
    screenplayScenes: [
      {
        sceneCode: '7-1',
        sceneHeading: '7-1 夜',
        characterRoster: ['黎明', '小柔'],
        body: bodyContent
      }
    ]
  }

  const prompt = buildCharCountAgentPrompt({
    previousScene: scene,
    failures: [
      { code: 'char_count', detail: '字数偏瘦（当前约720字，目标800-1800字，差80字）' }
    ]
  })

  assert.match(prompt, /补厚硬指令：字数必须从当前约 720 字扩到 \d+-\d+ 字，这是合同硬红线/)
  assert.match(prompt, /本次至少要补足 \d+ 字以上/)
  assert.match(prompt, /先补最瘦场里的对手回应/)
  assert.match(prompt, /原有每个场号都必须保留，而且每个场号只能出现一次/)
  assert.match(prompt, /只做加法补厚，不准靠空情绪、感叹句和解释句灌水/)
  assert.match(prompt, /不准新增场景、不准添加新的情节点/)
})
