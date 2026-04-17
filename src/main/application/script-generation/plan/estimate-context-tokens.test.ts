import test from 'node:test'
import assert from 'node:assert/strict'
import { estimateEpisodeContextTokens } from './estimate-context-tokens.ts'
import type { DetailedOutlineSegmentDto } from '../../../../shared/contracts/workflow.ts'

test('estimateEpisodeContextTokens tracks prompt-like window instead of full history totals', () => {
  const script = Array.from({ length: 61 }, (_, index) => ({
    sceneNo: index + 1,
    screenplay: '剧本文本'.repeat(200),
    action: '',
    dialogue: '',
    emotion: ''
  }))

  const actOrder: DetailedOutlineSegmentDto['act'][] = ['opening', 'midpoint', 'climax', 'ending']
  const segments: DetailedOutlineSegmentDto[] = Array.from({ length: 12 }, (_, index) => ({
    act: actOrder[Math.min(3, Math.floor(index / 3))] || 'ending',
    content: `section-${index + 1}`,
    hookType: '推进',
    episodeBeats: Array.from({ length: 5 }, (_, beatIndex) => ({
      episodeNo: index * 5 + beatIndex + 1,
      summary: `beat-${index + 1}-${beatIndex + 1}`,
      sceneByScene: Array.from({ length: 2 }, (_, sceneIndex) => ({
        sceneNo: sceneIndex + 1,
        location: '镇口',
        timeOfDay: '夜',
        setup: '铺垫'.repeat(30),
        tension: '张力'.repeat(30),
        hookEnd: '钩子'.repeat(30)
      }))
    }))
  }))

  const estimate = estimateEpisodeContextTokens({
    outline: {
      title: 'title',
      genre: 'genre',
      theme: 'theme',
      mainConflict: 'main conflict',
      protagonist: 'hero',
      summary: 'summary',
      summaryEpisodes: Array.from({ length: 60 }, (_, i) => ({
        episodeNo: i + 1,
        summary: `第${i + 1}集`
      })),
      facts: [
        {
          id: 'fact-1',
          label: '关键人物关系',
          description: '恶霸会持续拿少年守钥人逼主角亮底。',
          linkedToPlot: true,
          linkedToTheme: true,
          authorityType: 'user_declared',
          provenanceTier: 'user_declared',
          originAuthorityType: 'user_declared',
          originDeclaredBy: 'user',
          status: 'confirmed',
          level: 'core',
          declaredBy: 'user',
          declaredStage: 'outline',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ],
      outlineBlocks: [],
      planningUnitEpisodes: 10
    },
    characters: [
      {
        name: '少年守钥人',
        biography: '',
        publicMask: '',
        hiddenPressure: '',
        fear: '',
        protectTarget: '小镇少女',
        conflictTrigger: '',
        advantage: '优势'.repeat(10),
        weakness: '短板'.repeat(10),
        goal: '目标'.repeat(10),
        arc: '弧光'.repeat(10),
        roleLayer: 'core',
        activeBlockNos: []
      }
    ],
    segments,
    script,
    targetEpisodes: 60,
    episodeNo: 62
  })

  assert.ok(estimate < 80000, `expected compact estimate under hard limit, got ${estimate}`)
  assert.ok(estimate > 1000, 'estimate should still have meaningful weight')
})
