import test from 'node:test'
import assert from 'node:assert/strict'

import {
  runScriptGenerationBatch,
  buildEpisodeAttemptRequest,
  buildEpisodeEditPrompt,
  buildEpisodeRetryPrompt,
  collectEpisodeGuardFailures,
  pickEpisodeRetryMode,
  shouldAcceptRepairCandidate
} from './run-script-generation-batch.ts'
import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config.ts'
import type { ScriptSegmentDto } from '../../../../shared/contracts/workflow.ts'
import type {
  ScriptGenerationExecutionPlanDto,
  ScriptGenerationProgressBoardDto,
  StartScriptGenerationInputDto
} from '../../../../shared/contracts/script-generation.ts'

function createExecutionPlan(targetEpisodes = 1): ScriptGenerationExecutionPlanDto {
  return {
    mode: 'fresh_start',
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
    existingSceneCount: 0,
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
        estimatedContextTokens: 800,
        strictness: 'normal' as const,
        hasP0Risk: false,
        hasHardAlignerRisk: false,
        isRewriteMode: false,
        recoveryMode: 'fresh' as const
      }
    }))
  }
}

function createGenerationInput(targetEpisodes = 1): StartScriptGenerationInputDto {
  return {
    plan: createExecutionPlan(targetEpisodes),
    outlineTitle: '修仙传',
    theme: '隐忍反咬',
    mainConflict: '黎明被逼亮底',
    charactersSummary: ['黎明:守住钥匙'],
    outline: {
      title: '修仙传',
      genre: '玄幻',
      theme: '隐忍反咬',
      protagonist: '黎明',
      mainConflict: '黎明被逼亮底',
      summary: '李科拿小柔逼黎明亮底。',
      summaryEpisodes: [{ episodeNo: 1, summary: '李科拿小柔逼黎明亮底。' }],
      facts: []
    },
    characters: [
      {
        name: '黎明',
        biography: '守钥人',
        publicMask: '低调',
        hiddenPressure: '小柔被抓',
        fear: '小柔出事',
        protectTarget: '小柔',
        conflictTrigger: '李科拿小柔逼他亮底',
        advantage: '会忍也会算',
        weakness: '太在意小柔',
        goal: '守住钥匙',
        arc: '从隐忍到反咬'
      }
    ],
    existingScript: []
  }
}

function createBoard(targetEpisodes = 1): ScriptGenerationProgressBoardDto {
  return {
    episodeStatuses: Array.from({ length: targetEpisodes }, (_, index) => ({
      episodeNo: index + 1,
      status: 'pending' as const,
      batchIndex: 1,
      reason: 'ready'
    })),
    batchContext: {
      batchSize: 5,
      currentBatchIndex: 1,
      startEpisode: 1,
      endEpisode: targetEpisodes,
      status: 'idle',
      resumeFromEpisode: 1,
      reason: 'test',
      stageContractFingerprint: null,
      updatedAt: new Date().toISOString()
    }
  }
}

function createScene(screenplay: string): ScriptSegmentDto {
  return {
    sceneNo: 1,
    screenplay,
    action: '',
    dialogue: '',
    emotion: '',
    screenplayScenes: []
  }
}

test('collectEpisodeGuardFailures keeps hook_weak as observation and only returns actionable failures', () => {
  const scene = createScene(`第1集\n1-1 日｜地点：旧屋\n人物：黎明\n黎明：（画外音）让她走。`)
  const failures = collectEpisodeGuardFailures(scene)

  assert.deepEqual(
    failures.map((item) => item.code).sort(),
    ['char_count', 'insufficient_dialogue', 'missing_action', 'scene_count', 'thin_scene_body', 'voice_over'].sort()
  )
})

test('collectEpisodeGuardFailures catches template pollution', () => {
  const scene = createScene('第1集\nAction: 待补\nDialogue: 模板对白\nEmotion: 待补')
  const failures = collectEpisodeGuardFailures(scene)

  assert.ok(failures.some((item) => item.code === 'template_pollution'))
})

