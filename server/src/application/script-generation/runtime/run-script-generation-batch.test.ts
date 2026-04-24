import test from 'node:test'
import assert from 'node:assert/strict'
import type { ScriptSegmentDto } from '@shared/contracts/workflow'
import { buildContentRepairPrompt, shouldAcceptRepair } from './run-script-generation-batch'
import {
  inspectContentQualityEpisode,
  buildContentRepairSignals
} from '@shared/domain/script/screenplay-content-quality'
import type {
  ContentQualitySignal,
  MarketProfileDto
} from '@shared/domain/script/screenplay-content-quality'

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

function makeMinimalSignal(overrides?: Partial<ContentQualitySignal>): ContentQualitySignal {
  return {
    sceneNo: 1,
    loops: [],
    characterArcs: [],
    themeAnchoringScore: 70,
    plotNoveltyScore: 70,
    dramaticTurnScore: 70,
    sceneEngineScore: 70,
    characterFunctionScore: 70,
    weaknessDetection: { hasForbiddenBehavior: false, behaviors: [], behaviorTypes: [], severity: 0, isStrategic: false, evidence: [] },
    tacticRotation: { isDuplicate: false },
    openingShockScore: 80,
    hookRetentionScore: 80,
    punchlineDensityScore: 80,
    villainOppressionQualityScore: 80,
    catharsisPayoffScore: 80,
    informationDensityScore: 80,
    screenplayFormatScore: 80,
    storyContinuityScore: 80,
    overallScore: 80,
    repairRecommendations: [],
    ...overrides
  }
}

// ────────────────────────────────────────────
// buildContentRepairPrompt 结构测试
// ────────────────────────────────────────────

test('buildContentRepairPrompt includes low score issues with new structure', () => {
  const scene = makeScene('黎明：我认输。\n李科：跪下。', 5)
  const signal = makeMinimalSignal({ marketQuality: { audienceLane: 'male', subgenre: '男频都市逆袭', score: 60, dimensions: [{ id: 'statusReversal', label: '逆袭/身份反转', score: 40, evidence: [], repairHint: '增加反转' }] } })
  const repairSignals = [
    { id: 'openingShock', severity: 'high' as const, score: 10, title: '开局冲击不足', diagnosis: '低分', repairInstruction: '重写第一场前3-5行', evidence: [] },
    { id: 'catharsisPayoff', severity: 'high' as const, score: 20, title: '爽点兑现不足', diagnosis: '低分', repairInstruction: '补全爽点三步', evidence: [] }
  ]
  const prompt = buildContentRepairPrompt(scene, repairSignals, signal)

  assert.ok(prompt.includes('第5集'))
  assert.ok(prompt.includes('开局冲击不足'))
  assert.ok(prompt.includes('爽点兑现不足'))
  assert.ok(prompt.includes('重写第一场前3-5行'))
  assert.ok(prompt.includes('男频'))
  assert.ok(prompt.includes('男频都市逆袭'))
  assert.ok(prompt.includes('不可破坏'))
  assert.ok(prompt.includes('只输出修完后的纯剧本正文'))
  assert.ok(prompt.includes('当前成稿'))
  assert.ok(prompt.includes('黎明：我认输'))
})

test('buildContentRepairPrompt forbids repair explanation output', () => {
  const scene = makeScene('test', 1)
  const prompt = buildContentRepairPrompt(scene, [], undefined)

  assert.ok(prompt.includes('禁止输出"以下是修稿说明""修改点如下"等内容'))
  assert.ok(prompt.includes('只输出修完后的纯剧本正文'))
  assert.ok(prompt.includes('不输出修稿说明'))
})

test('buildContentRepairPrompt without marketQuality omits lane info', () => {
  const scene = makeScene('test', 1)
  const prompt = buildContentRepairPrompt(scene, [], undefined)

  assert.ok(prompt.includes('无市场定位信息'))
  assert.ok(!prompt.includes('男频'))
  assert.ok(!prompt.includes('女频'))
})

