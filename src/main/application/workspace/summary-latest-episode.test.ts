import test from 'node:test'
import assert from 'node:assert/strict'

import { normalizeSummaryPayload } from './summarize-chat-for-generation-support.ts'

test('normalizeSummaryPayload prefers structured project header over stale model and free text', () => {
  const transcript = `
用户：最开始先按30集聊。
AI：这是一版旧总结：

【项目】修仙传｜30集
【主角】黎明

用户：我已经把当前聊天整理成正式创作信息，后面只按这版往下走：

【项目】修仙传｜10集
【题材与风格】玄幻修仙｜热血升级
【主角】黎明
【对手】李科
【核心冲突】主角在多重压力下完成反转成长
【结局方向】开放结局
【关键角色】黎明、李科、小柔
【角色卡】
- 黎明：主角。
【人物关系总梳理】
- 黎明喜欢小柔。
【软理解】
- 主角靠智慧周旋。
【待确认】
- 具体30集剧情曲折细节
  `.trim()
  const normalized = normalizeSummaryPayload(
    {
      projectTitle: '修仙传',
      episodeCount: 30,
      genreAndStyle: '玄幻修仙｜热血升级',
      sellingPremise: '卖点',
      coreDislocation: '错位',
      emotionalPayoff: '情绪',
      worldAndBackground: '背景',
      protagonist: '黎明',
      antagonist: '李科',
      coreConflict: '冲突',
      endingDirection: '开放',
      keyCharacters: ['黎明', '李科'],
      chainSynopsis: '串联',
      characterCards: [],
      characterLayers: [],
      themeAnchors: [],
      worldAnchors: ['背景'],
      relationAnchors: ['关系'],
      dramaticMovement: ['欲望', '阻力', '代价', '杠杆', '钩子'],
      relationSummary: [],
      softUnderstanding: [],
      pendingConfirmations: []
    },
    transcript
  )

  assert.match(normalized.generationBriefText, /10集/)
})
