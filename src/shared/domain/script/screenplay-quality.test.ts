import test from 'node:test'
import assert from 'node:assert/strict'

import {
  deriveEpisodeRepairAssignments,
  hasBlockingScreenplayQualityProblems,
  inspectScreenplayQualityEpisode
} from './screenplay-quality.ts'

test('inspectScreenplayQualityEpisode flags terminal truncated residue as quality failure', () => {
  const report = inspectScreenplayQualityEpisode({
    sceneNo: 2,
    action: '',
    dialogue: '',
    emotion: '',
    screenplay: `第2集

2-1 破庙外·日
人物：黎明，小柔，李科

△破庙外墙被砸出一个大洞，碎砖散落一地。小柔正弯腰收拾散落的破碗碎…
李科：废物就是废物！
黎明：放人。

2-2 李科别院外小巷·傍晚
人物：小柔，李科，黎明

△小柔被李科拖向门内。
小柔：救我！
李科：你以为事情到这里就算完了吗……
△朱漆大门在哭喊声中砰然关上。
△她还……`
  })

  assert.equal(report.pass, false)
  assert.ok(report.problems.includes('正文含截断残句'))
})

test('inspectScreenplayQualityEpisode accepts bold episode heading and normal dramatic ellipsis', () => {
  const report = inspectScreenplayQualityEpisode({
    sceneNo: 1,
    action: '',
    dialogue: '',
    emotion: '',
    screenplay: `**第1集**

**1-1 安仁闹市街头［外］［日］**
人物：黎明，小柔，李科
△李科当街拦住小柔父女，抖开借据逼债。
**李科**：（冷笑）今天不还钱，就拿你闺女抵债！
**小柔**：（声音发颤）李爷，再宽限几天……
△黎明拨开人群上前，挡在小柔身前。
**黎明**：（语气平和）李爷，欠债还钱天经地义，可否宽限几日？
**李科**：（逼近）你算什么东西？

**1-2 破屋外［外］［傍晚］**
人物：黎明，小柔，小柔父
△黎明送小柔父女回破屋，将碎银塞进小柔手里。
**小柔**：（眼眶微红）多谢恩公，三日三十两，我们实在还不上。
**黎明**：（低声）先给伯父抓药，钱的事再想办法。
△黎明转身离开前回头叮嘱，任何人叫门都别开。
**小柔**：（怔怔点头）我记住了。
△夜色压下来，破屋门闩被小柔缓缓插紧。`
  })

  assert.equal(report.hasEpisodeHeading, true)
  assert.equal(report.problems.includes('缺少第X集标题'), false)
  assert.equal(report.problems.includes('正文含截断残句'), false)
})

test('inspectScreenplayQualityEpisode blocks ultra-short two-scene screenplay', () => {
  const report = inspectScreenplayQualityEpisode({
    sceneNo: 3,
    action: '',
    dialogue: '',
    emotion: '',
    screenplay: `第3集

3-1 破庙［外］［日］
人物：黎明，小柔
△黎明冲到庙门前。
**黎明**：（厉声）放人。
**李科**：（冷笑）你拦不住。
△李科抬手示意打手上前。

3-2 小巷［外］［夜］
人物：黎明，李科
△两人在巷口对峙。
**李科**：（逼近）钥匙交出来。
**黎明**：（咬牙）休想。
△巷口风声骤紧。`
  })

  assert.equal(report.pass, false)
  assert.ok(report.problems.includes('字数低于800字合同'))
  assert.ok(report.problems.includes('集尾钩子偏弱'))
  assert.ok(report.problems.includes('至少有一场有效内容不足4行') === false)
  assert.equal(hasBlockingScreenplayQualityProblems(report), false)
})

