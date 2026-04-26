import test from 'node:test'
import assert from 'node:assert/strict'
import { inspectProjectIntakeReadiness, inspectStorySynopsisReadiness } from './story-synopsis.ts'
import type { StoryIntentPackageDto } from '../../contracts/intake.ts'

function buildSynopsis(
  overrides: Partial<import('../../contracts/intake.ts').StorySynopsisDto> = {}
): import('../../contracts/intake.ts').StorySynopsisDto {
  return {
    logline: '废灵根刺客发现组织黑幕，觉醒神尊之力逆袭',
    openingPressureEvent: '测灵台当众判废体，同门逼交功劳，女修划清界限',
    protagonistCurrentDilemma: '被宗门判废体，功劳被夺，婚约被撕',
    firstFaceSlapEvent: '测灵石炸裂反噬长老，众人以为他是天才',
    antagonistForce: '宗门长老与刺客组织首领',
    antagonistPressureMethod: '用宗门规矩当众废他灵脉',
    corePayoff: '废材逆袭+身份揭露',
    stageGoal: '查清组织黑幕，夺回自主权',
    finaleDirection: '登顶仙界，清算旧势力',
    ...overrides
  }
}

function buildStoryIntent(overrides: Partial<StoryIntentPackageDto> = {}): StoryIntentPackageDto {
  return {
    titleHint: '修仙传',
    genre: '玄幻短剧',
    tone: '',
    audience: '',
    sellingPremise: '废灵根刺客查组织黑幕，一路打脸翻盘',
    coreDislocation: '人人看不起的废灵根，其实是旧神血脉',
    emotionalPayoff: '当众翻盘、身份揭露',
    protagonist: '黎明',
    antagonist: '玄玉长老',
    coreConflict: '黎明查清宗门和刺客组织的交易',
    endingDirection: '清算宗门黑幕',
    officialKeyCharacters: [
      '黎明',
      '玄玉长老',
      '谢宁',
      '秦风',
      '掌门',
      '大弟子',
      '执法弟子甲',
      '山门守卫乙'
    ],
    lockedCharacterNames: ['黎明', '玄玉长老', '谢宁', '秦风'],
    themeAnchors: [],
    worldAnchors: ['玄玉宗掌控边城修行资源', '刺客组织盘踞黑市'],
    relationAnchors: ['宗门', '刺客组织', '边城黑市'],
    dramaticMovement: [],
    generationBriefText: [
      '【项目】修仙传｜60集',
      '【世界观与故事背景】玄玉宗、边城黑市和刺客组织共同控制修行资源，普通弟子被宗门规则压榨。',
      '【关键角色】黎明、玄玉长老、谢宁、秦风、掌门、大弟子、执法弟子甲、山门守卫乙',
      '【角色卡】',
      '- 黎明：废灵根刺客，暗查宗门黑幕',
      '- 执法弟子甲：功能角色，负责当众宣判和带路',
      '【人物分层】',
      '- 山门守卫乙｜跑龙套｜在山门冲突里传话并放行'
    ].join('\n'),
    storySynopsis: buildSynopsis(),
    ...overrides
  }
}

test('null synopsis = not ready, all fields missing', () => {
  const result = inspectStorySynopsisReadiness(null)
  assert.equal(result.ready, false)
  assert.ok(result.missing.length > 0)
  assert.ok(result.missing.includes('开局压迫事件'))
  assert.ok(result.missing.includes('第一场打脸'))
})

test('undefined synopsis = not ready', () => {
  const result = inspectStorySynopsisReadiness(undefined)
  assert.equal(result.ready, false)
  assert.ok(result.missing.length > 0)
})

test('fully filled synopsis = ready', () => {
  const result = inspectStorySynopsisReadiness(buildSynopsis())
  assert.equal(result.ready, true)
  assert.equal(result.missing.length, 0)
})