test('buildContentRepairPrompt includes female market positioning', () => {
  const scene = makeScene('test', 1)
  const signal = makeMinimalSignal({ marketQuality: { audienceLane: 'female', subgenre: '女频霸总甜宠', score: 60, dimensions: [{ id: 'emotionalIdentification', label: '情绪代入', score: 50, evidence: [], repairHint: '补情绪' }] } })
  const prompt = buildContentRepairPrompt(scene, [], signal)

  assert.ok(prompt.includes('女频'))
  assert.ok(prompt.includes('女频霸总甜宠'))
  assert.ok(!prompt.includes('男频'))
})

// ────────────────────────────────────────────
// buildContentRepairSignals 信号生成测试
// ────────────────────────────────────────────

test('buildContentRepairSignals returns signals for low commercial scores', () => {
  const signal = makeMinimalSignal({
    openingShockScore: 20,
    catharsisPayoffScore: 30,
    hookRetentionScore: 85
  })
  const result = buildContentRepairSignals(signal, null)

  assert.ok(result.length >= 2)
  assert.ok(result.some((s) => s.id === 'openingShock'))
  assert.ok(result.some((s) => s.id === 'catharsisPayoff'))
  assert.ok(!result.some((s) => s.id === 'hookRetention'))
})

test('buildContentRepairSignals returns male-specific signals', () => {
  const signal = makeMinimalSignal({
    overallScore: 50,
    marketQuality: {
      audienceLane: 'male',
      subgenre: '男频都市逆袭',
      score: 35,
      dimensions: [
        { id: 'statusReversal', label: '逆袭/身份反转', score: 20, evidence: ['无反转'], repairHint: '加入反压动作' },
        { id: 'powerProgression', label: '实力/资源增长', score: 60, evidence: [], repairHint: '' },
        { id: 'hiddenCard', label: '底牌具体可见', score: 15, evidence: [], repairHint: '补具体底牌' },
        { id: 'publicPayoff', label: '打脸当场兑现', score: 55, evidence: [], repairHint: '' },
        { id: 'villainHierarchy', label: '反派层级递进', score: 25, evidence: [], repairHint: '让更高层反派露出' }
      ]
    }
  })
  const result = buildContentRepairSignals(signal, { audienceLane: 'male', subgenre: '男频都市逆袭' })

  // 低分项：statusReversal(20), hiddenCard(15), villainHierarchy(25)
  const maleSignals = result.filter((s) => ['statusReversal', 'hiddenCard', 'villainHierarchy'].includes(s.id))
  assert.ok(maleSignals.length >= 2)
  assert.ok(maleSignals.some((s) => s.id === 'statusReversal'))
  assert.ok(maleSignals.some((s) => s.id === 'hiddenCard'))

  // 检查标题是男频的
  const hiddenCard = result.find((s) => s.id === 'hiddenCard')
  assert.equal(hiddenCard?.title, '底牌不具体')
  assert.ok(hiddenCard?.repairInstruction.includes('底牌'))
})

test('buildContentRepairSignals returns female-specific signals', () => {
  const signal = makeMinimalSignal({
    overallScore: 50,
    marketQuality: {
      audienceLane: 'female',
      subgenre: '女频霸总甜宠',
      score: 30,
      dimensions: [
        { id: 'emotionalIdentification', label: '情绪代入', score: 20, evidence: [], repairHint: '补身体反应' },
        { id: 'relationshipTension', label: '关系拉扯', score: 65, evidence: [], repairHint: '' },
        { id: 'powerBorrowing', label: '权力借用', score: 15, evidence: [], repairHint: '明确谁掌权' },
        { id: 'supportingPowerReveal', label: '高权力者撑腰', score: 55, evidence: [], repairHint: '' },
        { id: 'femaleGrowth', label: '女主成长', score: 10, evidence: [], repairHint: '让女主主动选择' }
      ]
    }
  })
  const result = buildContentRepairSignals(signal, { audienceLane: 'female', subgenre: '女频霸总甜宠' })

  const femaleSignals = result.filter((s) => ['emotionalIdentification', 'powerBorrowing', 'femaleGrowth'].includes(s.id))
  assert.ok(femaleSignals.length >= 2)
  assert.ok(femaleSignals.some((s) => s.id === 'femaleGrowth'))
  assert.equal(result.find((s) => s.id === 'femaleGrowth')?.title, '女主缺少独立行动')
})

test('buildContentRepairSignals includes informationDensity and format signals', () => {
  const signal = makeMinimalSignal({
    informationDensityScore: 25,
    screenplayFormatScore: 30
  })
  const result = buildContentRepairSignals(signal, null)

  assert.ok(result.some((s) => s.id === 'informationDensity'))
  assert.ok(result.some((s) => s.id === 'screenplayFormat'))
})

