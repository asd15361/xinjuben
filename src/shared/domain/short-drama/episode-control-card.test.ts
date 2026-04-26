import test from 'node:test'
import assert from 'node:assert/strict'

import {
  attachEpisodeControlCardsToSegments,
  buildEpisodeControlCard,
  normalizeEpisodeControlCard
} from './episode-control-card.ts'

test('buildEpisodeControlCard derives a usable control card from beat and constitution', () => {
  const card = buildEpisodeControlCard({
    storyIntent: {
      sellingPremise: '黎明被逼卷进反杀局',
      coreDislocation: '黎明以为忍住就能保全一切',
      emotionalPayoff: '一路反咬的爽感',
      protagonist: '黎明',
      antagonist: '李科',
      coreConflict: '黎明被逼反打',
      endingDirection: '最后打回旧账',
      officialKeyCharacters: [],
      lockedCharacterNames: [],
      themeAnchors: [],
      worldAnchors: [],
      relationAnchors: [],
      dramaticMovement: ['先守人再反打']
    },
    beat: {
      episodeNo: 1,
      summary: '第1集先炸场并立主线。',
      sceneByScene: [
        {
          sceneNo: 1,
          setup: '李科先拿小柔逼黎明亮底。',
          tension: '黎明当场被逼表态。',
          hookEnd: '李科继续加码追压。'
        }
      ]
    },
    totalEpisodes: 10
  })

  assert.equal(card.episodeMission, '第1集先炸场并立主线。')
  assert.equal(card.openingBomb, '李科先拿小柔逼黎明亮底。')
  assert.equal(card.hookLanding, '李科继续加码追压。')
  assert.ok(card.forbiddenDrift.includes('不要把激励事件拖到下一集'))
})

test('attachEpisodeControlCardsToSegments decorates every beat', () => {
  const segments = attachEpisodeControlCardsToSegments({
    storyIntent: {
      sellingPremise: '林秋被拖进反杀局',
      emotionalPayoff: '爽感',
      protagonist: '林秋',
      antagonist: '周沉',
      coreConflict: '林秋被逼反打',
      officialKeyCharacters: [],
      lockedCharacterNames: [],
      themeAnchors: [],
      worldAnchors: [],
      relationAnchors: [],
      dramaticMovement: []
    },
    segments: [
      {
        act: 'opening',
        content: '开局段',
        hookType: '入局钩子',
        episodeBeats: [
          {
            episodeNo: 1,
            summary: '第1集先炸场。',
            sceneByScene: [{ sceneNo: 1, setup: '周沉先压下来。', hookEnd: '林秋被迫接招。' }]
          }
        ]
      }
    ],
    totalEpisodes: 10
  })

  assert.equal(segments[0].episodeBeats?.[0]?.episodeControlCard?.episodeMission, '第1集先炸场。')
  assert.equal(segments[0].episodeBeats?.[0]?.episodeControlCard?.hookLanding, '林秋被迫接招。')
})

test('normalizeEpisodeControlCard removes empty forbidden drift items', () => {
  const card = normalizeEpisodeControlCard({
    episodeMission: '推进主线',
    openingBomb: '先炸场',
    conflictUpgrade: '继续加压',
    arcBeat: '主角改位',
    emotionBeat: '稳住爽感',
    hookLanding: '留钩子',
    povConstraint: '单主角视角',
    forbiddenDrift: ['不要跳情绪线', '', '  ']
  })

  assert.deepEqual(card?.forbiddenDrift, ['不要跳情绪线'])
})

