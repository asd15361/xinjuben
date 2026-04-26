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

test('normalizeSummaryPayload extracts creativeSummary and storySynopsis from payload', () => {
  const payload = {
    projectTitle: '修仙传',
    episodeCount: 20,
    genreAndStyle: '玄幻修仙',
    tone: '爽',
    audience: '男频',
    sellingPremise: '废灵根刺客觉醒神尊之力',
    coreDislocation: '废体其实是神尊封印',
    emotionalPayoff: '打脸逆袭爽',
    worldAndBackground: '修仙界',
    protagonist: '沈烬',
    antagonist: '宗门长老',
    coreConflict: '刺客发现组织是世间祸首',
    endingDirection: '登顶清算',
    keyCharacters: ['沈烬', '宗门长老'],
    chainSynopsis: '废灵根刺客发现组织黑幕',
    dramaticMovement: ['欲望线', '阻力线', '代价线', '关系线', '钩子线'],
    creativeSummary: '用户想写一个废灵根刺客发现组织黑幕的故事',
    storySynopsis: {
      logline: '废灵根刺客发现组织是世间祸首，觉醒神尊之力逆袭',
      openingPressureEvent: '测灵台当众判废体',
      protagonistCurrentDilemma: '被宗门判废体，功劳被夺',
      firstFaceSlapEvent: '测灵石炸裂反噬长老',
      antagonistForce: '宗门长老',
      antagonistPressureMethod: '用宗门规矩当众废他灵脉',
      corePayoff: '废材逆袭',
      stageGoal: '查清组织黑幕',
      keyFemaleCharacterFunction: '未婚女修先弃后追',
      finaleDirection: '登顶仙界清算旧势力'
    }
  }

  const result = normalizeSummaryPayload(payload, '')

  assert.equal(result.storyIntent.creativeSummary, '用户想写一个废灵根刺客发现组织黑幕的故事')
  assert.ok(result.storyIntent.storySynopsis)
  assert.equal(result.storyIntent.storySynopsis?.logline, '废灵根刺客发现组织是世间祸首，觉醒神尊之力逆袭')
  assert.equal(result.storyIntent.storySynopsis?.openingPressureEvent, '测灵台当众判废体')
  assert.equal(result.storyIntent.storySynopsis?.firstFaceSlapEvent, '测灵石炸裂反噬长老')
  assert.equal(result.storyIntent.storySynopsis?.antagonistPressureMethod, '用宗门规矩当众废他灵脉')
})

test('normalizeSummaryPayload falls back to chainSynopsis when creativeSummary missing', () => {
  const payload = {
    projectTitle: '测试',
    episodeCount: 10,
    genreAndStyle: '都市',
    sellingPremise: '测试',
    coreDislocation: '测试',
    emotionalPayoff: '测试',
    protagonist: '主角',
    chainSynopsis: '这是默认摘要',
    keyCharacters: ['主角'],
    dramaticMovement: ['a', 'b', 'c', 'd', 'e']
  }

  const result = normalizeSummaryPayload(payload, '')
  assert.equal(result.storyIntent.creativeSummary, '这是默认摘要')
})

test('normalizeSummaryPayload returns null storySynopsis when fields missing', () => {
  const payload = {
    projectTitle: '测试',
    episodeCount: 10,
    genreAndStyle: '都市',
    sellingPremise: '测试',
    coreDislocation: '测试',
    emotionalPayoff: '测试',
    protagonist: '主角',
    chainSynopsis: '摘要',
    keyCharacters: ['主角'],
    dramaticMovement: ['a', 'b', 'c', 'd', 'e']
  }

  const result = normalizeSummaryPayload(payload, '')
  assert.equal(result.storyIntent.storySynopsis, null)
})

test('normalizeSummaryPayload returns null storySynopsis when logline empty', () => {
  const payload = {
    projectTitle: '测试',
    episodeCount: 10,
    genreAndStyle: '都市',
    sellingPremise: '测试',
    coreDislocation: '测试',
    emotionalPayoff: '测试',
    protagonist: '主角',
    chainSynopsis: '摘要',
    keyCharacters: ['主角'],
    dramaticMovement: ['a', 'b', 'c', 'd', 'e'],
    storySynopsis: {
      logline: '',
      openingPressureEvent: '有事件'
    }
  }

  const result = normalizeSummaryPayload(payload, '')
  assert.equal(result.storyIntent.storySynopsis, null)
})

test('normalizeSummaryPayload auto-completes Chinese named roster when user delegates naming', () => {
  const payload = {
    projectTitle: '魔尊血脉',
    episodeCount: 20,
    genreAndStyle: '男频古代修仙',
    sellingPremise: '废柴少年其实身负魔尊血脉',
    coreDislocation: '人人笑话的废柴是宗门老大暗中保护的魔尊降世',
    emotionalPayoff: '被踩到谷底后觉醒打脸',
    worldAndBackground: '古代修仙宗门世界，正道盟主宗门联合多派觊觎魔尊血脉。',
    protagonist: '男主',
    antagonist: '反派大小姐',
    coreConflict: '男主追查身世，识破名门大小姐骗局并复仇。',
    endingDirection: '男主查清父母旧案并和女主修成正果。',
    keyCharacters: ['男主', '女主', '反派大小姐'],
    chainSynopsis:
      '男主母亲留下的吊坠被踩碎后觉醒魔尊血脉，宗门老大女儿暗中守护，名门正派大小姐伪装接近夺取血脉。',
    characterCards: [],
    characterLayers: [],
    dramaticMovement: ['证明自己', '多派围猎', '血脉失控', '女主守护', '真相揭露']
  }

  const result = normalizeSummaryPayload(
    payload,
    '用户：每个男主女主自己取名字。用户：我不会取名字，你来取。'
  )

  assert.match(result.generationBriefText, /【关键角色】林潜渊、谢含章、沈观澜、陆昭仪、秦玄策、周砚/)
  assert.match(result.generationBriefText, /- 林潜渊：男主/)
  assert.match(result.generationBriefText, /- 执法弟子甲｜功能角色｜/)
  assert.deepEqual(result.storyIntent.officialKeyCharacters?.slice(0, 6), [
    '林潜渊',
    '谢含章',
    '沈观澜',
    '陆昭仪',
    '秦玄策',
    '周砚'
  ])
})