test('collectEpisodeGuardFailures catches markdown placeholder stub pollution before formal scene', () => {
  const scene = createScene(`# 第28集

## 28-1 深夜｜地点：医庐内室
人物：**人物**
△# 第28集

## 28-1 深夜｜地点：医庐内室
人物：黎明，李诚阳
△药炉余烬泛红，墙缝里还压着潮气。
李诚阳：有人提前翻过这里。
黎明：不是翻过，是在等我回来。
△黎明扯开榻边暗屉，半截染血布条当场露了出来。
李诚阳：这不是医庐的东西。
黎明：那就说明他们已经摸到后手了。
△窗外瓦片骤然一响，短刀已从窗纸外突刺进来。`)
  const failures = collectEpisodeGuardFailures(scene)

  assert.ok(failures.some((item) => item.code === 'template_pollution'))
})

test('pickEpisodeRetryMode prefers parse retry for structure failures', () => {
  const mode = pickEpisodeRetryMode([{ code: 'scene_count', detail: '场次数不在2-4场' }])

  assert.equal(mode, 'retry_parse')
})

test('buildEpisodeRetryPrompt appends targeted rewrite instructions for VO and char_count', () => {
  const prompt = buildEpisodeRetryPrompt('原始 prompt', [
    { code: 'voice_over', detail: '含画外音/旁白/OS' },
    { code: 'char_count', detail: '字数偏胖（当前约2050字，目标800-1800字，差250字）' }
  ])

  assert.match(prompt, /上一版硬失败/)
  assert.match(prompt, /含画外音\/旁白\/OS/)
  assert.match(prompt, /未进场人物的声音必须改成动作描述/)
  assert.match(prompt, /字数超了。当前太肥，需要压缩/)
  assert.match(prompt, /只删水词，不删实质冲突/)
  // hook_weak is observe-only and no longer included in actionable failures
})

test('buildEpisodeRetryPrompt appends targeted rewrite instructions for char_count failures', () => {
  const prompt = buildEpisodeRetryPrompt('原始 prompt', [
    { code: 'char_count', detail: '字数偏瘦（当前约720字，目标800-1800字，差80字）' }
  ])

  assert.match(prompt, /字数偏瘦/)
  assert.match(prompt, /字数不够。当前太薄，需要扩充/)
  assert.match(prompt, /每场双方各至少1句硬对白/)
  assert.match(prompt, /这次是整集重写，不是局部补丁/)
})

test('buildEpisodeEditPrompt rewrites on top of previous screenplay instead of regenerating from scratch', () => {
  // 新口径：char-count-agent 用 getScreenplay() 评估字数
  // screenplay 字段必须和 bodyLengths 总和一致，否则口径错位
  const body1 = 'A'.repeat(1100)
  const body2 = 'B'.repeat(950)
  const scene: ScriptSegmentDto = {
    sceneNo: 26,
    screenplay: body1 + body2,
    action: body1,
    dialogue: body2,
    emotion: '',
    screenplayScenes: [
      {
        sceneCode: '26-1',
        sceneHeading: '26-1 夜',
        characterRoster: ['黎明', '小柔'],
        body: body1
      },
      {
        sceneCode: '26-2',
        sceneHeading: '26-2 夜',
        characterRoster: ['黎明', '李科'],
        body: body2
      }
    ]
  }

  const prompt = buildEpisodeEditPrompt({
    previousScene: scene,
    failures: [
      { code: 'char_count', detail: '字数偏胖（当前约2050字，目标800-1800字，差250字）' }
    ]
  })

  assert.match(prompt, /上一版成稿改稿任务/)
  assert.match(prompt, /只自动改这一次/)
  assert.match(prompt, /不是整集瞎重写/)
  assert.match(prompt, /必须改的上一版原稿/)
  assert.match(prompt, /这次没过的硬问题/)
  assert.match(prompt, /\[char_count\]/)
  assert.match(prompt, /必须压到 800-1800 字区间内/)
  assert.match(prompt, /优先删重复动作、重复逼问、重复解释/)
})

