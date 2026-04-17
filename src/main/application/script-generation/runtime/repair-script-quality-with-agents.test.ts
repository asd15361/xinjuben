import test from 'node:test'
import assert from 'node:assert/strict'

import type {
  ScriptGenerationExecutionPlanDto,
  StartScriptGenerationInputDto
} from '../../../../shared/contracts/script-generation.ts'
import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config.ts'
import { inspectContentQualityEpisode } from '../../../../shared/domain/script/screenplay-content-quality.ts'
import { parseGeneratedScene } from './parse-generated-scene.ts'
import { repairScriptQualityWithAgents } from './repair-script-quality-with-agents.ts'

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
    scriptControlPackage: {
      shortDramaConstitution: {
        corePrinciple: '快节奏、强冲突、稳情绪',
        coreEmotion: '一路反咬',
        incitingIncident: {
          timingRequirement: '30 秒炸场',
          disruption: '李科先拿小柔逼黎明亮底。',
          mainLine: '黎明必须当场反咬。'
        },
        protagonistArc: {
          flawBelief: '一直忍就能护住人',
          growthMode: '被逼后开始改打法',
          payoff: '把旧账打回去'
        },
        povPolicy: {
          mode: 'single_protagonist',
          allowedAuxiliaryViewpoints: ['李科'],
          restriction: '默认单主角视角'
        },
        climaxPolicy: {
          episodeHookRule: '集尾必须留强钩子',
          finalePayoffRule: '结局总爆发',
          callbackRequirement: '回打开篇逼迫'
        }
      },
      episodeControlPlans: Array.from({ length: targetEpisodes }, (_, index) => ({
        episodeNo: index + 1,
        episodeControlCard: {
          episodeMission: `第${index + 1}集必须继续往前推主线。`,
          openingBomb: '开场先把压力砸到脸上。',
          conflictUpgrade: '把冲突再压重一层。',
          arcBeat: '主角被逼着改打法。',
          emotionBeat: `第${index + 1}集继续稳住一路反咬。`,
          hookLanding: '集尾必须留下下一步动作。',
          povConstraint: '只跟主角视角走。',
          forbiddenDrift: ['不要解释背景']
        }
      }))
    },
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