test('buildContentRepairSignals returns empty for high-scoring signal', () => {
  const signal = makeMinimalSignal({
    openingShockScore: 95,
    hookRetentionScore: 95,
    punchlineDensityScore: 95,
    villainOppressionQualityScore: 95,
    catharsisPayoffScore: 95,
    informationDensityScore: 95,
    screenplayFormatScore: 95
  })
  const result = buildContentRepairSignals(signal, null)

  assert.equal(result.length, 0)
})

test('buildContentRepairSignals caps at 5 signals max', () => {
  // 所有常规项都低分
  const signal = makeMinimalSignal({
    openingShockScore: 10,
    hookRetentionScore: 10,
    punchlineDensityScore: 10,
    villainOppressionQualityScore: 10,
    catharsisPayoffScore: 10,
    informationDensityScore: 10,
    screenplayFormatScore: 10
  })
  const result = buildContentRepairSignals(signal, null)

  assert.ok(result.length <= 5, `expected <=5, got ${result.length}`)
})

test('buildContentRepairSignals returns information density signal with correct instruction', () => {
  const signal = makeMinimalSignal({ informationDensityScore: 30 })
  const result = buildContentRepairSignals(signal, null)
  const infoSignal = result.find((s) => s.id === 'informationDensity')

  assert.ok(infoSignal)
  assert.ok(infoSignal!.repairInstruction.includes('冲突场景'))
  assert.ok(infoSignal!.repairInstruction.includes('潜台词'))
})

test('buildContentRepairSignals returns screenplay format signal with correct instruction', () => {
  const signal = makeMinimalSignal({ screenplayFormatScore: 20 })
  const result = buildContentRepairSignals(signal, null)
  const formatSignal = result.find((s) => s.id === 'screenplayFormat')

  assert.ok(formatSignal)
  assert.ok(formatSignal!.repairInstruction.includes('剧本格式'))
  assert.ok(formatSignal!.repairInstruction.includes('双引号'))
})

// ────────────────────────────────────────────
// shouldAcceptRepair 回退逻辑测试
// ────────────────────────────────────────────

test('shouldAcceptRepair returns true when repaired overallScore is better', () => {
  const original = makeMinimalSignal({ overallScore: 60 })
  const repaired = makeMinimalSignal({ overallScore: 75 })

  assert.equal(shouldAcceptRepair(original, repaired), true)
})

test('shouldAcceptRepair returns true when scores are equal', () => {
  const original = makeMinimalSignal({ overallScore: 70 })
  const repaired = makeMinimalSignal({ overallScore: 70 })

  assert.equal(shouldAcceptRepair(original, repaired), true)
})

test('shouldAcceptRepair returns false when overallScore drops', () => {
  const original = makeMinimalSignal({ overallScore: 70 })
  const repaired = makeMinimalSignal({ overallScore: 55 })

  assert.equal(shouldAcceptRepair(original, repaired), false)
})

test('shouldAcceptRepair returns false when marketQualityScore drops significantly', () => {
  const original = makeMinimalSignal({
    overallScore: 70,
    marketQuality: { audienceLane: 'male', subgenre: '男频都市逆袭', score: 60, dimensions: [] }
  })
  const repaired = makeMinimalSignal({
    overallScore: 72,
    marketQuality: { audienceLane: 'male', subgenre: '男频都市逆袭', score: 30, dimensions: [] }
  })

  // 下降 30 > 5，应回退
  assert.equal(shouldAcceptRepair(original, repaired), false)
})

test('shouldAcceptRepair returns true when marketQualityScore drops slightly within threshold', () => {
  const original = makeMinimalSignal({
    overallScore: 70,
    marketQuality: { audienceLane: 'male', subgenre: '男频都市逆袭', score: 60, dimensions: [] }
  })
  const repaired = makeMinimalSignal({
    overallScore: 72,
    marketQuality: { audienceLane: 'male', subgenre: '男频都市逆袭', score: 57, dimensions: [] }
  })

  // 下降 3 <= 5，可接受
  assert.equal(shouldAcceptRepair(original, repaired), true)
})