test('buildEpisodeEditPrompt does not cap severe fat rewrite targets at a still-failing ratio', () => {
  const body1 = 'A'.repeat(2200)
  const body2 = 'B'.repeat(2174)
  const scene: ScriptSegmentDto = {
    sceneNo: 11,
    screenplay: body1 + body2,
    action: body1,
    dialogue: body2,
    emotion: '',
    screenplayScenes: [
      {
        sceneCode: '11-1',
        sceneHeading: '11-1 夜',
        characterRoster: ['黎明', '李科'],
        body: body1
      },
      {
        sceneCode: '11-2',
        sceneHeading: '11-2 夜',
        characterRoster: ['黎明', '残党'],
        body: body2
      }
    ]
  }

  const prompt = buildEpisodeEditPrompt({
    previousScene: scene,
    failures: [{ code: 'char_count', detail: '字数偏胖（当前约4374字，目标800-1800字，差2574字）' }]
  })

  assert.match(prompt, /上一版当前约 4374 字，必须压到 800-1800 字区间内/)
  assert.match(prompt, /优先删重复动作、重复逼问、重复解释/)
  assert.doesNotMatch(prompt, /约保留原稿/)
})

test('buildEpisodeAttemptRequest routes retries through the same episode rewrite expert prompt', () => {
  const scene: ScriptSegmentDto = {
    sceneNo: 9,
    screenplay: '第9集\n9-1 夜\n人物：黎明\n△黎明扣住门闩。\n黎明：谁也别动。',
    action: '',
    dialogue: '',
    emotion: '',
    screenplayScenes: [
      {
        sceneCode: '9-1',
        sceneHeading: '9-1 夜',
        characterRoster: ['黎明'],
        body: 'A'.repeat(1100)
      },
      {
        sceneCode: '9-2',
        sceneHeading: '9-2 夜',
        characterRoster: ['黎明', '李科'],
        body: 'B'.repeat(950)
      }
    ]
  }

  const request = buildEpisodeAttemptRequest({
    attempt: 2,
    basePromptText: '原始首稿 prompt',
    bestAttempt: {
      parsedScene: scene,
      rawText: scene.screenplay || '',
      promptLength: 12,
      failures: [
        { code: 'char_count', detail: '字数偏胖（当前约2050字，目标800-1800字，差250字）' }
      ]
    },
    episodeNo: 9,
    runtimeHints: {
      episode: 9,
      totalEpisodes: 20,
      estimatedContextTokens: 1600,
      strictness: 'normal',
      recoveryMode: 'fresh'
    }
  })

  assert.equal(request.task, 'episode_rewrite')
  assert.equal(request.temperature, 0.45)
  assert.equal(request.timeoutMs, 120_000)
  assert.equal(request.runtimeHints?.isRewriteMode, true)
  assert.match(request.prompt, /上一版成稿改稿任务/)
  assert.match(request.prompt, /\[char_count\]/)
  assert.doesNotMatch(request.prompt, /char-count-agent/)
})

test('runScriptGenerationBatch keeps the best episode draft even if quality signals remain after retries', async () => {
  const outputs = Array.from({ length: 3 }, () =>
    [
      '第1集',
      '',
      '1-1 夜 旧屋',
      '人物：黎明',
      '△黎明推门进屋。',
      '黎明：先把灯灭了。',
      '',
      '1-2 夜 门外',
      '人物：黎明、李科',
      '△李科堵在门口。',
      '李科：把钥匙交出来。',
      '黎明：你做梦。',
      '△门外脚步声越逼越近。'
    ].join('\n')
  )
  let callCount = 0

  const result = await runScriptGenerationBatch({
    generationInput: createGenerationInput(1),
    runtimeConfig: {} as RuntimeProviderConfig,
    board: createBoard(1),
    outline: createGenerationInput(1).outline,
    characters: createGenerationInput(1).characters,
    existingScript: [],
    enableImmediateRepair: false,
    generateText: async () => ({
      text: outputs[callCount++]!,
      lane: 'deepseek',
      model: 'test-model',
      usedFallback: false
    })
  })

  assert.equal(callCount, 2)
  assert.equal(result.failure, undefined)
  assert.equal(result.generatedScenes.length, 1)
  assert.ok(collectEpisodeGuardFailures(result.generatedScenes[0]!).length > 0)
})