test('buildEpisodeControlCard fallback: viral fields must not be empty', () => {
  const card = buildEpisodeControlCard({
    storyIntent: {
      sellingPremise: '黎明被逼卷进反杀局',
      coreDislocation: '黎明以为忍住就能保全一切',
      emotionalPayoff: '一路反咬的爽感',
      protagonist: '黎明',
      antagonist: '李科',
      coreConflict: '黎明被逼反打',
      endingDirection: '最后打回旧账',
      officialKeyCharacters: [],
      lockedCharacterNames: [],
      themeAnchors: [],
      worldAnchors: [],
      relationAnchors: [],
      dramaticMovement: ['先守人再反打']
    },
    beat: {
      episodeNo: 1,
      summary: '第1集先炸场并立主线。',
      sceneByScene: [
        {
          sceneNo: 1,
          setup: '李科先拿小柔逼黎明亮底。',
          tension: '黎明当场被逼表态。',
          hookEnd: '李科继续加码追压。'
        }
      ]
    },
    totalEpisodes: 10
  })

  assert.ok(card.viralHookType && card.viralHookType.length > 0, 'viralHookType must not be empty')
  assert.ok(card.signatureLineSeed && card.signatureLineSeed.length > 0, 'signatureLineSeed must not be empty')
  assert.ok(card.payoffType && card.payoffType.length > 0, 'payoffType must not be empty')
  assert.ok(card.payoffLevel, 'payoffLevel must not be empty')
  assert.ok(card.villainOppressionMode && card.villainOppressionMode.length > 0, 'villainOppressionMode must not be empty')
  assert.ok(card.openingShockEvent && card.openingShockEvent.length > 0, 'openingShockEvent must not be empty')
  assert.ok(card.retentionCliffhanger && card.retentionCliffhanger.length > 0, 'retentionCliffhanger must not be empty')
})

test('buildEpisodeControlCard fallback: payoffLevel is major every 5th episode and final on last', () => {
  const ep3 = buildEpisodeControlCard({
    storyIntent: {
      sellingPremise: 'test',
      emotionalPayoff: 'test',
      protagonist: 'test',
      antagonist: 'test',
      coreConflict: 'test',
      officialKeyCharacters: [],
      lockedCharacterNames: [],
      themeAnchors: [],
      worldAnchors: [],
      relationAnchors: [],
      dramaticMovement: []
    },
    beat: { episodeNo: 3, summary: 'test' },
    totalEpisodes: 20
  })
  const ep5 = buildEpisodeControlCard({
    storyIntent: {
      sellingPremise: 'test',
      emotionalPayoff: 'test',
      protagonist: 'test',
      antagonist: 'test',
      coreConflict: 'test',
      officialKeyCharacters: [],
      lockedCharacterNames: [],
      themeAnchors: [],
      worldAnchors: [],
      relationAnchors: [],
      dramaticMovement: []
    },
    beat: { episodeNo: 5, summary: 'test' },
    totalEpisodes: 20
  })
  const ep20 = buildEpisodeControlCard({
    storyIntent: {
      sellingPremise: 'test',
      emotionalPayoff: 'test',
      protagonist: 'test',
      antagonist: 'test',
      coreConflict: 'test',
      officialKeyCharacters: [],
      lockedCharacterNames: [],
      themeAnchors: [],
      worldAnchors: [],
      relationAnchors: [],
      dramaticMovement: []
    },
    beat: { episodeNo: 20, summary: 'test' },
    totalEpisodes: 20
  })

  assert.equal(ep3.payoffLevel, 'normal')
  assert.equal(ep5.payoffLevel, 'major')
  assert.equal(ep20.payoffLevel, 'final')
})

test('normalizeEpisodeControlCard handles viral fields', () => {
  const card = normalizeEpisodeControlCard({
    episodeMission: '推进主线',
    openingBomb: '先炸场',
    conflictUpgrade: '继续加压',
    arcBeat: '主角改位',
    emotionBeat: '稳住爽感',
    hookLanding: '留钩子',
    povConstraint: '单主角视角',
    forbiddenDrift: [],
    viralHookType: '入局钩子',
    signatureLineSeed: '身份碾压 | 用底牌反问 | 绑定[身份:第十九徒] | 15字以内 | 冷短狠',
    payoffType: '身份碾压',
    payoffLevel: 'major',
    villainOppressionMode: '规则压迫',
    openingShockEvent: '高损失：失去地位',
    retentionCliffhanger: '新危机压到眼前'
  })

  assert.equal(card?.viralHookType, '入局钩子')
  assert.equal(card?.signatureLineSeed, '身份碾压 | 用底牌反问 | 绑定[身份:第十九徒] | 15字以内 | 冷短狠')
  assert.equal(card?.payoffType, '身份碾压')
  assert.equal(card?.payoffLevel, 'major')
  assert.equal(card?.villainOppressionMode, '规则压迫')
  assert.equal(card?.openingShockEvent, '高损失：失去地位')
  assert.equal(card?.retentionCliffhanger, '新危机压到眼前')
})

