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
  inspectContentQualityBatch
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
      assert.ok(pattern.verifiedKeywords.length > 0, `pattern ${pattern.id} missing verifiedKeywords`)
    }
  })
})

describe('detectLoopsInEpisode', () => {
  it('检测到假钥循环', () => {
    const scene = makeScene('黎明：（假钥匙）他们追来了。\n小柔：（扔掉）丢掉它！\n黎明：又是假钥匙。')
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
    const scene = makeScene('黎明：我先忍，不揭穿他。\n黎明：哪怕我自己先挨这一刀，也不能现在翻脸。\n△结果李科的人当场扑空，局面反而倒向黎明。')
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
    const scene = makeScene('第1集\n1-1 夜\n人物：黎明、李科\n△李科逼近。\n黎明：我交出假的。\n△门当场被撞开。')
    assert.ok(computeDramaticTurnScore(scene) >= 50)
  })

  it('dramaticTurnScore 在集尾只停在观察时更低', () => {
    const scene = makeScene('第1集\n1-1 夜\n人物：黎明、李科\n△李科逼近。\n黎明：我再想想。\n△黎明望向门外，似乎准备做什么。')
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
      { sceneNo: 1, sceneCode: '1-1', sceneHeading: '1-1 夜', characterRoster: ['黎明', '李科'], body: '人物：黎明、李科\n△李科拦住黎明。\n黎明：我不给。\n△李科反手夺包。' },
      { sceneNo: 2, sceneCode: '1-2', sceneHeading: '1-2 夜', characterRoster: ['黎明', '小柔'], body: '人物：黎明、小柔\n△小柔递出账册。\n黎明：先藏起来。\n△门外脚步声逼近。' }
    ]
    assert.ok(computeSceneEngineScore(scene) >= 60)
  })

  it('characterFunctionScore 看主角选择、配角杠杆、对手施压', () => {
    const scene = makeScene('黎明：我决定把账册交给你。\n小柔：鞋底还有一页。\n李科：把门踹开，搜！\n△结果门外的人当场扑空。')
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
    const scene = makeScene('黎明：（决定）一\n黎明：（选择）二\n黎明：（终于）三\n黎明：（开始）四')
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
    assert.ok(typeof signal.overallScore === 'number')
    assert.ok(Array.isArray(signal.repairRecommendations))
  })

  it('循环问题生成 episode_engine 修复推荐', () => {
    const scene = makeScene('小柔：（捂伤口）\n小柔：（踉跄）\n小柔：（血迹斑斑）\n黎明：（扔掉）假钥匙！\n黎明：（扔掉）假钥匙！', 20)
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
    assert.ok(report.episodes[0].characterArcs.find((a) => a.characterName === '黎明')?.status === 'advanced')
    // 第二集 regressed
    assert.ok(report.episodes[1].characterArcs.find((a) => a.characterName === '黎明')?.status === 'regressed')
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
})
