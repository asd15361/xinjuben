import test from 'node:test'
import assert from 'node:assert/strict'

import {
  normalizeSummaryPayload,
  parseStructuredGenerationBrief
} from './summarize-chat-for-generation-support.ts'

test('parseStructuredGenerationBrief keeps project header as the only episode authority inside formal brief', () => {
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
- 这是一个权谋剧。
【待确认】
- 具体30集剧情曲折细节
  `.trim()

  const parsed = parseStructuredGenerationBrief(transcript)
  assert.ok(parsed)
  assert.equal((parsed as { episodeCount: number }).episodeCount, 10)
})

test('normalizeSummaryPayload lets latest direct user episode change override stale structured header', () => {
  const transcript = `
用户：我先贴一版旧总结。
用户：\n【项目】修仙传｜10集
【主角】黎明
【角色卡】
- 黎明：主角。
- 李科：对手。
用户：现在改了，不做10集了，要做30集。
  `.trim()

  const normalized = normalizeSummaryPayload(
    {
      projectTitle: '修仙传',
      episodeCount: 10,
      genreAndStyle: '玄幻修仙｜热血升级',
      sellingPremise: '卖点',
      coreDislocation: '错位',
      emotionalPayoff: '情绪',
      worldAndBackground: '背景',
      protagonist: '黎明',
      antagonist: '李科',
      coreConflict: '冲突',
      endingDirection: '开放',
      keyCharacters: ['黎明', '李科', '实则另有目'],
      chainSynopsis: '串联',
      characterCards: [
        { name: '黎明', summary: '主角。' },
        { name: '李科', summary: '对手。' }
      ],
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

  assert.match(normalized.generationBriefText, /30集/)
  assert.deepEqual(normalized.storyIntent.officialKeyCharacters, ['黎明', '李科'])
  assert.deepEqual(normalized.storyIntent.lockedCharacterNames, ['黎明', '李科'])
})
