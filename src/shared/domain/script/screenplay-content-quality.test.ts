/**
 * src/shared/domain/script/screenplay-content-quality.test.ts
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'
import type { ScriptSegmentDto } from '../../contracts/workflow.ts'
import {
  KNOWN_LOOP_PATTERNS,
  detectLoopsInEpisode,
  computeStoryFaithfulness,
  computeThemeAnchoring,
  computePlotNovelty,
  computeDramaticTurnScore,
  computeSceneEngineScore,
  computeCharacterFunctionScore,
  computeCharacterArcProgress,
  inspectContentQualityEpisode,
  inspectContentQualityBatch,
  computeOpeningShockScore,
  computeHookRetentionScore,
  computePunchlineDensityScore,
  computeVillainOppressionQualityScore,
  computeCatharsisPayoffScore,
  computeInformationDensityScore,
  computeScreenplayFormatScore
} from './screenplay-content-quality.ts'

function makeScene(screenplay: string, sceneNo = 1): ScriptSegmentDto {
  return {
    sceneNo,
    screenplay,
    action: '',
    dialogue: '',
    emotion: '',
    screenplayScenes: []
  }
}

describe('KNOWN_LOOP_PATTERNS', () => {
  it('包含 6 种已知循环模式', () => {
    assert.equal(KNOWN_LOOP_PATTERNS.length, 6)
    const ids = KNOWN_LOOP_PATTERNS.map((p) => p.id)
    assert.ok(ids.includes('throwFakeKey'))
    assert.ok(ids.includes('xiaRouBleeding'))
    assert.ok(ids.includes('gangsterScoldWaste'))
    assert.ok(ids.includes('liKeFaceDark'))
    assert.ok(ids.includes('fakeSealMap'))
    assert.ok(ids.includes('yiChengYangQuestion'))
  })

  it('每个模式都有 triggerKeywords 和 verifiedKeywords', () => {
    for (const pattern of KNOWN_LOOP_PATTERNS) {
      assert.ok(pattern.triggerKeywords.length > 0, `pattern ${pattern.id} missing triggerKeywords`)
      assert.ok(
        pattern.verifiedKeywords.length > 0,
        `pattern ${pattern.id} missing verifiedKeywords`
      )
    }
  })
})

describe('detectLoopsInEpisode', () => {
  it('检测到假钥循环', () => {
    const scene = makeScene(
      '黎明：（假钥匙）他们追来了。\n小柔：（扔掉）丢掉它！\n黎明：又是假钥匙。'
    )
    const loops = detectLoopsInEpisode(scene)
    assert.ok(loops.length > 0)
    assert.ok(loops.some((l) => l.patternId === 'throwFakeKey' && l.isRealLoop))
  })

  it('检测到小柔流血循环', () => {
    const scene = makeScene('小柔：（捂伤口）\n小柔：（踉跄）\n小柔：（血迹斑斑）')
    const loops = detectLoopsInEpisode(scene)
    assert.ok(loops.some((l) => l.patternId === 'xiaRouBleeding'))
  })

  it('检测到喽啰骂废物循环', () => {
    const scene = makeScene('喽啰：废物！\n喽啰：没用！\n喽啰：蠢货！')
    const loops = detectLoopsInEpisode(scene)
    assert.ok(loops.some((l) => l.patternId === 'gangsterScoldWaste'))
  })

  it('空剧本无循环检测', () => {
    const scene = makeScene('')
    const loops = detectLoopsInEpisode(scene)
    assert.equal(loops.length, 0)
  })

  it('无循环关键词返回空', () => {
    const scene = makeScene('黎明和小柔来到一个新地方。\n李柯正在等待。')
    const loops = detectLoopsInEpisode(scene)
    assert.equal(loops.filter((l) => l.isRealLoop).length, 0)
  })
})

describe('computeStoryFaithfulness', () => {
  it('有 sellingPremise 时计算忠实度', () => {
    const scene = makeScene('黎明在山洞里发现秘宝。\n李柯追来。\n黎明决定放弃。')
    const score = computeStoryFaithfulness(scene, '黎明发现秘宝后选择放弃')
    assert.ok(score >= 60)
  })

  it('无 sellingPremise 时返回 50', () => {
    const scene = makeScene('黎明在山洞里发现秘宝。')
    const score = computeStoryFaithfulness(scene, undefined)
    assert.equal(score, 50)
  })
})

describe('computeThemeAnchoring', () => {
  it('有谦卦关键词时加分', () => {
    const scene = makeScene('黎明：（放下）不要了。\n黎明：我选择放弃。')
    const score = computeThemeAnchoring(scene, '黎明', '谦卦')
    assert.ok(score >= 50)
  })

  it('有"放弃打开秘宝"时大幅加分', () => {
    const scene = makeScene('黎明：（不打开秘宝）让他们来抢吧。\n黎明：我不在乎。')
    const score = computeThemeAnchoring(scene, '黎明', '谦卦')
    assert.ok(score >= 30)
  })

  it('选择-代价-后果完整出现时主题分更高', () => {
    const scene = makeScene(
      '黎明：我先忍，不揭穿他。\n黎明：哪怕我自己先挨这一刀，也不能现在翻脸。\n△结果李科的人当场扑空，局面反而倒向黎明。'
    )
    const score = computeThemeAnchoring(scene, '黎明', '隐忍反咬')
    assert.ok(score >= 60)
  })

  it('竞争驱动关键词会降低分数', () => {
    const scene = makeScene('黎明：我必须赢！\n黎明：志在必得！')
    const score = computeThemeAnchoring(scene, '黎明', '谦卦')
    assert.ok(score < 50)
  })

  it('无关键词时基础分为 0', () => {
    const scene = makeScene('黎明来到山洞里。')
    const score = computeThemeAnchoring(scene, '黎明')
    assert.equal(score, 0)
  })
})

describe('screenplay craft scoring', () => {
  it('dramaticTurnScore 在有选择和结果时更高', () => {
    const scene = makeScene(
      '第1集\n1-1 夜\n人物：黎明、李科\n△李科逼近。\n黎明：我交出假的。\n△门当场被撞开。'
    )
    assert.ok(computeDramaticTurnScore(scene) >= 50)
  })

  it('dramaticTurnScore 在集尾只停在观察时更低', () => {
    const scene = makeScene(
      '第1集\n1-1 夜\n人物：黎明、李科\n△李科逼近。\n黎明：我再想想。\n△黎明望向门外，似乎准备做什么。'
    )
    assert.ok(computeDramaticTurnScore(scene) < 50)
  })

  it('sceneEngineScore 在多场都有阻碍和结果时更高', () => {
    const screenplay = [
      '第1集',
      '1-1 夜',
      '人物：黎明、李科',
      '△李科拦住黎明。',
      '黎明：我不给。',
      '△李科反手夺包。',
      '',
      '1-2 夜',
      '人物：黎明、小柔',
      '△小柔递出账册。',
      '黎明：先藏起来。',
      '△门外脚步声逼近。'
    ].join('\n')
    const scene = makeScene(screenplay)
    scene.screenplayScenes = [
      {
        sceneNo: 1,
        sceneCode: '1-1',
        sceneHeading: '1-1 夜',
        characterRoster: ['黎明', '李科'],
        body: '人物：黎明、李科\n△李科拦住黎明。\n黎明：我不给。\n△李科反手夺包。'
      },
      {
        sceneNo: 2,
        sceneCode: '1-2',
        sceneHeading: '1-2 夜',
        characterRoster: ['黎明', '小柔'],
        body: '人物：黎明、小柔\n△小柔递出账册。\n黎明：先藏起来。\n△门外脚步声逼近。'
      }
    ]
    assert.ok(computeSceneEngineScore(scene) >= 60)
  })

  it('characterFunctionScore 看主角选择、配角杠杆、对手施压', () => {
    const scene = makeScene(
      '黎明：我决定把账册交给你。\n小柔：鞋底还有一页。\n李科：把门踹开，搜！\n△结果门外的人当场扑空。'
    )
    assert.ok(computeCharacterFunctionScore(scene, '黎明', '小柔', '李科') >= 70)
  })

  it('characterFunctionScore 在配角只是陪场时较低', () => {
    const scene = makeScene('黎明：我决定先忍。\n小柔：你小心。\n李科：我继续逼你。')
    assert.ok(computeCharacterFunctionScore(scene, '黎明', '小柔', '李科') < 70)
  })
})

describe('computePlotNovelty', () => {
  it('第一集默认新鲜度较高', () => {
    const scene = makeScene('黎明走进山洞。')
    const score = computePlotNovelty(scene, [])
    assert.equal(score, 80)
  })

  it('有新角色登场时加分', () => {
    const prev = [makeScene('黎明在山洞里。', 1)]
    const scene = makeScene('（新登场）神秘人出现。', 2)
    const score = computePlotNovelty(scene, prev)
    assert.ok(score >= 70)
  })

  it('有结果落地时加分', () => {
    const scene = makeScene('黎明：（落下）\n黎明：（被打开）')
    const score = computePlotNovelty(scene, [makeScene('黎明走进山洞。', 1)])
    assert.ok(score >= 60)
  })

  it('与前集重复过多时扣分', () => {
    const prevText = '黎明走进山洞。黎明在山洞里。黎明发现秘宝。'
    const scene = makeScene(
      '黎明走进山洞。黎明在山洞里。黎明发现秘宝。黎明走进山洞。黎明在山洞里。黎明发现秘宝。黎明走进山洞。黎明在山洞里。黎明发现秘宝。黎明走进山洞。'
    )
    const score = computePlotNovelty(scene, [makeScene(prevText, 1)])
    assert.ok(score < 75)
  })
})

describe('computeCharacterArcProgress', () => {
  it('新角色首次出现返回 new', () => {
    const scene = makeScene('黎明走进山洞。')
    const arc = computeCharacterArcProgress(scene, '黎明', undefined)
    assert.ok(arc.status === 'new' || arc.status === 'stagnant')
  })

  it('有变化关键词时返回 advanced', () => {
    const scene = makeScene('黎明：（决定）我要离开这里。\n黎明：（终于）我明白了。')
    const arc = computeCharacterArcProgress(scene, '黎明', 'stagnant')
    assert.ok(arc.status === 'advanced')
  })

  it('有回归关键词时返回 regressed', () => {
    const scene = makeScene('黎明：（依然）我还是一样。\n黎明：（还是）照旧。')
    const arc = computeCharacterArcProgress(scene, '黎明', 'advanced')
    assert.ok(arc.status === 'regressed')
  })

  it('无台词时返回 stagnant', () => {
    const scene = makeScene('李柯：这是关于黎明的事。')
    const arc = computeCharacterArcProgress(scene, '黎明', 'advanced')
    assert.ok(arc.status === 'stagnant')
  })

  it('evidence 最多保留 3 条', () => {
    const scene = makeScene(
      '黎明：（决定）一\n黎明：（选择）二\n黎明：（终于）三\n黎明：（开始）四'
    )
    const arc = computeCharacterArcProgress(scene, '黎明', 'stagnant')
    assert.ok(arc.evidence.length <= 3)
  })
})

describe('inspectContentQualityEpisode', () => {
  it('返回完整质量信号', () => {
    const scene = makeScene('黎明：（决定）我要放弃秘宝。', 18)
    const signal = inspectContentQualityEpisode(scene, {
      protagonistName: '黎明',
      supportingName: '小柔',
      antagonistName: '李柯'
    })

    assert.ok(typeof signal.sceneNo === 'number')
    assert.ok(Array.isArray(signal.loops))
    assert.ok(Array.isArray(signal.characterArcs))
    assert.ok(typeof signal.themeAnchoringScore === 'number')
    assert.ok(typeof signal.plotNoveltyScore === 'number')
    assert.ok(typeof signal.dramaticTurnScore === 'number')
    assert.ok(typeof signal.sceneEngineScore === 'number')
    assert.ok(typeof signal.characterFunctionScore === 'number')
    assert.ok(typeof signal.openingShockScore === 'number')
    assert.ok(typeof signal.hookRetentionScore === 'number')
    assert.ok(typeof signal.punchlineDensityScore === 'number')
    assert.ok(typeof signal.villainOppressionQualityScore === 'number')
    assert.ok(typeof signal.catharsisPayoffScore === 'number')
    assert.ok(typeof signal.storyContinuityScore === 'number')
    assert.ok(typeof signal.overallScore === 'number')
    assert.ok(Array.isArray(signal.repairRecommendations))
  })

  it('with snapshot: detects continuity issues and lowers score', () => {
    const scene = makeScene('张三走进房间，独自发呆。', 3)
    const signal = inspectContentQualityEpisode(scene, {
      protagonistName: '张三',
      antagonistName: '李四',
      snapshot: {
        projectId: 'p1',
        audienceLane: 'male',
        subgenre: '都市逆袭',
        currentEpisode: 3,
        totalEpisodes: 20,
        protagonistState: { statusSummary: '寻找证据', emotionalArc: '愤怒' },
        antagonistState: { statusSummary: '设局', threatLevel: '高压', currentGoal: '陷害张三' },
        relationshipState: { keyRelationship: '敌对', currentTension: '陷害' },
        activeProps: [{ name: 'U盘', status: 'held' }],
        unresolvedHooks: ['张三被跟踪'],
        activeForeshadowing: [],
        continuityConstraints: [],
        previousEpisodeEnding: '张三发现线索'
      }
    })
    assert.ok(signal.storyContinuityScore < 100)
    assert.ok(signal.repairRecommendations.some((r) => r.reason.includes('连续性')))
  })

  it('with snapshot and good continuity: score is 100', () => {
    const scene = makeScene(
      '第3集\n3-1 日\n人物：张三、李四\n△张三握紧U盘，寻找证据。\n张三：我要查出真相。\n李四冷笑逼近。\n李四：你以为能逃？\n△张三想起被跟踪的事，眼神一凛。',
      3
    )
    const signal = inspectContentQualityEpisode(scene, {
      protagonistName: '张三',
      antagonistName: '李四',
      snapshot: {
        projectId: 'p1',
        audienceLane: 'male',
        subgenre: '都市逆袭',
        currentEpisode: 3,
        totalEpisodes: 20,
        protagonistState: { statusSummary: '寻找证据', emotionalArc: '愤怒' },
        antagonistState: { statusSummary: '设局', threatLevel: '高压', currentGoal: '陷害张三' },
        relationshipState: { keyRelationship: '敌对', currentTension: '陷害' },
        activeProps: [{ name: 'U盘', status: 'held' }],
        unresolvedHooks: ['张三被跟踪'],
        activeForeshadowing: [],
        continuityConstraints: [],
        previousEpisodeEnding: '张三发现线索'
      }
    })
    assert.equal(signal.storyContinuityScore, 100)
  })

  it('循环问题生成 episode_engine 修复推荐', () => {
    const scene = makeScene(
      '小柔：（捂伤口）\n小柔：（踉跄）\n小柔：（血迹斑斑）\n黎明：（扔掉）假钥匙！\n黎明：（扔掉）假钥匙！',
      20
    )
    const signal = inspectContentQualityEpisode(scene, {
      protagonistName: '黎明',
      supportingName: '小柔',
      antagonistName: '李柯'
    })
    assert.ok(signal.repairRecommendations.some((r) => r.type === 'episode_engine'))
  })

  it('停滞弧线生成 arc_control 修复推荐', () => {
    const scene = makeScene('黎明：（依然）我还是一样。\n小柔：（还是）照旧。', 17)
    const signal = inspectContentQualityEpisode(scene, {
      protagonistName: '黎明',
      supportingName: '小柔',
      antagonistName: '李柯'
    })
    assert.ok(signal.repairRecommendations.some((r) => r.type === 'arc_control'))
  })

  it('低情绪锚定生成 emotion_lane 修复推荐', () => {
    const scene = makeScene('黎明：我必须赢！\n黎明：志在必得！', 18)
    const signal = inspectContentQualityEpisode(scene, {
      protagonistName: '黎明'
    })
    assert.ok(signal.themeAnchoringScore < 60)
    assert.ok(signal.repairRecommendations.some((r) => r.type === 'emotion_lane'))
  })

  it('推进不足时也会建议 episode_engine repair', () => {
    const scene = makeScene('黎明：你别逼我。\n李科：我就逼你。\n黎明：你别逼我。', 19)
    const signal = inspectContentQualityEpisode(scene, {
      protagonistName: '黎明',
      supportingName: '小柔',
      antagonistName: '李科'
    })
    assert.ok(signal.repairRecommendations.some((r) => r.type === 'episode_engine'))
  })
})

describe('inspectContentQualityBatch', () => {
  it('批量检测多集', () => {
    const scenes = [
      makeScene('黎明走进山洞。', 1),
      makeScene('黎明决定放弃。', 2),
      makeScene('小柔出现。', 3)
    ]
    const report = inspectContentQualityBatch(scenes, {
      protagonistName: '黎明',
      supportingName: '小柔',
      antagonistName: '李柯'
    })

    assert.equal(report.episodeCount, 3)
    assert.equal(report.episodes.length, 3)
    assert.ok(typeof report.averageThemeAnchoringScore === 'number')
    assert.ok(typeof report.averagePlotNoveltyScore === 'number')
    assert.ok(typeof report.loopProblemSummary.totalLoops === 'number')
    assert.ok(typeof report.loopProblemSummary.byPattern === 'object')
  })

  it('正确累积角色弧线状态', () => {
    const scenes = [
      makeScene('黎明：（终于）我明白了。', 1),
      makeScene('黎明：（依然）我还是一样。', 2)
    ]
    const report = inspectContentQualityBatch(scenes, {
      protagonistName: '黎明',
      supportingName: '小柔',
      antagonistName: '李柯'
    })

    // 第一集 advanced
    assert.ok(
      report.episodes[0].characterArcs.find((a) => a.characterName === '黎明')?.status ===
        'advanced'
    )
    // 第二集 regressed
    assert.ok(
      report.episodes[1].characterArcs.find((a) => a.characterName === '黎明')?.status ===
        'regressed'
    )
  })

  it('循环问题汇总正确', () => {
    const scenes = [
      makeScene('喽啰：废物！\n喽啰：没用！\n喽啰：蠢货！', 1),
      makeScene('小柔：（捂伤口）\n小柔：（踉跄）', 2)
    ]
    const report = inspectContentQualityBatch(scenes)

    assert.ok(report.loopProblemSummary.totalLoops >= 2)
    assert.ok(report.loopProblemSummary.byPattern['喽啰骂废物循环'] >= 1)
    assert.ok(report.loopProblemSummary.byPattern['小柔流血循环'] >= 1)
  })

  it('批量报告包含5项商业传播力平均分', () => {
    const scenes = [
      makeScene('黎明：跪下！\n△当众羞辱。\n李科：这规矩你不懂？', 1),
      makeScene('黎明：原来是假的。\n△证据拍到脸上。\n众人：震惊！\n△追兵逼近。', 2)
    ]
    const report = inspectContentQualityBatch(scenes, {
      protagonistName: '黎明',
      antagonistName: '李科'
    })
    assert.ok(typeof report.averageOpeningShockScore === 'number')
    assert.ok(typeof report.averageHookRetentionScore === 'number')
    assert.ok(typeof report.averagePunchlineDensityScore === 'number')
    assert.ok(typeof report.averageVillainOppressionQualityScore === 'number')
    assert.ok(typeof report.averageCatharsisPayoffScore === 'number')
  })

  it('batch with snapshots computes averageStoryContinuityScore', () => {
    const scenes = [
      makeScene('张三走进房间。', 1),
      makeScene('李四冷笑。', 2)
    ]
    const report = inspectContentQualityBatch(scenes, {
      protagonistName: '张三',
      antagonistName: '李四',
      snapshots: [
        {
          projectId: 'p1',
          audienceLane: 'male',
          subgenre: '都市逆袭',
          currentEpisode: 1,
          totalEpisodes: 20,
          protagonistState: { statusSummary: '寻找证据', emotionalArc: '愤怒' },
          antagonistState: { statusSummary: '设局', threatLevel: '高压', currentGoal: '陷害张三' },
          relationshipState: { keyRelationship: '敌对', currentTension: '陷害' },
          activeProps: [{ name: 'U盘', status: 'held' }],
          unresolvedHooks: ['钩子1'],
          activeForeshadowing: [],
          continuityConstraints: [],
          previousEpisodeEnding: ''
        },
        {
          projectId: 'p1',
          audienceLane: 'male',
          subgenre: '都市逆袭',
          currentEpisode: 2,
          totalEpisodes: 20,
          protagonistState: { statusSummary: '寻找证据', emotionalArc: '愤怒' },
          antagonistState: { statusSummary: '设局', threatLevel: '高压', currentGoal: '陷害张三' },
          relationshipState: { keyRelationship: '敌对', currentTension: '陷害' },
          activeProps: [{ name: 'U盘', status: 'held' }],
          unresolvedHooks: ['钩子2'],
          activeForeshadowing: [],
          continuityConstraints: [],
          previousEpisodeEnding: '张三发现线索'
        }
      ]
    })
    assert.ok(typeof report.averageStoryContinuityScore === 'number')
    assert.ok(report.averageStoryContinuityScore < 100)
  })
})

describe('commercial quality scoring', () => {
  it('computeOpeningShockScore: high loss event in first lines scores high', () => {
    const scene = makeScene('△黎明被当众剥夺身份。\n李科：从今日起，废除你第十九徒之名。')
    assert.ok(computeOpeningShockScore(scene) >= 40)
  })

  it('computeOpeningShockScore: no shock event scores low', () => {
    const scene = makeScene('黎明走进山洞。\n小柔：你来了。')
    assert.ok(computeOpeningShockScore(scene) < 30)
  })

  it('computeHookRetentionScore: crisis at end scores high', () => {
    const scene = makeScene('△追兵逼近。\n李科：谁？\n△火光从门外传来。')
    assert.ok(computeHookRetentionScore(scene) >= 60)
  })

  it('computeHookRetentionScore: weak ending scores low', () => {
    const scene = makeScene('黎明：我准备做点什么。\n△似乎要出发。')
    assert.ok(computeHookRetentionScore(scene) < 50)
  })

  it('computePunchlineDensityScore: short punchline near twist scores high', () => {
    const scene = makeScene('黎明：原来是你。\n黎明：账册在此。\n黎明：跪下。')
    assert.ok(computePunchlineDensityScore(scene) >= 40)
  })

  it('computePunchlineDensityScore: no dialogue scores zero', () => {
    const scene = makeScene('△门被撞开。\n△人走进来。')
    assert.equal(computePunchlineDensityScore(scene), 0)
  })

  it('computeVillainOppressionQualityScore: rule-based pressure scores high', () => {
    const scene = makeScene('李科：按门规，你该当何罪？\n李科：宗规第七条。')
    assert.ok(computeVillainOppressionQualityScore(scene, '李科') >= 50)
  })

  it('computeVillainOppressionQualityScore: only insults scores low', () => {
    const scene = makeScene('李科：废物！\n李科：没用！\n李科：蠢货！')
    assert.ok(computeVillainOppressionQualityScore(scene, '李科') < 50)
  })

  it('computeCatharsisPayoffScore: full payoff chain scores high', () => {
    const scene = makeScene('黎明：证据在此。\n李科：后退。\n众人：震惊。')
    assert.ok(computeCatharsisPayoffScore(scene, '黎明') >= 70)
  })

  it('computeCatharsisPayoffScore: no counterattack scores low', () => {
    const scene = makeScene('黎明：我认输。\n李科：跪下。')
    assert.ok(computeCatharsisPayoffScore(scene, '黎明') < 50)
  })
})

describe('P4: information density and format scoring', () => {
  it('computeInformationDensityScore: high when checkpoints pass', () => {
    const scene = makeScene(
      '第1集\n1-1 夜\n人物：黎明、李科\n△黎明攥紧钥匙，指节发白。\n李科：凭什么？你配吗？\n黎明：滚！\n△钥匙拍到桌上，震得茶杯一跳。'
    )
    const score = computeInformationDensityScore(scene)
    assert.ok(score >= 50)
  })

  it('computeInformationDensityScore: low when exposition dominates', () => {
    const scene = makeScene(
      '第1集\n1-1 夜\n人物：黎明\n黎明：很久以前，有一个王朝。\n黎明：这个王朝有三大门派。\n黎明：第一门派是青云宗。\n黎明：第二门派是玄天阁。'
    )
    const score = computeInformationDensityScore(scene)
    assert.ok(score < 60)
  })

  it('computeScreenplayFormatScore: high for proper format', () => {
    const scene = makeScene(
      '第1集\n1-1 夜 内 山洞\n人物：黎明、李科\n△黎明走进山洞。\n黎明：你来了。\n李科：我来了。'
    )
    const score = computeScreenplayFormatScore(scene)
    assert.ok(score >= 60)
  })

  it('computeScreenplayFormatScore: low for quoted dialogue', () => {
    const scene = makeScene(
      '第1集\n1-1 夜\n人物：黎明\n黎明："你来了。"\n黎明："我来了。"'
    )
    const score = computeScreenplayFormatScore(scene)
    assert.ok(score < 90)
  })

  it('computeScreenplayFormatScore: low for novel narration', () => {
    const scene = makeScene(
      '第1集\n1-1 夜\n人物：黎明\n那是一个风雨交加的夜晚。\n他回忆起多年前的往事。\n内心充满了复杂的情绪。'
    )
    const score = computeScreenplayFormatScore(scene)
    assert.ok(score < 70)
  })
})

describe('P4: marketProfile quality detection', () => {
  it('inspectContentQualityEpisode without marketProfile: old projects still work', () => {
    const scene = makeScene(
      '第1集\n1-1 夜\n人物：黎明、李科\n△黎明亮出底牌。\n李科：脸色一变，后退半步。\n众人：震惊。',
      1
    )
    const signal = inspectContentQualityEpisode(scene, {
      protagonistName: '黎明',
      antagonistName: '李科'
    })
    assert.strictEqual(signal.marketQuality, undefined)
    assert.ok(typeof signal.informationDensityScore === 'number')
    assert.ok(typeof signal.screenplayFormatScore === 'number')
    assert.ok(typeof signal.overallScore === 'number')
  })

  it('inspectContentQualityEpisode with male marketProfile includes male dimensions', () => {
    const scene = makeScene(
      '第1集\n1-1 夜\n人物：黎明、李科\n△黎明亮出底牌，身份反转。\n李科：脸色一变，后退半步。\n众人：震惊。\n黎明：获得新功法，突破境界。',
      1
    )
    const signal = inspectContentQualityEpisode(scene, {
      protagonistName: '黎明',
      antagonistName: '李科',
      marketProfile: { audienceLane: 'male', subgenre: '男频都市逆袭' }
    })
    assert.ok(signal.marketQuality)
    assert.strictEqual(signal.marketQuality!.audienceLane, 'male')
    assert.strictEqual(signal.marketQuality!.subgenre, '男频都市逆袭')
    assert.ok(signal.marketQuality!.score >= 0)
    assert.ok(signal.marketQuality!.dimensions.length >= 4)
    const dimIds = signal.marketQuality!.dimensions.map((d) => d.id)
    assert.ok(dimIds.includes('statusReversal'))
    assert.ok(dimIds.includes('powerProgression'))
    assert.ok(dimIds.includes('hiddenCard'))
    assert.ok(dimIds.includes('publicPayoff'))
    assert.ok(dimIds.includes('villainHierarchy'))
  })

  it('inspectContentQualityEpisode with female marketProfile includes female dimensions', () => {
    const scene = makeScene(
      '第1集\n1-1 夜\n人物：女主、霸总\n△女主攥紧衣角，眼眶发红。\n女主：你凭什么这样对我？\n霸总：因为你是我的。\n△女主后退半步，声音发抖。',
      1
    )
    const signal = inspectContentQualityEpisode(scene, {
      protagonistName: '女主',
      antagonistName: '反派',
      marketProfile: { audienceLane: 'female', subgenre: '女频霸总甜宠' }
    })
    assert.ok(signal.marketQuality)
    assert.strictEqual(signal.marketQuality!.audienceLane, 'female')
    assert.strictEqual(signal.marketQuality!.subgenre, '女频霸总甜宠')
    assert.ok(signal.marketQuality!.score >= 0)
    assert.ok(signal.marketQuality!.dimensions.length >= 4)
    const dimIds = signal.marketQuality!.dimensions.map((d) => d.id)
    assert.ok(dimIds.includes('emotionalIdentification'))
    assert.ok(dimIds.includes('relationshipTension'))
    assert.ok(dimIds.includes('powerBorrowing'))
    assert.ok(dimIds.includes('supportingPowerReveal'))
    assert.ok(dimIds.includes('femaleGrowth'))
  })

  it('inspectContentQualityBatch computes new batch averages', () => {
    const scenes = [
      makeScene(
        '第1集\n1-1 夜\n人物：黎明、李科\n△黎明亮出底牌。\n李科：后退。\n众人：震惊。',
        1
      ),
      makeScene(
        '第2集\n1-1 夜\n人物：黎明\n△黎明获得新功法。\n黎明：突破境界。',
        2
      )
    ]
    const report = inspectContentQualityBatch(scenes, {
      protagonistName: '黎明',
      antagonistName: '李科',
      marketProfile: { audienceLane: 'male', subgenre: '男频都市逆袭' }
    })
    assert.ok(typeof report.averageInformationDensityScore === 'number')
    assert.ok(typeof report.averageScreenplayFormatScore === 'number')
    assert.ok(typeof report.averageMarketQualityScore === 'number')
    assert.ok(report.averageMarketQualityScore! >= 0)
  })

  it('inspectContentQualityBatch without marketProfile: averageMarketQualityScore undefined', () => {
    const scenes = [
      makeScene('第1集\n1-1 夜\n人物：黎明\n黎明：你好。', 1),
      makeScene('第2集\n1-1 夜\n人物：黎明\n黎明：再见。', 2)
    ]
    const report = inspectContentQualityBatch(scenes, {
      protagonistName: '黎明'
    })
    assert.strictEqual(report.averageMarketQualityScore, undefined)
    assert.ok(typeof report.averageInformationDensityScore === 'number')
    assert.ok(typeof report.averageScreenplayFormatScore === 'number')
  })

  it('marketProfile dimensions include evidence and repairHint', () => {
    const scene = makeScene(
      '第1集\n1-1 夜\n人物：黎明、李科\n△黎明剥夺李科身份，当众打脸。\n李科：脸色铁青。\n众人：震惊，不敢置信。',
      1
    )
    const signal = inspectContentQualityEpisode(scene, {
      protagonistName: '黎明',
      antagonistName: '李科',
      marketProfile: { audienceLane: 'male', subgenre: '男频都市逆袭' }
    })
    const dim = signal.marketQuality!.dimensions.find((d) => d.id === 'statusReversal')
    assert.ok(dim)
    assert.ok(dim!.evidence.length > 0)
    assert.ok(dim!.repairHint.length > 0)
  })
})