function createShortEpisode(): string {
  return [
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
}

function createDenseEpisode(): string {
  const sceneOne = [
    '△ 黎明把账册压在桌角，盯着李科袖口那截带血的布条，逼自己先把怒火压回喉咙里，不肯退开半步。',
    '李科：把钥匙交出来，我今晚还能让小柔少挨一鞭子。',
    '黎明：你先放人，我才告诉你账册里到底写了谁的名字。',
    '△ 李科故意把沾泥的账页摔到火盆边，逼黎明看清上面已经被烧焦的封印记录和旧衙门印记。',
    '李科：你再拖一步，她后院那条命就先替你还账。',
    '黎明：你碰她一下，我就把你截走河道清淤银两的旧账，当街掀给所有人看。',
    '△ 门外两个手下互相递眼色，火把在门缝里一晃一晃，把墙上的刀痕和地上的血滴都照了出来。',
    '李科：你敢赌我不敢先下手？',
    '黎明：你敢赌我手里这页账，不会先把你拖下水？',
    '△ 黎明一步不退，把账册翻到写着河道清淤、旧仓夜运和私印转手的那页，逐字念给门外的人听，逼李科脸色一点点沉下去。',
    '李科：你以为吓得住谁？',
    '黎明：我不是吓你，我是在替你把今晚要掉下来的那层皮，当场揭给所有人看。'
  ].join('\n')

  const sceneTwo = [
    '△ 李科一步步压进门槛，把后腰短刀抽出半寸，刀鞘边缘还沾着刚蹭上的墙灰和血丝，逼得空气都跟着发紧。',
    '李科：最后一遍，把钥匙交出来。',
    '黎明：钥匙不给，账也不给；你今晚要么放人，要么先把自己埋进去。',
    '△ 黎明把账册塞进怀里，顺手抄起顶门杠横在身前，手背青筋绷起，却始终没有把视线从李科脸上挪开。',
    '李科：你真以为一根破木杠就能拦住我？',
    '黎明：我拦的不是你，是你今夜想继续装成没做过那些脏事的路。',
    '△ 门外手下听见这句话，动作同时顿了一拍，连火把都不自觉往后缩，院里只剩木杠摩擦地砖的刺耳声。',
    '李科：给我撞门，谁敢后退我先废谁。',
    '△ 三个人同时压上门板，门闩当场断裂，火把一下照进屋里。',
    '△ 木屑和火星一起炸开，李科刚想抬刀，黎明已经把顶门杠横着捅进门口，把最前面的打手直接撞翻在地。',
    '李科：给我按住他，账册和钥匙一个都别让他带出去。',
    '黎明：谁先踩进这道门，我就先把谁的名字写进这本账里，一起陪你下去见官。',
    '△ 门外原本举着火把的人终于往后退了半步，火光映出李科脸上那一下来不及藏住的惊色，屋里的局面当场翻了过来。'
  ].join('\n')

  return [
    '第1集',
    '',
    '1-1 夜 旧屋',
    '人物：黎明、李科',
    sceneOne,
    '',
    '1-2 夜 门内',
    '人物：黎明、李科、打手',
    sceneTwo
  ].join('\n')
}

function createCraftSolidThemeWeakEpisode(episodeNo: number): string {
  return [
    `第${episodeNo}集`,
    '',
    `${episodeNo}-1 夜 旧屋`,
    '人物：黎明、李科',
    '△李科堵住门口，手里晃着从后院顺来的铁链，逼黎明当场把账册交出来，还故意把链头拖在地砖上刮出一串刺耳火星。',
    '李科：现在交，我还能让小柔少受一层罪。',
    '黎明：账册不给，我先把假的钥匙递给你，你要真敢碰，我就让门外所有人都知道你今晚到底图什么。',
    '△李科伸手来抢，黎明反手把假钥匙砸向火盆，火星当场炸开，连压在桌角那页写着旧仓夜运的账纸也被烫得卷起边来。',
    '李科：你拿一把假钥匙糊弄我，就真不怕我先把人拖走？',
    '黎明：你要拖她走，我现在就把账上那几个名字念出去，让你这层皮先在众人面前掉下来。',
    '△门外两个打手听见“旧仓”“夜运”几个字，本能地对视了一眼，火把却还是死死压在门缝外，逼得屋里空气越来越闷。',
    '李科：你以为靠几句旧账就能逼我后退？今夜这扇门里外都站着我的人，只要我一句话，小柔和账页你一个都护不住。',
    '黎明：那你最好现在就动手，因为你只要慢一息，门外那几个听见名字的人就会开始替自己找退路，你的局先散。',
    '',
    `${episodeNo}-2 夜 后窗`,
    '人物：黎明、小柔、李科',
    '△小柔把藏在袖口里的真账页塞进黎明掌心，自己转身挡住后窗，顺手把窗边那块松木板往里一别，让外面的人一时半会儿撞不进来。',
    '小柔：账页拿稳，我替你拖他三息。',
    '李科：给我撞开后窗，把人和账都按住。',
    '黎明：我不走正门，我带着账页翻出去，谁敢跟出来，我就先把那页盖着私印的旧账扬到街上去。',
    '△门外的人刚抬肩撞窗，小柔就把桌上的油灯往窗沿一推，热油顺着木缝淌下去，逼得最前面的打手猛地缩手后退。',
    '李科：都别退，先把账页抢回来！',
    '小柔：你再往前一步，我就把你刚才威胁人的话一字不差喊出去，让后院那几个本来就心虚的手下先乱起来。',
    '△后窗外的人被热油和喊话同时逼得一滞，脚步乱成一片，连本来顶在窗上的木杠都滑了一下，给黎明腾出更大的翻身空当。',
    '△木栓当场断裂，李科的人扑空摔进屋里，黎明借着这一撞翻出后窗，带着账页先一步落进暗巷，局面当场从守屋变成了带账脱身。'
  ].join('\n')
}

function createWeakOpeningFlipEpisode(): string {
  return [
    '第1集',
    '',
    '1-1 夜 旧屋',
    '人物：黎明、李科',
    '△李科堵死门口，把小柔的发簪晃到黎明眼前，逼他立刻交出钥匙。',
    '李科：现在交，我还能让她少吃点苦头。',
    '黎明：你先放人。',
    '△门外脚步越来越近，火把把屋里的影子压得发抖。',
    '',
    '1-2 夜 门口',
    '人物：黎明、李科、小柔',
    '△小柔被人按在门边，只能抬眼看着黎明。',
    '李科：再拖一息，我就先把她带走。',
    '黎明：你别碰她。',
    '△李科抬手示意手下逼近，黎明攥紧拳头，却还没有逼出新的结果。'
  ].join('\n')
}

function createWeakSceneEngineEpisode(): string {
  return [
    '第4集',
    '',
    '4-1 夜 破庙',
    '人物：黎明、小柔',
    '△黎明和小柔躲进破庙，听着外面风声和脚步声越来越近。',
    '小柔：他们迟早会找到这里。',
    '黎明：先别出声。',
    '△两人只是继续盯着门口，没有真正改掉眼前的局面。',
    '',
    '4-2 夜 庙门',
    '人物：黎明、李科',
    '△李科站在门外，语气越来越冷，却还没有真正闯进来。',
    '李科：我知道你在里面，把账页交出来。',
    '黎明：你先把人撤开。',
    '△门板被风吹得晃动，双方继续僵着，场面还是没有落下结果。'
  ].join('\n')
}

function createPlaceholderPollutedEpisode(): string {
  return [
    '第28集',
    '',
    '## 28-1 深夜｜地点：医庐内室',
    '人物：**人物**',
    '△# 第28集',
    '',
    '## 28-1 深夜｜地点：医庐内室',
    '人物：黎明，李诚阳',
    '△药炉余烬泛红，墙缝里还压着潮气。',
    '李诚阳：有人提前翻过这里。',
    '黎明：不是翻过，是在等我回来。',
    '△黎明扯开榻边暗屉，半截染血布条当场露了出来。',
    '李诚阳：这不是医庐的东西。',
    '黎明：那就说明他们已经摸到后手了。',
    '',
    '28-2 深夜｜地点：医庐外廊',
    '人物：黎明，李诚阳，残党头目',
    '△窗纸破开一道刀口，寒气裹着脚步声一起灌进来。',
    '残党头目：把账页交出来，我让你们死得快一点。',
    '黎明：你先说，是谁把你放进医庐的。',
    '△黎明抬脚踢翻药架，瓷瓶当场碎满走廊，残党头目被逼得侧身后撤。']
    .join('\n')
}

function createCleanedPlaceholderEpisode(): string {
  return [
    '第28集',
    '',
    '28-1 深夜｜地点：医庐内室',
    '人物：黎明，李诚阳',
    '△药炉余烬泛红，墙缝里还压着潮气。',
    '李诚阳：有人提前翻过这里。',
    '黎明：不是翻过，是在等我回来。',
    '△黎明扯开榻边暗屉，半截染血布条当场露了出来。',
    '李诚阳：这不是医庐的东西。',
    '黎明：那就说明他们已经摸到后手了。',
    '',
    '28-2 深夜｜地点：医庐外廊',
    '人物：黎明，李诚阳，残党头目',
    '△窗纸破开一道刀口，寒气裹着脚步声一起灌进来。',
    '残党头目：把账页交出来，我让你们死得快一点。',
    '黎明：你先说，是谁把你放进医庐的。',
    '△黎明抬脚踢翻药架，瓷瓶当场碎满走廊，残党头目被逼得侧身后撤。',
    '李诚阳：外门已经失守了。',
    '黎明：那就把来的人全困死在这条廊里。',
    '△廊柱后的机簧被黎明一把扣下，铁栅当场砸落，残党头目退路瞬间被封死。']
    .join('\n')
}

test('repairScriptQualityWithAgents returns the current draft untouched when content repair is disabled', async () => {
  const initialScene = parseGeneratedScene(createShortEpisode(), 1)
  let callCount = 0

  const result = await repairScriptQualityWithAgents({
    generationInput: createGenerationInput(1),
    runtimeConfig: {} as RuntimeProviderConfig,
    generatedScenes: [initialScene],
    enableContentRepair: false,
    generateText: async () => {
      callCount += 1
      return {
        text: createDenseEpisode(),
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false
      }
    }
  })

  assert.equal(callCount, 0)
  assert.equal(result.repairedScenes.length, 1)
  assert.equal(result.repairedScenes[0]?.screenplay, initialScene.screenplay)
})

test('repairScriptQualityWithAgents keeps the current draft when content repair is disabled', async () => {
  const initialScene = parseGeneratedScene(createShortEpisode(), 1)
  let callCount = 0

  const result = await repairScriptQualityWithAgents({
    generationInput: createGenerationInput(1),
    runtimeConfig: {} as RuntimeProviderConfig,
    generatedScenes: [initialScene],
    enableContentRepair: false,
    generateText: async () => ({
      text: createDenseEpisode(),
      lane: 'deepseek',
      model: 'test-model',
      usedFallback: false
    })
  })

  assert.equal(callCount, 0)
  assert.equal(result.repairedScenes[0]?.screenplay, initialScene.screenplay)
})

test('repairScriptQualityWithAgents runs format pollution agent before content agents on placeholder stub drafts', async () => {
  const pollutedScene = parseGeneratedScene(createPlaceholderPollutedEpisode(), 28)
  const requestedAgents: string[] = []

  const result = await repairScriptQualityWithAgents({
    generationInput: createGenerationInput(30),
    runtimeConfig: {} as RuntimeProviderConfig,
    generatedScenes: [pollutedScene],
    enableContentRepair: true,
    phase: 'phase_a',
    generateText: async (request) => {
      if (request.prompt.includes('格式清理代理')) requestedAgents.push('format_pollution')
      if (request.prompt.includes('场次结构代理')) requestedAgents.push('scene_structure')
      if (request.prompt.includes('episode-engine-agent')) requestedAgents.push('episode_engine')
      if (request.prompt.includes('arc-control-agent')) requestedAgents.push('arc_control')
      if (request.prompt.includes('emotion-lane-agent')) requestedAgents.push('emotion_lane')
      return {
        text: createCleanedPlaceholderEpisode(),
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false
      }
    }
  })

  assert.equal(requestedAgents[0], 'format_pollution')
  assert.ok(requestedAgents.includes('format_pollution'))
  assert.ok(result.repairedScenes.length === 1)
})

test('repairScriptQualityWithAgents does not run emotion lane agent on non-key episodes when only emotion anchoring is weak', async () => {
  const initialScene = parseGeneratedScene(createCraftSolidThemeWeakEpisode(3), 3)
  let emotionLaneAgentCalls = 0

  const result = await repairScriptQualityWithAgents({
    generationInput: createGenerationInput(10),
    runtimeConfig: {} as RuntimeProviderConfig,
    generatedScenes: [initialScene],
    enableContentRepair: true,
    generateText: async (request) => {
      if (request.prompt.includes('emotion-lane-agent')) {
        emotionLaneAgentCalls += 1
      }
      return {
        text: initialScene.screenplay ?? '',
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false
      }
    }
  })

  assert.equal(emotionLaneAgentCalls, 0)
  assert.equal(result.repairedScenes[0]?.screenplay, initialScene.screenplay)
})

test('repairScriptQualityWithAgents runs emotion lane agent on batch closing episodes when only emotion anchoring is weak', async () => {
  const initialScene = parseGeneratedScene(createCraftSolidThemeWeakEpisode(5), 5)
  let emotionLaneAgentCalls = 0

  const result = await repairScriptQualityWithAgents({
    generationInput: createGenerationInput(10),
    runtimeConfig: {} as RuntimeProviderConfig,
    generatedScenes: [initialScene],
    enableContentRepair: true,
    generateText: async (request) => {
      if (request.prompt.includes('emotion-lane-agent')) {
        emotionLaneAgentCalls += 1
      }
      return {
        text: initialScene.screenplay ?? '',
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false
      }
    }
  })

  assert.equal(emotionLaneAgentCalls, 1)
  assert.equal(result.repairedScenes[0]?.screenplay, initialScene.screenplay)
})

test('repairScriptQualityWithAgents keeps the original draft when a content agent rewrites it into a fat guard failure', async () => {
  const initialScene = parseGeneratedScene(createCraftSolidThemeWeakEpisode(5), 5)
  let emotionLaneAgentCalls = 0
  const fatRewrite = `${createCraftSolidThemeWeakEpisode(5)}
${Array.from({ length: 40 }, () =>
  '△黎明又把同一份账页、火把、脚步、旧账和门闩来回解释一遍，把已经成立的局面重复拉长。'
).join('\n')}`

  const result = await repairScriptQualityWithAgents({
    generationInput: createGenerationInput(10),
    runtimeConfig: {} as RuntimeProviderConfig,
    generatedScenes: [initialScene],
    enableContentRepair: true,
    generateText: async (request) => {
      if (request.prompt.includes('emotion-lane-agent')) {
        emotionLaneAgentCalls += 1
      }
      return {
        text: fatRewrite,
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false
      }
    }
  })

  assert.equal(emotionLaneAgentCalls, 1)
  assert.equal(result.repairedScenes[0]?.screenplay, initialScene.screenplay)
})

test('repairScriptQualityWithAgents skips emotion lane agent on long batch closing episodes to avoid re-expanding the draft', async () => {
  const extraLongTail = Array.from({ length: 6 }, () =>
    '△黎明把半湿账页重新压平，任由窗外火把和钟声一阵阵逼近，门后的木栓、鞋底的碎钥和手里的私印页都被他重新点了一遍。'
  ).join('\n')
  const extraLongPadding = Array.from({ length: 12 }, () =>
    '△门外火把一次次压近又退开，照得窗纸、门闩、账页和鞋底碎钥来回发亮，逼得屋里每个人都只能继续硬扛这一息。'
  ).join('\n')
  const longWeakThemeScene = parseGeneratedScene(
    `${createCraftSolidThemeWeakEpisode(5)}\n△黎明又把湿账册压回怀里，盯着潭面一圈一圈荡开的暗纹，没有再开口。\n△小柔扶墙站起，腿伤牵得她倒抽冷气，却还是抬手把窗边木栓重新别紧。\n△远处钟声压来，潭边火把一明一灭，像有人正在旧规和新祸之间来回掂量。\n${extraLongTail}\n${extraLongPadding}`,
    5
  )
  let emotionLaneAgentCalls = 0

  const result = await repairScriptQualityWithAgents({
    generationInput: createGenerationInput(10),
    runtimeConfig: {} as RuntimeProviderConfig,
    generatedScenes: [longWeakThemeScene],
    enableContentRepair: true,
    generateText: async (request) => {
      if (request.prompt.includes('emotion-lane-agent')) {
        emotionLaneAgentCalls += 1
      }
      return {
        text: longWeakThemeScene.screenplay ?? '',
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false
      }
    }
  })

  assert.equal((longWeakThemeScene.screenplay || '').length >= 1650, true)
  assert.equal(emotionLaneAgentCalls, 0)
  assert.equal(result.repairedScenes[0]?.screenplay, longWeakThemeScene.screenplay)
})

test('repairScriptQualityWithAgents keeps episode 2 on a single episode engine pass when length is already near the cap', async () => {
  const longEarlyPressure = Array.from({ length: 18 }, () =>
    '△黎明把散开的账页、门闩碎木、窗边火光和巷口脚步一遍遍压回眼前，硬把已经翻开的局面往更疼的一步上顶，还逼李科的人谁都不敢先松这口气。'
  ).join('\n')
  const longEpisodeTwo = parseGeneratedScene(
    `${createCraftSolidThemeWeakEpisode(2)}\n△黎明把假钥匙当场丢弃在火盆边，逼李科先看清自己抢到的只是空壳。\n${longEarlyPressure}`,
    2
  )
  const requestedAgents: string[] = []

  const result = await repairScriptQualityWithAgents({
    generationInput: createGenerationInput(10),
    runtimeConfig: {} as RuntimeProviderConfig,
    generatedScenes: [longEpisodeTwo],
    enableContentRepair: true,
    generateText: async (request) => {
      if (request.prompt.includes('episode-engine-agent')) requestedAgents.push('episode_engine')
      if (request.prompt.includes('arc-control-agent')) requestedAgents.push('arc_control')
      if (request.prompt.includes('emotion-lane-agent')) requestedAgents.push('emotion_lane')
      return {
        text: longEpisodeTwo.screenplay ?? '',
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false
      }
    }
  })

  assert.equal((longEpisodeTwo.screenplay || '').length >= 1500, true)
  assert.deepEqual(requestedAgents, ['episode_engine'])
  assert.equal(result.repairedScenes[0]?.screenplay, longEpisodeTwo.screenplay)
})

test('repairScriptQualityWithAgents focuses episode 1 on opening flip instead of cascading into other agents', async () => {
  const openingEpisode = parseGeneratedScene(createWeakOpeningFlipEpisode(), 1)
  const requestedAgents: string[] = []
  const seenPrompts: string[] = []

  const initialSignal = inspectContentQualityEpisode(openingEpisode, {
    protagonistName: '黎明',
    supportingName: '小柔',
    antagonistName: '李科',
    themeText: '隐忍反咬'
  })

  assert.equal(initialSignal.dramaticTurnScore < 78, true)

  const result = await repairScriptQualityWithAgents({
    generationInput: createGenerationInput(10),
    runtimeConfig: {} as RuntimeProviderConfig,
    generatedScenes: [openingEpisode],
    enableContentRepair: true,
    generateText: async (request) => {
      seenPrompts.push(request.prompt)
      if (request.prompt.includes('episode-engine-agent')) requestedAgents.push('episode_engine')
      if (request.prompt.includes('arc-control-agent')) requestedAgents.push('arc_control')
      if (request.prompt.includes('emotion-lane-agent')) requestedAgents.push('emotion_lane')
      return {
        text: openingEpisode.screenplay ?? '',
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false
      }
    }
  })

  const episodeEnginePrompt = seenPrompts.find((prompt) => prompt.includes('episode-engine-agent')) || ''
  assert.deepEqual(requestedAgents, ['episode_engine'])
  assert.ok(episodeEnginePrompt.includes('受压后的当场反咬'))
  assert.equal(result.repairedScenes[0]?.screenplay, openingEpisode.screenplay)
})

test('repairScriptQualityWithAgents focuses episode 4 on scene engine instead of cascading into other agents', async () => {
  const weakSceneEngineEpisode = parseGeneratedScene(createWeakSceneEngineEpisode(), 4)
  const requestedAgents: string[] = []
  const seenPrompts: string[] = []

  const initialSignal = inspectContentQualityEpisode(weakSceneEngineEpisode, {
    protagonistName: '黎明',
    supportingName: '小柔',
    antagonistName: '李科',
    themeText: '隐忍反咬'
  })

  assert.equal(initialSignal.sceneEngineScore < 66, true)

  const result = await repairScriptQualityWithAgents({
    generationInput: createGenerationInput(10),
    runtimeConfig: {} as RuntimeProviderConfig,
    generatedScenes: [weakSceneEngineEpisode],
    enableContentRepair: true,
    generateText: async (request) => {
      seenPrompts.push(request.prompt)
      if (request.prompt.includes('episode-engine-agent')) requestedAgents.push('episode_engine')
      if (request.prompt.includes('arc-control-agent')) requestedAgents.push('arc_control')
      if (request.prompt.includes('emotion-lane-agent')) requestedAgents.push('emotion_lane')
      return {
        text: weakSceneEngineEpisode.screenplay ?? '',
        lane: 'deepseek',
        model: 'test-model',
        usedFallback: false
      }
    }
  })

  const episodeEnginePrompt = seenPrompts.find((prompt) => prompt.includes('episode-engine-agent')) || ''
  assert.deepEqual(requestedAgents, ['episode_engine'])
  assert.ok(episodeEnginePrompt.includes('每一场都必须补出“阻碍 -> 应对 -> 结果”'))
  assert.equal(result.repairedScenes[0]?.screenplay, weakSceneEngineEpisode.screenplay)
})