// ── P7 集尾留客具体化测试 ──

import { extractCliffhangerFromSummary, buildRequiredProp } from './episode-control-card.ts'

test('extractCliffhangerFromSummary: generic fallback summary returns null', () => {
  const result = extractCliffhangerFromSummary('第1集必须继续往前推主线。', 1)
  assert.equal(result, null)
})

test('extractCliffhangerFromSummary: single specific sentence is extracted', () => {
  const result = extractCliffhangerFromSummary('陈锋在餐厅被张子豪泼酒羞辱，林雪当场分手。', 1)
  assert.ok(result)
  assert.ok(result!.includes('林雪当场分手'))
  assert.ok(result!.includes('不准给出解决方案'))
})

test('extractCliffhangerFromSummary: uses last sentence of multi-sentence summary', () => {
  const result = extractCliffhangerFromSummary('陈锋被泼酒羞辱。林雪当场分手并提出离婚。', 1)
  assert.ok(result)
  assert.ok(result!.includes('林雪当场分手并提出离婚'))
})

test('extractCliffhangerFromSummary: last sentence too short falls back', () => {
  const result = extractCliffhangerFromSummary('陈锋被泼酒羞辱。完了。', 1)
  assert.equal(result, null)
})

test('extractCliffhangerFromSummary: last sentence too long falls back', () => {
  const longSentence = '陈锋在餐厅被张子豪泼酒羞辱后又被众人围观嘲笑最后保安把他赶出大门并且林雪当场分手并提出离婚还要带走孩子分割财产'.repeat(2)
  const result = extractCliffhangerFromSummary(`开场冲突。${longSentence}。`, 1)
  assert.equal(result, null)
})

test('extractCliffhangerFromSummary: sentence containing 概要 falls back', () => {
  const result = extractCliffhangerFromSummary('陈锋被羞辱。本集概要待补。', 1)
  assert.equal(result, null)
})

test('extractCliffhangerFromSummary: empty summary falls back', () => {
  const result = extractCliffhangerFromSummary('', 1)
  assert.equal(result, null)
})

test('extractCliffhangerFromSummary: handles Chinese exclamation and question marks', () => {
  const result = extractCliffhangerFromSummary('陈锋被泼酒！林雪当场分手？', 1)
  assert.ok(result)
  assert.ok(result!.includes('林雪当场分手'))
})

// ── P8 requiredProp 测试 ──

test('buildRequiredProp: extracts prop from summary when keyword present', () => {
  const result = buildRequiredProp({ summary: '沈渊发现暗账被陆崇远篡改。', episodeNo: 1 })
  assert.equal(result.source, 'extracted')
  assert.ok(result.text.includes('暗账'))
  assert.ok(result.text.includes('已在剧情中出现'))
})

test('buildRequiredProp: scheduled fallback when no keyword in summary', () => {
  const result = buildRequiredProp({ summary: '沈渊继续追查真相。', episodeNo: 2 })
  assert.equal(result.source, 'scheduled')
  assert.ok(result.text.includes('需设置'))
  assert.ok(result.text.includes('令牌')) // episode 2 fallback
})

test('buildRequiredProp: firstSceneSetup is scanned for keywords', () => {
  const result = buildRequiredProp({ summary: '沈渊追查真相。', firstSceneSetup: '发现玉佩被调换。', episodeNo: 1 })
  assert.equal(result.source, 'extracted')
  assert.ok(result.text.includes('玉佩'))
})