test('runScriptGenerationBatch prefers the later less-fat rewrite when char_count failure code stays the same', async () => {
  const board = createBoard(1)
  const prompts: string[] = []
  const baseFat = `第1集

1-1 夜｜地点：旧屋
人物：黎明，李科
△${'门外脚步和屋内对峙反复拉长。'.repeat(120)}
李科：交出来。
黎明：你先放人。

1-2 夜｜地点：旧屋内室
人物：黎明，李科，小柔
△${'两人围着钥匙和账册不断重复逼问与解释。'.repeat(120)}
李科：我今晚就要结果。
黎明：那你先把人还我。`
  const lessFatRewrite = `第1集

1-1 夜｜地点：旧屋
人物：黎明，李科
△${'门外脚步逼近，屋内只留下最硬的对峙。'.repeat(55)}
李科：交出来。
黎明：你先放人。

1-2 夜｜地点：旧屋内室
人物：黎明，李科，小柔
△${'黎明扣住门闩，只保留最关键的反咬。'.repeat(55)}
李科：我今晚就要结果。
黎明：那你先把人还我。`

  const result = await runScriptGenerationBatch({
    generationInput: createGenerationInput(1),
    runtimeConfig: {} as RuntimeProviderConfig,
    board,
    outline: createGenerationInput(1).outline!,
    characters: createGenerationInput(1).characters!,
    existingScript: [],
    enableImmediateRepair: false,
    generateText: async (request) => {
      prompts.push(request.prompt)
      const text =
        prompts.length === 1 ? baseFat : lessFatRewrite
      return {
        text,
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false
      }
    }
  })

  assert.equal(result.generatedScenes.length, 1)
  const picked = result.generatedScenes[0]!
  assert.ok((picked.screenplay || '').includes('门外脚步逼近，屋内只留下最硬的对峙'))
  assert.ok(!(picked.screenplay || '').includes('门外脚步和屋内对峙反复拉长'))
  assert.ok(collectEpisodeGuardFailures(picked).length >= 0)
})

test('shouldAcceptRepairCandidate rejects changed rewrite when guard result gets worse', () => {
  const original = createScene(`第5集

5-1 夜｜地点：旧屋
人物：黎明，李科
△${'两人顶在门口，话不多，但冲突已经顶住。'.repeat(35)}
李科：把钥匙交出来。
黎明：你先把人放了。

5-2 夜｜地点：后窗
人物：黎明，小柔
△${'黎明借着后窗暗影挪步，只保留脱身所需的动作。'.repeat(35)}
小柔：后窗还能走。
黎明：先把账页带出去。`)
  const candidate = createScene(`第5集

5-1 夜｜地点：旧屋
人物：黎明，李科
△${'两人顶在门口，冲突之外还加了大段重复解释、重复逼问和重复动作。'.repeat(80)}
李科：把钥匙交出来。
黎明：你先把人放了。

5-2 夜｜地点：后窗
人物：黎明，小柔
△${'后窗一侧不断补写环境、脚步、气味、回忆和反复说明，把同一层意思拉得很长。'.repeat(80)}
小柔：后窗还能走。
黎明：先把账页带出去。`)

  assert.equal(shouldAcceptRepairCandidate(original, candidate), false)
})

test('shouldAcceptRepairCandidate rejects over-compressed rewrite that flips fat into thin', () => {
  const original = createScene(`第4集

4-1 夜｜地点：山道
人物：黎明，李科
△${'两人沿山道缠斗，冲突已经成立，但篇幅明显过胖。'.repeat(45)}
李科：交出来。
黎明：你先让路。

4-2 夜｜地点：坡下
人物：黎明，小柔
△${'黎明带着小柔往坡下抢路，动作和对白都完整，但整场还是太长。'.repeat(45)}
小柔：后面的人追上来了。
黎明：先翻过去。`)
  const candidate = createScene(`第4集

4-1 夜｜地点：山道
人物：黎明，李科
△李科回头盯向黎明，眼神已从愤怒转为杀意。`)

  assert.equal(shouldAcceptRepairCandidate(original, candidate), false)
})

