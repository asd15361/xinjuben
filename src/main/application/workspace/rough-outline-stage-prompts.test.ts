import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildOutlineEpisodeBatchPrompt,
  buildOutlineOverviewPrompt
} from './rough-outline-stage-prompts.ts'

test('buildOutlineOverviewPrompt generates valid outline prompt with contract-level constraints', () => {
  const prompt = buildOutlineOverviewPrompt({
    generationBriefText:
      '【项目】修仙传｜10集\n【设定成交句】最该藏钥匙的人被逼亮底。\n【人物关系总梳理】\n- 黎明是李诚阳的第十九个徒弟。',
    totalEpisodes: 10,
    actPlans: [
      { act: 'opening', startEpisode: 1, endEpisode: 2 },
      { act: 'midpoint', startEpisode: 3, endEpisode: 5 },
      { act: 'climax', startEpisode: 6, endEpisode: 8 },
      { act: 'ending', startEpisode: 9, endEpisode: 10 }
    ]
  })

  // 1. 结构合同：JSON 输出格式
  assert.match(prompt, /你是短剧总编剧/)
  assert.match(prompt, /10集/)
  assert.match(prompt, /"outline"/)
  assert.match(prompt, /"title"/)
  assert.match(prompt, /"genre"/)
  assert.match(prompt, /"theme"/)
  assert.match(prompt, /"summary"/)
  assert.match(prompt, /"facts"/)
  assert.match(prompt, /"actSummaries"/)

  // 2. 反模板约束：prompt 里提到禁止模板词的规则（overview 用 writer-room 禁令代替）
  assert.match(prompt, /writer-room/)

  // 3. 中后段策略变化/压力变化
  assert.match(prompt, /换压力来源|换战场|换筹码|换关系位次/)

  // 4. 外压不能代替人祸推进
  assert.match(prompt, /外压.*只能放大人祸|不能反客为主/)

  // 5. 批次末段收口规则：不临时引入新名字/新亲属/新残党领头人
  assert.match(prompt, /不准临时引入新名字|新亲属|新残党领头人/)

  // 6. writer-room 元词禁令
  assert.match(prompt, /writer-room/)

  // 7. 身份压强规则（排行/庶出等触发）
  assert.match(prompt, /排行|庶出|私生|最小徒弟/)
})

test('buildOutlineEpisodeBatchPrompt generates valid batch prompt with contract-level constraints', () => {
  const prompt = buildOutlineEpisodeBatchPrompt({
    generationBriefText:
      '【项目】修仙传｜10集\n【设定成交句】最该藏钥匙的人被逼亮底。\n【软理解】\n- 这是一个权谋剧\n- 主角靠智慧周旋\n【人物关系总梳理】\n- 黎明是李诚阳的第十九个徒弟。',
    totalEpisodes: 10,
    startEpisode: 1,
    endEpisode: 5,
    overviewSummary: '整季围绕钥匙、小柔和谦卦代价展开。',
    actPlans: [
      { act: 'opening', startEpisode: 1, endEpisode: 2, summary: '先把人拖进局。' },
      { act: 'midpoint', startEpisode: 3, endEpisode: 5, summary: '中段升级代价。' }
    ],
    previousEpisodes: []
  })

  // 1. 结构合同
  assert.match(prompt, /你是短剧总编剧/)
  assert.match(prompt, /第1-5集/)
  assert.match(prompt, /"batchSummary"/)
  assert.match(prompt, /"episodes"/)
  assert.match(prompt, /"episodeNo"/)
  assert.match(prompt, /"summary"/)

  // 2. 反模板约束
  assert.match(prompt, /不要出现.*模板词/)

  // 3. 外压不能替代人祸
  assert.match(prompt, /外压.*只能放大人祸|不能替代人祸/)

  // 4. 批次末段不临时引入新名字/新亲属/新残党领头人
  assert.match(prompt, /不准临时引入新名字|新亲属|新残党领头人/)

  // 5. writer-room 元词禁令
  assert.match(prompt, /writer-room/)

  // 6. 打法轮换：相邻集推进手法必须变化
  assert.match(prompt, /打法轮换|强制变位/)
})
