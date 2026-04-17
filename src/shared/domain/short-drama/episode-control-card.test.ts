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