test('inspectScreenplayQualityEpisode blocks unfilmable inner monologue lines', () => {
  const report = inspectScreenplayQualityEpisode({
    sceneNo: 5,
    action: '',
    dialogue: '',
    emotion: '',
    screenplay: `第5集

5-1 李宅囚室［内］［夜］
人物：黎明，家丁
△黎明贴着铁门听外头脚步远近。
△他脑海中闪过师父临行前的叮嘱，知道自己已经没有退路。
**家丁**：（隔门冷笑）再不交代，小柔今晚就没命了。
**黎明**：（抬眼）叫李科来见我。

5-2 囚室门口［内］［夜］
人物：黎明，李科
△铁门被猛地拉开，灯火直照在黎明脸上。
**李科**：（逼近）你最好真有我要的东西。
**黎明**：（盯住他）先把人带出来，再谈钥匙。
△李科抬手示意家丁上前，锁链声当场逼近。`
  })

  assert.equal(report.pass, false)
  assert.ok(report.problems.includes('含不可拍心理描写'))
  assert.equal(hasBlockingScreenplayQualityProblems(report), true)
})

test('inspectScreenplayQualityEpisode reports voice-over as a dedicated blocking problem', () => {
  const report = inspectScreenplayQualityEpisode({
    sceneNo: 7,
    action: '',
    dialogue: '',
    emotion: '',
    screenplay: `第7集

7-1 夜
人物：黎明，小柔
△门外脚步声骤近。
小柔：（画外音）黎明！快走！
黎明：来不及了。
△木门被一脚踹开。

7-2 夜
人物：黎明，李科
△李科提刀堵住门口。
李科：钥匙交出来。
黎明：你先放人。
△刀尖已抵到黎明喉前。`
  })

  assert.equal(report.pass, false)
  assert.ok(report.problems.includes('含画外音/旁白/OS'))
  assert.ok(!report.problems.includes('正文仍含待补/模板/伪剧本污染'))
  assert.equal(hasBlockingScreenplayQualityProblems(report), true)
})

test('inspectScreenplayQualityEpisode no longer treats action-heavy silent scene as pollution', () => {
  const report = inspectScreenplayQualityEpisode({
    sceneNo: 6,
    action: '',
    dialogue: '',
    emotion: '',
    screenplay: `第6集

6-1 深夜
人物：黎明
△黎明翻窗进密室，停在书架阴影后。
△他摸到信鸽脚上的铜环，借月光辨认刻字。
△门外钥匙刚插进锁孔，金属摩擦声贴着门板划过。
△黎明反手合上笼门，闪进更深的阴影。

6-2 深夜
人物：黎明，小柔
△黎明翻出后墙，撞进巷口。
小柔：巷口有人。
黎明：走后门。
△两人贴墙窜进雨棚下，脚步声已追到巷口。`
  })

  assert.ok(!report.problems.includes('正文仍含待补/模板/伪剧本污染'))
  assert.ok(report.problems.includes('至少有一场对白不足2句'))
})

test('inspectScreenplayQualityEpisode still flags markdown placeholder stub pollution before formal scene', () => {
  const report = inspectScreenplayQualityEpisode({
    sceneNo: 28,
    action: '',
    dialogue: '',
    emotion: '',
    screenplay: `# 第28集

## 28-1 深夜｜地点：医庐内室
人物：**人物**
△# 第28集

## 28-1 深夜｜地点：医庐内室
人物：黎明，李诚阳
△药炉余烬泛红，墙缝里还压着潮气。
李诚阳：有人提前翻过这里。
黎明：不是翻过，是在等我回来。
△黎明扯开榻边暗屉，半截染血布条当场露了出来。
李诚阳：这不是医庐的东西。
黎明：那就说明他们已经摸到后手了。
△窗外瓦片骤然一响，短刀已从窗纸外突刺进来。`
  })

  assert.equal(report.pass, false)
  assert.ok(report.problems.includes('正文仍含待补/模板/伪剧本污染'))
  assert.ok(report.actionableProblems.includes('正文仍含待补/模板/伪剧本污染'))
})

test('deriveEpisodeRepairAssignments maps actionable problems to the expected agents', () => {
  const assignments = deriveEpisodeRepairAssignments([
    '正文仍含待补/模板/伪剧本污染',
    '至少有一场对白不足2句',
    '字数超过1800字合同'
  ])

  assert.deepEqual(
    assignments.map((item) => [item.code, item.agent]),
    [
      ['template_pollution', 'format_pollution'],
      ['insufficient_dialogue', 'scene_structure'],
      ['char_count', 'char_count']
    ]
  )
})