test('missing openingPressureEvent = not ready', () => {
  const result = inspectStorySynopsisReadiness(buildSynopsis({ openingPressureEvent: '' }))
  assert.equal(result.ready, false)
  assert.ok(result.missing.includes('开局压迫事件'))
})

test('missing firstFaceSlapEvent = not ready', () => {
  const result = inspectStorySynopsisReadiness(buildSynopsis({ firstFaceSlapEvent: '' }))
  assert.equal(result.ready, false)
  assert.ok(result.missing.includes('第一场打脸'))
})

test('missing antagonistForce = not ready', () => {
  const result = inspectStorySynopsisReadiness(buildSynopsis({ antagonistForce: '' }))
  assert.equal(result.ready, false)
  assert.ok(result.missing.includes('核心反派/势力'))
})

test('too-short value treated as missing', () => {
  const result = inspectStorySynopsisReadiness(buildSynopsis({ stageGoal: 'ab' }))
  assert.equal(result.ready, false)
  assert.ok(result.missing.includes('主角阶段目标'))
})

test('optional fields do not affect readiness', () => {
  const result = inspectStorySynopsisReadiness(
    buildSynopsis({
      keyFemaleCharacterFunction: '',
      episodePlanHint: ''
    })
  )
  assert.equal(result.ready, true)
})

test('suggestions match missing fields', () => {
  const result = inspectStorySynopsisReadiness(
    buildSynopsis({
      openingPressureEvent: '',
      firstFaceSlapEvent: ''
    })
  )
  assert.equal(result.suggestions.length, result.missing.length)
  assert.ok(result.suggestions.some((s) => s.includes('压迫')))
  assert.ok(result.suggestions.some((s) => s.includes('反击')))
})

test('project intake readiness requires world, factions, roster, and crowd roles beyond synopsis', () => {
  const result = inspectProjectIntakeReadiness(
    buildStoryIntent({
      worldAnchors: [],
      relationAnchors: [],
      officialKeyCharacters: ['黎明', '玄玉长老'],
      lockedCharacterNames: ['黎明'],
      generationBriefText: [
        '【项目】修仙传｜60集',
        '【世界观与故事背景】待补',
        '【关键角色】黎明、玄玉长老'
      ].join('\n')
    })
  )

  assert.equal(result.ready, false)
  assert.ok(result.missing.includes('世界观与故事背景'))
  assert.ok(result.missing.includes('阵营/场域底账'))
  assert.ok(result.missing.includes('群像/功能角色位'))
  assert.ok(result.suggestions.some((suggestion) => suggestion.includes('真实中文姓氏')))
  assert.ok(result.suggestions.some((suggestion) => suggestion.includes('系统应直接补一版')))
})

test('project intake readiness does not block only because user has not named the roster', () => {
  const result = inspectProjectIntakeReadiness(
    buildStoryIntent({
      protagonist: '男主',
      antagonist: '反派大小姐',
      officialKeyCharacters: ['男主', '女主', '反派大小姐'],
      lockedCharacterNames: ['男主'],
      relationAnchors: ['古代修仙宗门', '正道盟主宗门'],
      generationBriefText: [
        '【项目】魔尊血脉｜20集',
        '【世界观与故事背景】古代修仙宗门世界，正道盟主宗门联合多派觊觎魔尊血脉。',
        '【关键角色】男主、女主、反派大小姐',
        '【角色卡】',
        '- 男主：身负魔尊血脉却被伪装成废柴',
        '【人物分层】',
        '- 女主｜核心人物｜宗门老大女儿，默默守护男主'
      ].join('\n')
    })
  )

  assert.equal(result.ready, true)
  assert.ok(!result.missing.includes('角色名册'))
  assert.ok(result.suggestions.some((suggestion) => suggestion.includes('系统应直接补一版')))
})

test('project intake readiness passes when world, factions, roster, and crowd roles are present', () => {
  const result = inspectProjectIntakeReadiness(buildStoryIntent())

  assert.equal(result.ready, true)
  assert.deepEqual(result.missing, [])
})
