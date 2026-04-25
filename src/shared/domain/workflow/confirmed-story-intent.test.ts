import test from 'node:test'
import assert from 'node:assert/strict'

import {
  buildConfirmedStoryIntent,
  isConfirmedStoryIntentForTranscript
} from './confirmed-story-intent.ts'

test('buildConfirmedStoryIntent pins generation brief to current transcript', () => {
  const result = buildConfirmedStoryIntent({
    storyIntent: {
      titleHint: '项目A',
      sellingPremise: '林秋被逼卷进一场反杀局',
      coreDislocation: '林秋以为忍住就能保全一切',
      emotionalPayoff: '一路反咬的爽感',
      protagonist: '林秋',
      antagonist: '周沉',
      coreConflict: '林秋被逼在追杀和旧账之间反打',
      officialKeyCharacters: ['林秋'],
      shortDramaConstitution: {
        corePrinciple: '快节奏、强冲突、稳情绪',
        coreEmotion: '一路反咬的爽感',
        incitingIncident: {
          timingRequirement: '30 秒炸场，最晚不超过第 1 集结尾',
          disruption: '周沉先把林秋拖进反杀局',
          mainLine: '林秋必须先守住眼前人'
        },
        protagonistArc: {
          flawBelief: '林秋以为一直忍就能保全一切',
          growthMode: '每集被逼着改一次打法',
          payoff: '最后把旧账打回去'
        },
        povPolicy: {
          mode: 'single_protagonist',
          allowedAuxiliaryViewpoints: ['周沉'],
          restriction: '默认单主角视角，其他视角只能补主线必要信息。'
        },
        climaxPolicy: {
          episodeHookRule: '集集有小高潮，集尾必须留强钩子。',
          finalePayoffRule: '结局总爆发，并回打开篇激励事件。',
          callbackRequirement: '结局必须回打开篇第一刀。'
        }
      }
    },
    generationBriefText: '【项目】项目A｜30集',
    chatTranscript: '用户：先写10集\n用户：改成30集'
  })

  assert.equal(result.generationBriefText, '【项目】项目A｜30集')
  assert.equal(result.confirmedChatTranscript, '用户：先写10集\n用户：改成30集')
  assert.deepEqual(result.officialKeyCharacters, ['林秋'])
  assert.deepEqual(result.themeAnchors, [])
  assert.equal(result.shortDramaConstitution?.corePrinciple, '快节奏、强冲突、稳情绪')
  assert.equal(result.shortDramaConstitution?.incitingIncident.disruption, '周沉先把林秋拖进反杀局')
  assert.match(result.shortDramaConstitution?.povPolicy.restriction || '', /单主角视角/)
})

test('isConfirmedStoryIntentForTranscript only passes on exact current transcript', () => {
  const storyIntent = buildConfirmedStoryIntent({
    storyIntent: {
      titleHint: '项目A',
      shortDramaConstitution: {
        corePrinciple: '快节奏、强冲突、稳情绪',
        coreEmotion: '爽感持续兑现',
        incitingIncident: {
          timingRequirement: '30 秒炸场，最晚不超过第 1 集结尾',
          disruption: '项目A先炸场',
          mainLine: '项目A立主线'
        },
        protagonistArc: {
          flawBelief: '旧判断',
          growthMode: '被剧情打脸',
          payoff: '最终回收'
        },
        povPolicy: {
          mode: 'single_protagonist',
          allowedAuxiliaryViewpoints: [],
          restriction: '默认单主角视角，其他视角只能补主线必要信息。'
        },
        climaxPolicy: {
          episodeHookRule: '集集有小高潮，集尾必须留强钩子。',
          finalePayoffRule: '结局总爆发，并回打开篇激励事件。',
          callbackRequirement: '结局必须回打第一刀。'
        }
      }
    },
    generationBriefText: '【项目】项目A｜30集',
    chatTranscript: '用户：先写10集\n用户：改成30集'
  })

  assert.equal(
    isConfirmedStoryIntentForTranscript(storyIntent, '用户：先写10集\n用户：改成30集'),
    true
  )
  assert.equal(
    isConfirmedStoryIntentForTranscript(
      storyIntent,
      '用户：先写10集\n用户：改成30集\n用户：我现在要60集'
    ),
    false
  )
})

test('buildConfirmedStoryIntent normalizes protagonist, antagonist and locked character names before persisting', () => {
  const result = buildConfirmedStoryIntent({
    storyIntent: {
      protagonist: '韦小宝，妓院长大的机灵小混混，意外成为天地会香主和皇帝朋友',
      antagonist: '海大富，瞎眼太监总管，表面收留韦小宝实则另有目的',
      officialKeyCharacters: ['韦小宝', '海大富', '天地', '韦小宝实则另有目'],
      lockedCharacterNames: ['韦小宝', '海大富', '妓院长大']
    },
    generationBriefText: '【项目】韦小宝皇宫奇遇记｜30集',
    chatTranscript: '用户：我要写韦小宝'
  })

  assert.equal(result.protagonist, '韦小宝')
  assert.equal(result.antagonist, '海大富')
  assert.deepEqual(result.officialKeyCharacters, ['韦小宝', '海大富'])
  assert.deepEqual(result.lockedCharacterNames, ['韦小宝', '海大富'])
})

test('buildConfirmedStoryIntent passes creativeSummary and storySynopsis through', () => {
  const result = buildConfirmedStoryIntent({
    storyIntent: {
      titleHint: '修仙传',
      genre: '玄幻',
      creativeSummary: '用户想写废灵根刺客的故事',
      storySynopsis: {
        logline: '废灵根刺客觉醒神尊之力',
        openingPressureEvent: '测灵台判废体',
        protagonistCurrentDilemma: '功劳被夺',
        firstFaceSlapEvent: '测灵石炸裂',
        antagonistForce: '宗门长老',
        antagonistPressureMethod: '用规矩压人',
        corePayoff: '逆袭',
        stageGoal: '查清黑幕',
        finaleDirection: '登顶清算'
      }
    },
    generationBriefText: 'brief',
    chatTranscript: 'transcript'
  })

  assert.equal(result.creativeSummary, '用户想写废灵根刺客的故事')
  assert.ok(result.storySynopsis)
  assert.equal(result.storySynopsis?.logline, '废灵根刺客觉醒神尊之力')
  assert.equal(result.storySynopsis?.openingPressureEvent, '测灵台判废体')
})

test('buildConfirmedStoryIntent defaults creativeSummary to empty string when missing', () => {
  const result = buildConfirmedStoryIntent({
    storyIntent: {
      titleHint: '测试'
    },
    generationBriefText: 'brief',
    chatTranscript: 'transcript'
  })

  assert.equal(result.creativeSummary, '')
  assert.equal(result.storySynopsis, null)
})
