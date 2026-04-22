import test from 'node:test'
import assert from 'node:assert/strict'

import {
  isSummaryPayloadComplete,
  normalizeSummaryPayload,
  parseStructuredGenerationBrief
} from './summarize-chat-for-generation-support.ts'

test('summary guard rejects missing structured fields instead of falling back', () => {
  assert.equal(
    isSummaryPayloadComplete({
      projectTitle: '修仙传',
      episodeCount: 30,
      protagonist: '黎明'
    }),
    false
  )
})

test('summary guard accepts complete single summary payload', () => {
  const payload = {
    projectTitle: '修仙传',
    episodeCount: 30,
    genreAndStyle: '玄幻修仙',
    sellingPremise: '黎明明明只想藏住钥匙，偏偏李科拿小柔的命逼他亮底。',
    coreDislocation: '最该藏锋的人，偏偏被逼成第一个站出来的人。',
    emotionalPayoff: '先让观众看到他宁可暴露自己也要护住小柔。',
    worldAndBackground: '妖兽异动，宗门震荡。',
    protagonist: '黎明',
    antagonist: '李科',
    coreConflict: '黎明被逼亮底',
    endingDirection: '开放结局',
    keyCharacters: ['黎明', '李科', '小柔'],
    chainSynopsis: '黎明一路藏锋，直到被逼正面出手。',
    characterCards: [{ name: '黎明', summary: '主角。' }],
    characterLayers: [{ name: '黎明', layer: '主驱动层', duty: '往前推主线' }],
    themeAnchors: ['守约与救人'],
    worldAnchors: ['妖兽异动，宗门震荡。'],
    relationAnchors: ['黎明喜欢小柔'],
    dramaticMovement: [
      '守住小柔和钥匙',
      '李科持续施压',
      '代价持续升级',
      '李科拿小柔做筹码',
      '每集从钥匙与小柔继续挂钩'
    ],
    relationSummary: ['黎明喜欢小柔'],
    softUnderstanding: ['这是一个权谋剧'],
    pendingConfirmations: ['结局方向']
  }

  assert.equal(isSummaryPayloadComplete(payload), true)
})

test('summary guard accepts single payload and renders generation brief locally', () => {
  const payload = {
    projectTitle: '修仙传',
    episodeCount: 30,
    genreAndStyle: '玄幻修仙',
    sellingPremise: '黎明明明只想藏住钥匙，偏偏李科拿小柔的命逼他亮底。',
    coreDislocation: '最该藏锋的人，偏偏被逼成第一个站出来的人。',
    emotionalPayoff: '先让观众看到他宁可暴露自己也要护住小柔。',
    protagonist: '黎明',
    antagonist: '李科',
    coreConflict: '黎明被逼亮底',
    keyCharacters: ['黎明', '李科', '小柔'],
    chainSynopsis: '黎明一路藏锋，直到被逼正面出手。',
    relationAnchors: ['黎明喜欢小柔'],
    dramaticMovement: [
      '守住小柔和钥匙',
      '李科持续施压',
      '代价持续升级',
      '李科拿小柔做筹码',
      '每集从钥匙与小柔继续挂钩'
    ]
  }

  assert.equal(isSummaryPayloadComplete(payload), true)

  const normalized = normalizeSummaryPayload(payload, '')
  assert.match(normalized.generationBriefText, /【题材与风格】玄幻修仙/)
  assert.match(normalized.generationBriefText, /【主角】黎明/)
  assert.match(normalized.generationBriefText, /【对手】李科/)
  assert.match(normalized.generationBriefText, /【关键角色】黎明、李科、小柔/)
  assert.match(normalized.generationBriefText, /【串联简介】黎明一路藏锋，直到被逼正面出手。/)
})

test('normalizeSummaryPayload keeps latest formal brief header as episode authority', () => {
  const transcript = `
用户：最开始先按30集聊。
AI：这是一版旧总结：

【项目】修仙传｜30集
【主角】黎明

用户：我已经把当前聊天整理成正式创作信息，后面只按这版往下走：

【项目】修仙传｜10集
【题材与风格】玄幻修仙｜热血升级
【设定成交句】黎明明明只想藏住钥匙，偏偏李科拿小柔的命逼他亮底。
【核心错位】最该藏锋的人，偏偏被逼成第一个站出来的人。
【情绪兑现】先让观众看到他宁可暴露自己也要护住小柔。
【主角】黎明
【对手】李科
【核心冲突】黎明被逼亮底
【结局方向】开放结局
【关键角色】黎明、李科、小柔
【串联简介】黎明一路藏锋，直到被逼正面出手。
【待确认】
- 具体30集剧情曲折细节
`.trim()

  const parsed = parseStructuredGenerationBrief(transcript)
  assert.ok(parsed)
  const normalized = normalizeSummaryPayload(parsed, transcript)
  assert.match(normalized.generationBriefText, /10集/)
})