test('buildRequiredProp: deterministic rotation by episode number', () => {
  const ep1 = buildRequiredProp({ summary: '无道具。', episodeNo: 1 })
  const ep2 = buildRequiredProp({ summary: '无道具。', episodeNo: 2 })
  assert.equal(ep1.source, 'scheduled')
  assert.equal(ep2.source, 'scheduled')
  assert.notEqual(ep1.text, ep2.text) // different fallback props
})

test('buildEpisodeControlCard includes requiredProp and requiredPropSource', () => {
  const card = buildEpisodeControlCard({
    storyIntent: {
      sellingPremise: 'test',
      emotionalPayoff: 'test',
      protagonist: 'test',
      antagonist: 'test',
      coreConflict: 'test',
      officialKeyCharacters: [],
      lockedCharacterNames: [],
      themeAnchors: [],
      worldAnchors: [],
      relationAnchors: [],
      dramaticMovement: []
    },
    beat: { episodeNo: 1, summary: '沈渊发现暗账有问题。' },
    totalEpisodes: 20
  })
  assert.ok(card.requiredProp)
  assert.equal(card.requiredPropSource, 'extracted')
})

test('buildEpisodeControlCard schedules strategy-specific props for female CEO projects', () => {
  const card = buildEpisodeControlCard({
    storyIntent: {
      sellingPremise: '契约婚姻里的豪门反击',
      emotionalPayoff: '女主被撑腰后夺回选择权',
      protagonist: '苏晚',
      antagonist: '豪门长辈',
      coreConflict: '苏晚在集团与豪门压力中夺回选择权',
      officialKeyCharacters: [],
      lockedCharacterNames: [],
      themeAnchors: [],
      worldAnchors: [],
      relationAnchors: [],
      dramaticMovement: [],
      marketProfile: {
        audienceLane: 'female',
        subgenre: '女频霸总甜宠'
      }
    },
    outline: {
      title: '契约婚姻',
      genre: '女频霸总甜宠',
      theme: '女性成长',
      mainConflict: '苏晚在集团与豪门压力中夺回选择权',
      protagonist: '苏晚',
      summary: '苏晚和顾沉契约结婚后共同反击。',
      summaryEpisodes: [],
      facts: []
    },
    beat: {
      episodeNo: 2,
      summary: '苏晚在集团会议上被豪门长辈逼着退让。',
      sceneByScene: []
    },
    totalEpisodes: 20
  })

  assert.match(card.requiredProp || '', /契约|婚约|股权|亲子鉴定|舆论热搜/)
  assert.doesNotMatch(card.requiredProp || '', /令牌|玉佩|血书|灵石|封印/)
})

test('normalizeEpisodeControlCard handles requiredPropSource', () => {
  const card = normalizeEpisodeControlCard({
    episodeMission: '推进主线',
    openingBomb: '先炸场',
    conflictUpgrade: '继续加压',
    arcBeat: '主角改位',
    emotionBeat: '稳住爽感',
    hookLanding: '留钩子',
    povConstraint: '单主角视角',
    forbiddenDrift: [],
    requiredProp: '账本',
    requiredPropSource: 'extracted'
  })
  assert.equal(card?.requiredProp, '账本')
  assert.equal(card?.requiredPropSource, 'extracted')
})

test('normalizeEpisodeControlCard rejects invalid requiredPropSource', () => {
  const card = normalizeEpisodeControlCard({
    episodeMission: '推进主线',
    openingBomb: '先炸场',
    conflictUpgrade: '继续加压',
    arcBeat: '主角改位',
    emotionBeat: '稳住爽感',
    hookLanding: '留钩子',
    povConstraint: '单主角视角',
    forbiddenDrift: [],
    requiredPropSource: 'invalid' as unknown as 'extracted'
  })
  assert.equal(card?.requiredPropSource, undefined)
})
