import test from 'node:test'
import assert from 'node:assert/strict'

import { renderAnchorBlock } from './generation-stage-prompt-anchors.ts'

test('renderAnchorBlock strips philosophical noise but keeps concrete levers', () => {
  const prompt = renderAnchorBlock(`
【设定成交句】最该藏住钥匙的人被逼当场亮底。
【核心错位】黎明本该继续藏锋，却被李科拿小柔逼到退无可退。
【情绪兑现】先吃到主角不再白挨打、开始反咬回去的那口爽。
【世界观与故事背景】玄玉宫等七座道观镇守妖兽蛇子。秘宝“空无一物”象征“不争得失”的真获得。
【关键角色】黎明、李科、小柔、李诚阳、妖兽蛇子
【人物分层】
- 黎明｜主驱动层｜负责扛住主线欲望
【人物关系总梳理】
- 李科会拿小柔去逼黎明交出底牌。
【角色卡】
- 黎明：前期藏武，最终为救所爱被逼出手，并因小柔更深刻地领悟大道。
- 小柔：她的善良与坚韧能帮助黎明领悟真正的道。
【主线欲望线】黎明表面先藏锋隐忍，内里最想守住小柔，也要守住钥匙背后的真相。
【总阻力线】李科会围绕小柔和钥匙持续施压。
【代价升级线】黎明每往前推进一步，都要承担身份暴露和关系受伤的代价。
【关系杠杆线】李科会拿小柔去逼黎明交出底牌。
【串联简介】黎明守着师父给的神秘钥匙。由此，对空秘宝所蕴含“不争”大道的追寻交织在一起。
`)

  assert.match(prompt, /设定成交句：最该藏住钥匙的人被逼当场亮底/)
  assert.match(prompt, /关系杠杆：李科会拿小柔去逼黎明交出底牌/)
  assert.match(prompt, /角色抓手：黎明：前期藏武，最终为救所爱被逼出手/)
  assert.doesNotMatch(prompt, /真正的道/)
  assert.doesNotMatch(prompt, /不争得失/)
  assert.doesNotMatch(prompt, /至高奥义/)
})