test('shouldAcceptRepair returns true when marketQuality absent in both', () => {
  const original = makeMinimalSignal({ overallScore: 60 })
  const repaired = makeMinimalSignal({ overallScore: 65 })

  assert.equal(shouldAcceptRepair(original, repaired), true)
})

test('shouldAcceptRepair ignores marketQuality when original lacks it', () => {
  const original = makeMinimalSignal({ overallScore: 60 })
  const repaired = makeMinimalSignal({
    overallScore: 65,
    marketQuality: { audienceLane: 'male', subgenre: '男频都市逆袭', score: 50, dimensions: [] }
  })

  // original 没有 marketQuality，不检查
  assert.equal(shouldAcceptRepair(original, repaired), true)
})

// ────────────────────────────────────────────
// 真实 signal 端到端测试（不调 AI）
// ────────────────────────────────────────────

test('content quality detects low commercial scores for weak opening', () => {
  const scene = makeScene('黎明走进山洞。\n小柔：你来了。', 1)
  const signal = inspectContentQualityEpisode(scene, {
    protagonistName: '黎明',
    antagonistName: '李科'
  })

  // Weak opening should have low openingShockScore
  assert.ok(signal.openingShockScore < 50, `expected low openingShockScore, got ${signal.openingShockScore}`)
})

test('content quality detects high scores for strong commercial scene', () => {
  const scene = makeScene(
    '△黎明被当众剥夺身份。\n李科：按门规，废除你第十九徒之名。\n黎明：账册在此，跪下。\n李科：后退。\n众人：震惊！\n△追兵逼近。',
    1
  )
  const signal = inspectContentQualityEpisode(scene, {
    protagonistName: '黎明',
    antagonistName: '李科'
  })

  assert.ok(signal.openingShockScore >= 40, `openingShockScore=${signal.openingShockScore}`)
  assert.ok(signal.villainOppressionQualityScore >= 40, `villainOppressionQualityScore=${signal.villainOppressionQualityScore}`)
  assert.ok(signal.catharsisPayoffScore >= 40, `catharsisPayoffScore=${signal.catharsisPayoffScore}`)
})

test('buildContentRepairSignals from real male scene includes male-specific signals', () => {
  const scene = makeScene(
    '第1集\n1-1 夜\n人物：黎明、李科\n△黎明走进山洞。\n李科：废物，你来了。',
    1
  )
  const signal = inspectContentQualityEpisode(scene, {
    protagonistName: '黎明',
    antagonistName: '李科',
    marketProfile: { audienceLane: 'male', subgenre: '男频都市逆袭' }
  })
  const signals = buildContentRepairSignals(signal, { audienceLane: 'male', subgenre: '男频都市逆袭' })

  // 低分场景应产生至少一个男频维度信号
  const maleSignals = signals.filter((s) =>
    ['statusReversal', 'powerProgression', 'hiddenCard', 'publicPayoff', 'villainHierarchy'].includes(s.id)
  )
  assert.ok(maleSignals.length >= 1, `expected male signals, got ${signals.map(s => s.id).join(',')}`)
})

test('buildContentRepairSignals from real female scene includes female-specific signals', () => {
  const scene = makeScene(
    '第1集\n1-1 夜\n人物：女主、反派\n△女主好像在思考什么。\n反派：你完了。',
    1
  )
  const signal = inspectContentQualityEpisode(scene, {
    protagonistName: '女主',
    antagonistName: '反派',
    marketProfile: { audienceLane: 'female', subgenre: '女频霸总甜宠' }
  })
  const signals = buildContentRepairSignals(signal, { audienceLane: 'female', subgenre: '女频霸总甜宠' })

  const femaleSignals = signals.filter((s) =>
    ['emotionalIdentification', 'relationshipTension', 'powerBorrowing', 'supportingPowerReveal', 'femaleGrowth'].includes(s.id)
  )
  assert.ok(femaleSignals.length >= 1, `expected female signals, got ${signals.map(s => s.id).join(',')}`)
})

test('buildContentRepairSignals null marketProfile does not crash', () => {
  const scene = makeScene('黎明走进山洞。', 1)
  const signal = inspectContentQualityEpisode(scene, { protagonistName: '黎明' })
  const signals = buildContentRepairSignals(signal, null)

  assert.ok(Array.isArray(signals))
})