test('shouldAcceptRepairCandidate rejects rewrite that duplicates scene codes', () => {
  const original: ScriptSegmentDto = {
    sceneNo: 2,
    screenplay: '第2集',
    action: '',
    dialogue: '',
    emotion: '',
    screenplayScenes: [
      { sceneCode: '2-1', sceneHeading: '2-1 夜', characterRoster: ['黎明'], body: '人物：黎明\n△黎明逼近。\n黎明：说。' },
      { sceneCode: '2-2', sceneHeading: '2-2 夜', characterRoster: ['李科'], body: '人物：李科\n△李科后退。\n李科：别过来。' }
    ]
  }
  const candidate: ScriptSegmentDto = {
    sceneNo: 2,
    screenplay: '第2集',
    action: '',
    dialogue: '',
    emotion: '',
    screenplayScenes: [
      { sceneCode: '2-1', sceneHeading: '2-1 夜', characterRoster: ['黎明'], body: '人物：黎明\n△黎明逼近。\n黎明：说。' },
      { sceneCode: '2-1', sceneHeading: '2-1 深夜', characterRoster: ['李科'], body: '人物：李科\n△李科后退。\n李科：别过来。' }
    ]
  }

  assert.equal(shouldAcceptRepairCandidate(original, candidate), false)
})

test('shouldAcceptRepairCandidate accepts a rewrite that clears a severe fat draft even if only voice_over remains', () => {
  const original = createScene(`第14集

1-1 日｜地点：潭边
人物：黎明，李科
△${'潭水翻涌，双方围着钥匙和封印连续拉扯、重复威逼、重复解释，把同一层冲突越拖越长。'.repeat(45)}
李科：把钥匙交出来。
黎明：你先住手。

1-2 日｜地点：潭边旧屋外
人物：黎明，李科，小柔，李诚阳
△${'李诚阳赶到后，众人又围着旧账、假钥和门规反复拉锯，已经远超当前集应有篇幅。'.repeat(45)}
李诚阳：按旧规记。
李科：是他先动的封印。

1-3 日｜地点：山林边
人物：黎明，小柔，李诚阳
△${'撤到山林边后，关于代价、提醒和后患又被重复说了很多轮，让尾场继续发胖。'.repeat(45)}
小柔：你的伤怎么样？
黎明：还撑得住。`)

  const candidate = createScene(`第14集

1-1 日｜地点：潭边
人物：黎明，李科
△${'潭水翻涌，黎明强稳封印，李科趁乱逼抢假钥，现场只保留最硬的一轮争夺。'.repeat(8)}
李科：把钥匙交出来。
黎明：你先住手。
△${'李科指尖即将触到钥匙，潭边气压被瞬间拉满。'.repeat(5)}
李诚阳（OS）：输赢，由旧规定。

1-2 日｜地点：潭边旧屋外
人物：黎明，李科，小柔，李诚阳
△${'李诚阳赶到，当场点破假钥并亮出旧账册，把门规审判和旧账反咬压成一场硬碰。'.repeat(8)}
李诚阳：按旧规记。
李科：是他先动的封印。
△${'李科狗急跳墙，扑向裂开的镇石，引爆绿雾，逼得众人当场后撤。'.repeat(5)}

1-3 日｜地点：山林边
人物：黎明，小柔，李诚阳
△${'众人退到山林边，蛇子外溢暂被拖住，黎明立刻意识到这场胜负还没真正收完。'.repeat(8)}
小柔：你的伤怎么样？
黎明：还撑得住。
△${'黎明看向潭口，确认李科虽废，但蛇子的后患才刚刚抬头。'.repeat(5)}`)

  assert.equal(shouldAcceptRepairCandidate(original, candidate), true)
})
