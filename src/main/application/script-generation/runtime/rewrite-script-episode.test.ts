import test from 'node:test'
import assert from 'node:assert/strict'

import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config.ts'
import type {
  RewriteScriptEpisodeInputDto,
  ScriptGenerationExecutionPlanDto
} from '../../../../shared/contracts/script-generation.ts'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow.ts'
import { rewriteScriptEpisode } from './rewrite-script-episode.ts'

function createPlan(targetEpisodes = 10): ScriptGenerationExecutionPlanDto {
  return {
    mode: 'resume',
    ready: true,
    blockedBy: [],
    contract: {
      ready: true,
      targetEpisodes,
      structuralActs: [],
      missingActs: [],
      confirmedFormalFacts: [],
      missingFormalFactLandings: [],
      storyContract: {} as ScriptGenerationExecutionPlanDto['contract']['storyContract'],
      userAnchorLedger: {} as ScriptGenerationExecutionPlanDto['contract']['userAnchorLedger'],
      missingAnchorNames: [],
      heroineAnchorCovered: true
    },
    targetEpisodes,
    existingSceneCount: 3,
    recommendedPrimaryLane: 'deepseek',
    recommendedFallbackLane: 'deepseek',
    runtimeProfile: {
      contextPressureScore: 0,
      shouldCompactContextFirst: false,
      maxStoryIntentChars: 1600,
      maxCharacterChars: 1200,
      maxSegmentChars: 1200,
      recommendedBatchSize: 5,
      profileLabel: 'test',
      reason: 'test'
    },
    episodePlans: Array.from({ length: targetEpisodes }, (_, index) => ({
      episodeNo: index + 1,
      status: 'ready' as const,
      lane: 'deepseek' as const,
      reason: 'ready',
      runtimeHints: {
        episode: index + 1,
        totalEpisodes: targetEpisodes,
        estimatedContextTokens: 1000,
        strictness: 'normal' as const,
        hasP0Risk: false,
        hasHardAlignerRisk: false,
        isRewriteMode: false,
        recoveryMode: 'fresh' as const
      }
    }))
  }
}

function createExistingScript(): ScriptSegmentDto[] {
  return [
    {
      sceneNo: 1,
      screenplay:
        '第1集\n\n1-1 夜｜地点：旧屋\n人物：黎明\n△黎明推门进屋。\n黎明：门已经锁死了。',
      action: '',
      dialogue: '',
      emotion: '',
      screenplayScenes: []
    },
    {
      sceneNo: 2,
      screenplay:
        '第2集\n\n2-1 夜｜地点：旧屋\n人物：黎明，李科\n△李科堵在门口。\n李科：（画外音）把钥匙交出来。',
      action: '',
      dialogue: '',
      emotion: '',
      screenplayScenes: []
    }
  ]
}

function createInput(): RewriteScriptEpisodeInputDto {
  return {
    episodeNo: 2,
    plan: createPlan(),
    outlineTitle: '修仙传',
    theme: '不争',
    mainConflict: '黎明被逼亮底',
    charactersSummary: ['黎明:守住钥匙', '李科:逼出钥匙'],
    outline: {
      title: '修仙传',
      genre: '玄幻',
      theme: '不争',
      protagonist: '黎明',
      mainConflict: '黎明被逼亮底',
      summary: '李科拿小柔逼黎明亮底。',
      summaryEpisodes: [
        { episodeNo: 1, summary: '第1集' },
        { episodeNo: 2, summary: '第2集' }
      ],
      facts: []
    },
    characters: [
      {
        name: '黎明',
        biography: '守钥人',
        publicMask: '低调',
        hiddenPressure: '要护小柔',
        fear: '小柔出事',
        protectTarget: '小柔',
        conflictTrigger: '被拿小柔逼时亮底',
        advantage: '会忍也会算',
        weakness: '太在意小柔',
        goal: '守住钥匙',
        arc: '从隐忍到反咬'
      },
      {
        name: '李科',
        biography: '恶霸',
        publicMask: '凶狠',
        hiddenPressure: '怕自己输',
        fear: '失势',
        protectTarget: '自己',
        conflictTrigger: '拿不到钥匙就加压',
        advantage: '敢压人',
        weakness: '自负',
        goal: '逼出钥匙',
        arc: '越压越失控'
      }
    ],
    segments: [],
    existingScript: createExistingScript()
  }
}

test('rewriteScriptEpisode rewrites the selected episode on top of the current draft', async () => {
  const prompts: string[] = []

  const result = await rewriteScriptEpisode(
    createInput(),
    {} as RuntimeProviderConfig,
    {
      generateText: async (request) => {
        prompts.push(request.prompt)
        return {
          text: [
            '第2集',
            '',
            '2-1 夜｜地点：旧屋',
            '人物：黎明，李科',
            '△李科堵在门口，手里攥着铁链，逼黎明当场亮底。',
            '李科：把钥匙交出来。',
            '黎明：你先把门口的人撤开。',
            '△门闩当场被李科一脚踹裂，旧屋局面立刻翻紧。'
          ].join('\n'),
          lane: 'deepseek',
          model: 'test-model',
          usedFallback: false
        }
      }
    }
  )

  assert.equal(result.scene.sceneNo, 2)
  assert.match(result.scene.screenplay || '', /门闩当场被李科一脚踹裂/)
  assert.ok(result.failures.every((failure) => failure.code !== 'voice_over'))
  assert.match(prompts[0] || '', /上一版成稿改稿任务/)
  assert.match(prompts[0] || '', /这次没过的硬问题/)
  assert.match(prompts[0] || '', /李科：（画外音）把钥匙交出来。/)
})

test('rewriteScriptEpisode keeps the current draft when the manual rewrite gets worse', async () => {
  const input = createInput()
  const original = input.existingScript[1]!

  const result = await rewriteScriptEpisode(
    input,
    {} as RuntimeProviderConfig,
    {
      generateText: async () => ({
        text: '第2集\n\n2-1 夜｜地点：旧屋\n人物：黎明，李科\n李科：（画外音）把钥匙交出来。',
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false
      })
    }
  )

  assert.equal(result.scene.screenplay, original.screenplay)
  assert.ok(result.failures.some((failure) => failure.code === 'voice_over'))
})
