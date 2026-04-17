import test from 'node:test'
import assert from 'node:assert/strict'

import { matchFormalFactLanding } from './match-formal-fact-landing.ts'

test('matchFormalFactLanding recognizes landed draft pressure fact in detailed outline segments', () => {
  const fact = {
    id: 'fact-1',
    label: 'draft_李科施压线',
    description: '李科是主角当前最直接的外部压力来源之一，正在把冲突推向主角在多重压力下完成反转成长。',
    linkedToPlot: true,
    linkedToTheme: false,
    authorityType: 'ai_suggested' as const,
    status: 'confirmed' as const,
    level: 'core' as const,
    declaredBy: 'system' as const,
    declaredStage: 'outline' as const,
    createdAt: '2026-03-25T00:00:00.000Z',
    updatedAt: '2026-03-25T00:00:00.000Z'
  }

  const segments = [
    '李科先拿小柔逼黎明交出密库钥匙，把主线第一轮压力正面压下来。',
    '妖兽蛇子开始在王母宫露头，李科趁乱继续加压，小柔被卷得更深。',
    '李科误以为局面尽在掌握，当众逼黎明低头，双方第一次真正撕破脸。'
  ].join('\n')

  assert.equal(matchFormalFactLanding(fact, segments), true)
})

test('matchFormalFactLanding recognizes actionized hidden-strength fact landing', () => {
  const fact = {
    id: 'fact-2',
    label: '黎明隐忍',
    description: '黎明早年吃亏后悟透隐忍之道，表面无武，实则身怀绝技。',
    linkedToPlot: true,
    linkedToTheme: true,
    authorityType: 'user_declared' as const,
    status: 'confirmed' as const,
    level: 'core' as const,
    declaredBy: 'user' as const,
    declaredStage: 'outline' as const,
    createdAt: '2026-03-25T00:00:00.000Z',
    updatedAt: '2026-03-25T00:00:00.000Z'
  }

  const segments = [
    '黎明先低头赔笑，把真本事压回去，装作不会动手。',
    '李科把刀抵到小柔喉咙时，黎明先忍住不出手，只把人往门外让。',
    '等对方露出破绽，黎明才突然反咬。'
  ].join('\n')

  assert.equal(matchFormalFactLanding(fact, segments), true)
})

test('matchFormalFactLanding recognizes rank identity fact when it becomes visible pressure', () => {
  const fact = {
    id: 'fact-3',
    label: '黎明排行第十九',
    description: '黎明是李诚阳的第十九个徒弟，在宗门里常被轻视。',
    linkedToPlot: true,
    linkedToTheme: false,
    authorityType: 'user_declared' as const,
    status: 'confirmed' as const,
    level: 'supporting' as const,
    declaredBy: 'user' as const,
    declaredStage: 'outline' as const,
    createdAt: '2026-03-25T00:00:00.000Z',
    updatedAt: '2026-03-25T00:00:00.000Z'
  }

  const segments = [
    '执事抬手拦住黎明，冷声说第十九个徒弟没资格先碰账册。',
    '门口几名弟子当众点名羞辱他，逼他先退到最后一位。',
    '黎明没有争辩，只把账页塞进袖口，转身换路。'
  ].join('\n')

  assert.equal(matchFormalFactLanding(fact, segments), true)
})
