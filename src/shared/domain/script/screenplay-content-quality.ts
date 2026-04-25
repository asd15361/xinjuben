/**
 * src/shared/domain/script/screenplay-content-quality.ts
 *
 * 内容质量深度检测框架：循环模式、人物弧线、主题落地。
 *
 * 与 screenplay-quality.ts（字数/格式/污染）分工：
 * - screenplay-quality.ts：字数合同、场次数、VO、模板污染、结构
 * - 本文件：内容层质量（循环、弧线、主题、情节新鲜度）
 *
 * 本文件只做测量和信号输出，不做门禁、不做硬限制。
 */

import type { ScriptSegmentDto } from '../../contracts/workflow.ts'
import {
  detectProtagonistWeakness,
  type WeaknessDetectionResult
} from './screenplay-weakness-detection.ts'
import {
  TACTIC_CATEGORY_LABELS,
  type TacticCategory,
  mapPressureTypeToCategory,
  validateTacticRotation
} from './screenplay-tactic-rotation.ts'
import {
  checkSceneInformationDensity,
  detectExpositionLines
} from '../short-drama/information-density-policy.ts'
import { detectFormatIssues } from '../short-drama/screenplay-format-policy.ts'
import type { MarketProfileDto } from '../../contracts/project.ts'
import type { MarketPlaybookDto } from '../../contracts/market-playbook.ts'
import type { StoryStateSnapshotDto } from '../../contracts/story-state.ts'
import { inspectStoryContinuityAgainstSnapshot } from './screenplay-continuity-audit.ts'
import { inspectPlaybookAlignment } from '../market-playbook/playbook-alignment.ts'

// ─────────────────────────────────────────────────────────────────────────────
// KNOWN_LOOP_PATTERNS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 6 种已知的循环模式。
 * 每个模式包含：id、名称、正则关键词对（触发词 + 验证词）。
 * 验证词用于判断"这是真重复"还是"同一场景的新动作"。
 */
export interface LoopPattern {
  id: string
  label: string
  /** 触发词：出现这些词时，说明可能进入该循环 */
  triggerKeywords: string[]
  /** 验证词：触发后，如果紧接着出现这些词，说明是循环而非新动作 */
  verifiedKeywords: string[]
  /** 循环特征描述 */
  description: string
  /** 替代打法：检测到该循环时，推荐使用的破局手法 */
  alternativeTactics: string[]
}

export const KNOWN_LOOP_PATTERNS: LoopPattern[] = [
  {
    id: 'throwFakeKey',
    label: '扔假钥循环',
    triggerKeywords: ['假钥', '假钥匙', '假钥匙'],
    verifiedKeywords: ['扔掉', '抛出', '掷出', '丢弃'],
    description: '角色用假钥匙脱身，后续又用同样方式再脱身一次',
    alternativeTactics: [
      '利用环境埋伏：假装交出钥匙，实则把对方引到陷阱',
      '灯下黑躲藏：把钥匙藏在对方眼皮底下',
      '调包换物：交给对方一个相似但不是钥匙的东西',
      '制造声东击西：用另一件东西引开注意力再行动'
    ]
  },
  {
    id: 'xiaRouBleeding',
    label: '小柔流血循环',
    triggerKeywords: ['小柔', '流血', '渗血', '伤口'],
    verifiedKeywords: ['捂伤口', '强忍', '踉跄', '血迹'],
    description: '小柔受伤流血，后续又以类似方式再伤一次',
    alternativeTactics: [
      '惊险闪避无伤：改为利用身法闪避',
      '利用身法诱敌：受伤变成诱敌深入',
      '有效包扎掩盖：包扎时发现关键线索',
      '反杀并夺取治疗物：受伤后立刻反击并夺取所需物品'
    ]
  },
  {
    id: 'gangsterScoldWaste',
    label: '喽啰骂废物循环',
    triggerKeywords: ['喽啰', '匪徒', '手下'],
    verifiedKeywords: ['废物', '没用', '蠢货', '饭桶'],
    description: '喽啰角色辱骂对手废物，后续又以同样方式再骂一次',
    alternativeTactics: [
      '直接实质威胁：用行动证明威胁而非语言侮辱',
      '展示武力压迫：直接动手展示力量差距',
      '提出利益交换：用利益分化代替骂街',
      '流露对上级的恐惧：喽啰自己也在恐惧中做出极端行为'
    ]
  },
  {
    id: 'liKeFaceDark',
    label: '李柯黑脸循环',
    triggerKeywords: ['李柯', '脸色一沉', '面色一沉', '脸一沉'],
    verifiedKeywords: ['冷哼', '不说话', '拂袖', '转身'],
    description: '李柯阴沉表情反应，后续又以同样方式再反应一次',
    alternativeTactics: [
      '虚伪的示好或捧杀：表面赞赏实则挖坑',
      '猫捉老鼠的戏耍：用轻松语气说出残忍条件',
      '冷静的规则杀人：用宗门规矩把人逼进死路',
      '阴冷惨笑：用非语言的反应替代同一种表情'
    ]
  },
  {
    id: 'fakeSealMap',
    label: '假阵图循环',
    triggerKeywords: ['阵图', '阵法', '布局'],
    verifiedKeywords: ['假的', '伪造', '仿制', '骗局'],
    description: '角色发现阵图是假的，后续又发现另一张也是假的',
    alternativeTactics: [
      '残缺的真阵图：只找到一部分真实信息',
      '通往陷阱的假诱饵：阵图本身是敌人设的陷阱',
      '只有特定人能读的加密图：需要钥匙或血契才能解读',
      '互相矛盾的双份信息：两份资料打架，需要判断真伪'
    ]
  },
  {
    id: 'yiChengYangQuestion',
    label: '易成质疑循环',
    triggerKeywords: ['易成', '质问', '质疑', '追问'],
    verifiedKeywords: ['你怎么知道', '凭什么', '这不可能'],
    description: '易成质问对方，后续又以类似方式再质一次',
    alternativeTactics: [
      '言语陷阱诱导自证：设话术套让对方自己暴露',
      '假意投诚实则卧底：假装站队实则收集情报',
      '静默的心理博弈：不用语言而用行动和眼神施压',
      '假装相信并入局：表面接受对方条件，实则在内部破坏'
    ]
  }
]

// ─────────────────────────────────────────────────────────────────────────────
// INTERFACES
// ─────────────────────────────────────────────────────────────────────────────

/** 单集循环检测结果 */
export interface LoopDetection {
  patternId: string
  patternLabel: string
  sceneNo: number | null
  /** 触发关键词在正文中的行索引（0-based） */
  triggerLineIndex: number
  /** 该行全文 */
  triggerLineText: string
  /** 是否为真实循环（触发+验证都命中） */
  isRealLoop: boolean
  /** 真实循环级别：repeat=简单重复，variant=变体重复 */
  loopLevel: 'repeat' | 'variant' | null
}

/** 人物弧线快照 */
export interface CharacterArcSnapshot {
  characterName: string
  /** 弧线状态 */
  status: 'advanced' | 'stagnant' | 'regressed' | 'new'
  /** 弧线描述 */
  description: string
  /** 相关证据（从剧本中提取的关键句） */
  evidence: string[]
}

/** 内容质量信号 */
export interface ContentQualitySignal {
  sceneNo: number | null
  /** 循环问题 */
  loops: LoopDetection[]
  /** 人物弧线 */
  characterArcs: CharacterArcSnapshot[]
  /** 主题锚定分数：0-100，>=60 视为有落地 */
  themeAnchoringScore: number
  /** 情节新鲜度分数：0-100，>=60 视为有新事件 */
  plotNoveltyScore: number
  /** 戏剧推进分：看本集是否真的发生了局面变化，而不是原地说话 */
  dramaticTurnScore: number
  /** 场次引擎分：看每场是否有目标/阻碍/结果 */
  sceneEngineScore: number
  /** 角色功能分：主角是否选择、对手是否施压、配角是否提供杠杆 */
  characterFunctionScore: number
  /** 窝囊检测结果 */
  weaknessDetection: WeaknessDetectionResult
  /** 打法轮换检测结果 */
  tacticRotation: {
    currentCategory?: TacticCategory
    isDuplicate: boolean
    suggestedCategory?: TacticCategory
  }
  /** 开局冲击分：0-100，前5行是否有高损失/高羞辱/高危险/高反转事件 */
  openingShockScore: number
  /** 集尾留客分：0-100，集尾是否停在新危机压到眼前的瞬间 */
  hookRetentionScore: number
  /** 金句密度分：0-100，是否有15字以内短钉子句绑定具体物件 */
  punchlineDensityScore: number
  /** 反派压迫质量分：0-100，反派是否用规则/权力/利益/布局压人 */
  villainOppressionQualityScore: number
  /** 爽点兑现分：0-100，主角反击+反派损失+旁观者反应是否完整 */
  catharsisPayoffScore: number
  /** 信息密度分：0-100，冲突/道具/潜台词/动作情绪四要素是否到位 */
  informationDensityScore: number
  /** 剧本格式分：0-100，格式是否符合剧本规范 */
  screenplayFormatScore: number
  /** 故事连续性分：0-100，snapshot 驱动的连续性质检 */
  storyContinuityScore: number
  /** 垂类市场质量分（男频/女频），无 marketProfile 时为 undefined */
  marketQuality?: MarketQualitySignal
  /** MarketPlaybook 对齐度观测分（0-100），无 playbook 时为 undefined。不进入 overallScore */
  playbookAlignmentScore?: number
  /** 总分 */
  overallScore: number
  /** 需要返修的推荐类型 */
  repairRecommendations: ContentRepairRecommendation[]
}

/** 返修推荐 */
export interface ContentRepairRecommendation {
  type: 'episode_engine' | 'arc_control' | 'emotion_lane'
  priority: 'high' | 'medium' | 'low'
  reason: string
  targetCharacters?: string[]
}

/** 结构化修稿信号（给修稿 Prompt 用的具体问题清单） */
export interface ContentRepairSignal {
  id: string
  severity: 'high' | 'medium'
  score: number
  title: string
  diagnosis: string
  repairInstruction: string
  evidence: string[]
}

/** 垂类市场质量维度 */
export interface MarketQualityDimension {
  id: string
  label: string
  score: number
  evidence: string[]
  repairHint: string
}

/** 垂类市场质量信号 */
export interface MarketQualitySignal {
  audienceLane: 'male' | 'female'
  subgenre: string
  score: number
  dimensions: MarketQualityDimension[]
}

/** 批量内容质量报告 */
export interface BatchContentQualityReport {
  episodeCount: number
  episodes: ContentQualitySignal[]
  /** 需要返修的集数 */
  episodesNeedingRepair: number
  /** 平均主题锚定分 */
  averageThemeAnchoringScore: number
  /** 平均情节新鲜度分 */
  averagePlotNoveltyScore: number
  /** 平均开局冲击分 */
  averageOpeningShockScore: number
  /** 平均金句密度分 */
  averagePunchlineDensityScore: number
  /** 平均爽点兑现分 */
  averageCatharsisPayoffScore: number
  /** 平均反派压迫质量分 */
  averageVillainOppressionQualityScore: number
  /** 平均集尾留客分 */
  averageHookRetentionScore: number
  /** 平均信息密度分 */
  averageInformationDensityScore: number
  /** 平均剧本格式分 */
  averageScreenplayFormatScore: number
  /** 平均故事连续性分 */
  averageStoryContinuityScore: number
  /** 垂类市场质量平均分 */
  averageMarketQualityScore?: number
  /** MarketPlaybook 对齐度平均观测分，无 playbook 时为 undefined */
  averagePlaybookAlignmentScore?: number
  /** 循环问题汇总 */
  loopProblemSummary: {
    totalLoops: number
    byPattern: Record<string, number>
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function normalize(text: string | undefined): string {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .trim()
}

function getScreenplayLines(scene: ScriptSegmentDto): string[] {
  const screenplay = normalize(scene.screenplay)
  return screenplay
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}

function countKeywordHits(lines: string[], keywords: string[]): number {
  return lines.reduce((sum, line) => {
    return sum + (keywords.some((keyword) => line.includes(keyword)) ? 1 : 0)
  }, 0)
}

function hasAnyKeyword(text: string, keywords: string[]): boolean {
  return keywords.some((keyword) => text.includes(keyword))
}

/**
 * 检测某段正文是否命中已知循环模式。
 * 使用启发式匹配：触发词出现 + 验证词紧随其后。
 */
function detectLoopsInScreenplay(screenplay: string, sceneNo: number | null): LoopDetection[] {
  const lines = normalize(screenplay).split('\n')
  const detections: LoopDetection[] = []

  for (const pattern of KNOWN_LOOP_PATTERNS) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const hasTrigger = pattern.triggerKeywords.some((kw) => line.includes(kw))
      if (!hasTrigger) continue

      const isRealLoop = pattern.verifiedKeywords.some((kw) => {
        // 检查紧邻的下一行
        const nextLine = lines[i + 1] || ''
        return nextLine.includes(kw) || line.includes(kw)
      })

      detections.push({
        patternId: pattern.id,
        patternLabel: pattern.label,
        sceneNo,
        triggerLineIndex: i,
        triggerLineText: line,
        isRealLoop,
        loopLevel: isRealLoop ? 'repeat' : null
      })
    }
  }

  return detections
}

// ─────────────────────────────────────────────────────────────────────────────
// CORE DETECTION FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 检测剧本中已知的循环模式。
 * 返回所有匹配结果，包括真实循环和疑似循环。
 */
export function detectLoopsInEpisode(scene: ScriptSegmentDto): LoopDetection[] {
  const screenplay = normalize(scene.screenplay)
  return detectLoopsInScreenplay(screenplay, scene.sceneNo || null)
}

/**
 * 计算故事忠实度。
 * 检查当前集是否偏离了 sellingPremise 的核心承诺。
 *
 * 启发式：
 * - 如果当前集出现了 sellingPremise 中未承诺的新冲突/新角色/新设定，分数降低。
 * - 如果当前集承接了之前集的未解冲突，+5。
 * - 如果当前集对 sellingPremise 的核心悬念有推进，+10。
 */
export function computeStoryFaithfulness(
  scene: ScriptSegmentDto,
  sellingPremise: string | undefined
): number {
  if (!sellingPremise) return 50

  const screenplay = normalize(scene.screenplay)
  const premise = normalize(sellingPremise)

  // 提取 premise 中的核心关键词（名词、动词）
  const premiseWords = premise.split(/[\s，。、；：""''【】]/).filter((w) => w.length >= 2)

  // 统计 premise 词在剧本中的命中数
  let matchCount = 0
  for (const word of premiseWords) {
    if (screenplay.includes(word)) matchCount++
  }

  const ratio = matchCount / Math.max(premiseWords.length, 1)
  // 60-90 区间映射
  return Math.round(Math.min(90, Math.max(60, ratio * 100 + 40)))
}

/**
 * 计算主题锚定分数。
 * 检查剧本是否有"谦卦/不争/空无一物"主题落地。
 *
 * 主题落地方式（不是堆规则，而是让角色做一个"不争"的选择）：
 * 1. 放弃打开秘宝验证
 * 2. 选择不追究对手
 * 3. 小柔主动放弃换取
 */
export function computeThemeAnchoring(
  scene: ScriptSegmentDto,
  protagonistName: string = '黎明',
  themeText?: string
): number {
  const screenplay = normalize(scene.screenplay)
  const lines = getScreenplayLines(scene)

  let score = 0

  const genericChoiceKeywords = [
    '决定',
    '选择',
    '放弃',
    '退让',
    '让出',
    '不追',
    '不抢',
    '压住',
    '收手',
    '不打开',
    '交给他',
    '先忍',
    '先退',
    '暂不',
    '不揭穿',
    '不翻脸',
    '藏住'
  ]
  const costKeywords = [
    '代价',
    '失去',
    '受伤',
    '挨打',
    '被逼',
    '牺牲',
    '冒险',
    '顶上去',
    '换伤',
    '扛住',
    '硬吃',
    '流血',
    '暴露'
  ]
  const consequenceKeywords = [
    '于是',
    '结果',
    '因此',
    '当场',
    '随即',
    '立刻',
    '逼得',
    '换来',
    '反而',
    '却让',
    '局面',
    '转成'
  ]
  const competitionKeywords = ['必须赢', '一定要', '非拿不可', '志在必得', '不能输']

  const protagonistLines = lines.filter((line) => line.includes(protagonistName))
  const themeKeywords = normalize(themeText)
    .split(/[\s，。、；：""''【】]/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 2)

  const hasChoiceAction = hasAnyKeyword(screenplay, genericChoiceKeywords)
  const hasCost = hasAnyKeyword(screenplay, costKeywords)
  const hasConsequence = hasAnyKeyword(screenplay, consequenceKeywords)
  const hasThemeKeyword = themeKeywords.some((kw) => screenplay.includes(kw))
  const protagonistChoiceLine =
    protagonistLines.find((line) => hasAnyKeyword(line, genericChoiceKeywords)) || ''
  const protagonistCostLine =
    protagonistLines.find((line) => hasAnyKeyword(line, costKeywords)) || ''
  const nearbyConsequenceLine = lines.find((line) => hasAnyKeyword(line, consequenceKeywords)) || ''
  const hasStructuredThemeAction =
    protagonistChoiceLine.length > 0 &&
    (protagonistCostLine.length > 0 || hasCost) &&
    (nearbyConsequenceLine.length > 0 || hasConsequence)

  if (hasChoiceAction) score += 25
  if (hasCost) score += 20
  if (hasConsequence) score += 15
  if (hasThemeKeyword) score += 10
  if (hasStructuredThemeAction) score += 20

  const hasProtagonistChoice = protagonistLines.some((line) =>
    genericChoiceKeywords.some((kw) => line.includes(kw))
  )
  if (hasProtagonistChoice) score += 20

  if (/谦|不争|退让|藏锋/.test(normalize(themeText))) {
    const humilityKeywords = ['放下', '不争', '退让', '让出', '放弃', '不追究', '认输']
    if (humilityKeywords.some((kw) => screenplay.includes(kw))) score += 20
  }

  if (competitionKeywords.some((kw) => screenplay.includes(kw))) {
    score = Math.max(0, score - 20)
  }

  return Math.min(100, Math.max(0, score))
}

/**
 * 计算情节新鲜度。
 * 检查本集是否有新事件，而不是重复之前的内容。
 */
export function computePlotNovelty(
  scene: ScriptSegmentDto,
  previousScenes: ScriptSegmentDto[] = []
): number {
  const screenplay = normalize(scene.screenplay)
  const lines = getScreenplayLines(scene)

  if (previousScenes.length === 0) {
    // 第一集默认新鲜度较高
    return 80
  }

  let noveltyScore = 50

  // 新角色出现
  const newCharacterPattern = /[\uff08]新登场|新出现|初登场|首次出场|登场[\uff1a]/
  const hasNewCharacter = newCharacterPattern.test(screenplay)
  if (hasNewCharacter) noveltyScore += 20

  // 新地点出现
  const newLocationPattern = /[\uff08]转场|新地点|来到|闯入|潜入|前往/
  const hasNewLocation = newLocationPattern.test(screenplay)
  if (hasNewLocation) noveltyScore += 10

  // 集尾有结果落地（VS 集尾停在"看到某物"或"准备做某事"）
  const resultMarkers = [
    '落下',
    '被打开',
    '被杀',
    '被抓',
    '被发现',
    '被毁',
    '崩塌',
    '弯折',
    '撕裂',
    '渗血',
    '燃起',
    '熄灭'
  ]
  const lastLines = lines.slice(-5)
  const hasResultEnding = lastLines.some((line) => resultMarkers.some((m) => line.includes(m)))
  if (hasResultEnding) noveltyScore += 15

  // 检查是否与前几集重复关键词过多
  const prevContent = previousScenes
    .slice(-3)
    .map((s) => normalize(s.screenplay))
    .join(' ')
  const overlapWords = lines.filter((line) => prevContent.includes(line))
  const overlapRatio = overlapWords.length / Math.max(lines.length, 1)
  if (overlapRatio > 0.6) noveltyScore = Math.max(0, noveltyScore - 25)
  else if (overlapRatio > 0.4) noveltyScore = Math.max(0, noveltyScore - 10)

  return Math.min(100, Math.max(0, noveltyScore))
}

export function computeDramaticTurnScore(scene: ScriptSegmentDto): number {
  const lines = getScreenplayLines(scene)
  if (lines.length === 0) return 0

  const turnKeywords = [
    '突然',
    '却',
    '反手',
    '转身',
    '发现',
    '原来',
    '改口',
    '当场',
    '逼得',
    '拦住',
    '夺包',
    '翻出',
    '截住',
    '压回去'
  ]
  const decisionKeywords = [
    '决定',
    '选择',
    '放弃',
    '交出',
    '抢回',
    '揭开',
    '念出',
    '答应',
    '拒绝',
    '不给',
    '先退',
    '先忍',
    '不揭穿'
  ]
  const resultKeywords = [
    '落下',
    '被抓',
    '被打开',
    '撕裂',
    '渗血',
    '撞开',
    '带走',
    '押走',
    '点燃',
    '炸开',
    '夺走',
    '翻出',
    '卡住',
    '断裂',
    '扑空',
    '落进',
    '散开'
  ]
  const weakEndingKeywords = [
    '看见',
    '望向',
    '盯着',
    '准备',
    '打算',
    '似乎',
    '仿佛',
    '像是',
    '将要'
  ]

  const lastLines = lines.slice(-6)
  let score = 25
  score += Math.min(30, countKeywordHits(lines, turnKeywords) * 10)
  score += Math.min(25, countKeywordHits(lines, decisionKeywords) * 8)
  score += Math.min(35, countKeywordHits(lastLines, resultKeywords) * 14)
  if (
    countKeywordHits(lastLines, resultKeywords) === 0 &&
    countKeywordHits(lastLines, weakEndingKeywords) > 0
  ) {
    score = Math.max(0, score - 20)
  }

  return Math.min(100, score)
}

export function computeSceneEngineScore(scene: ScriptSegmentDto): number {
  const screenplayScenes = scene.screenplayScenes || []
  if (screenplayScenes.length === 0) return 40

  const obstacleKeywords = ['拦', '逼', '搜', '追', '抢', '压', '威胁', '阻', '踹', '挡', '逼近']
  const resultKeywords = [
    '于是',
    '结果',
    '当场',
    '随即',
    '立刻',
    '带走',
    '打开',
    '撞开',
    '发现',
    '落下',
    '扔出',
    '夺包',
    '断裂',
    '扑空',
    '翻出',
    '卡住'
  ]
  const choiceKeywords = [
    '决定',
    '选择',
    '放弃',
    '答应',
    '拒绝',
    '交出',
    '转身',
    '冲上去',
    '退后',
    '先藏起来',
    '不给',
    '先忍',
    '暂不',
    '不揭穿'
  ]

  let total = 0
  for (const item of screenplayScenes) {
    const lines = normalize(item.body)
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    let sceneScore = 20
    const obstacleHits = countKeywordHits(lines, obstacleKeywords)
    const resultHits = countKeywordHits(lines, resultKeywords)
    const choiceHits = countKeywordHits(lines, choiceKeywords)

    if (obstacleHits > 0) sceneScore += 25
    if (resultHits > 0) sceneScore += 30
    if (choiceHits > 0) sceneScore += 15
    if (obstacleHits > 0 && resultHits > 0) sceneScore += 10
    if (obstacleHits > 0 && choiceHits > 0 && resultHits > 0) sceneScore += 10
    if (resultHits === 0) sceneScore = Math.max(0, sceneScore - 15)
    if (lines.length >= 6) sceneScore += 10
    total += Math.min(100, sceneScore)
  }

  return Math.round(total / screenplayScenes.length)
}

export function computeCharacterFunctionScore(
  scene: ScriptSegmentDto,
  protagonistName: string,
  supportingName: string,
  antagonistName: string
): number {
  const lines = getScreenplayLines(scene)
  const protagonistLines = lines.filter((line) => line.includes(protagonistName))
  const supportingLines = lines.filter((line) => line.includes(supportingName))
  const antagonistLines = lines.filter((line) => line.includes(antagonistName))

  const choiceKeywords = [
    '决定',
    '选择',
    '交出',
    '拒绝',
    '放弃',
    '抢回',
    '念出',
    '答应',
    '先忍',
    '先退',
    '不揭穿',
    '不给'
  ]
  const leverageKeywords = [
    '账册',
    '线索',
    '契书',
    '钥匙',
    '药',
    '藏',
    '递给',
    '提醒',
    '拖住',
    '掩护',
    '挡住',
    '塞进',
    '喊出去'
  ]
  const pressureKeywords = [
    '逼',
    '搜',
    '抢',
    '压',
    '威胁',
    '带走',
    '封',
    '烧',
    '踹',
    '押',
    '撞开',
    '追',
    '围住'
  ]
  const consequenceKeywords = [
    '当场',
    '结果',
    '于是',
    '随即',
    '立刻',
    '扑空',
    '断裂',
    '翻出',
    '卡住',
    '退了半步'
  ]

  let score = 0
  if (
    protagonistLines.length > 0 &&
    countKeywordHits(protagonistLines, choiceKeywords) > 0 &&
    countKeywordHits(lines, consequenceKeywords) > 0
  )
    score += 40
  else if (protagonistLines.length > 0 && countKeywordHits(protagonistLines, choiceKeywords) > 0)
    score += 25
  else if (protagonistLines.length > 0) score += 15

  if (supportingLines.length > 0 && countKeywordHits(supportingLines, leverageKeywords) > 0)
    score += 30
  else if (supportingLines.length > 0) score += 5

  if (antagonistLines.length > 0 && countKeywordHits(antagonistLines, pressureKeywords) > 0)
    score += 35
  else if (antagonistLines.length > 0) score += 10

  return Math.min(100, score)
}

/**
 * 检测人物弧线进展。
 *
 * 弧线状态判断：
 * - advanced：角色有明确的内心/行为变化
 * - stagnant：角色状态和之前一样
 * - regressed：角色从已有进展退回去了
 * - new：角色首次出现
 */
export function computeCharacterArcProgress(
  scene: ScriptSegmentDto,
  characterName: string,
  previousArcStatus?: CharacterArcSnapshot['status']
): CharacterArcSnapshot {
  const lines = getScreenplayLines(scene)
  const characterLines = lines.filter((line) => line.includes(characterName))

  if (characterLines.length === 0) {
    return {
      characterName,
      status: previousArcStatus === 'new' ? 'new' : 'stagnant',
      description: '本集该角色无出场或台词',
      evidence: []
    }
  }

  // 检测变化信号：优先看动作/选择/关系推进，不靠内心独白
  const changeKeywords = [
    '决定',
    '选择',
    '交出',
    '拒绝',
    '冲上',
    '拦住',
    '抢回',
    '念出',
    '护住',
    '转身',
    '终于',
    '开始'
  ]
  const regressionKeywords = ['依然', '还是', '照旧', '依旧', '再次', '又被', '只能', '只好']
  const evidence: string[] = []

  for (const line of characterLines) {
    if (changeKeywords.some((kw) => line.includes(kw))) {
      evidence.push(line)
    }
  }

  const hasChange = evidence.length > 0
  const hasRegression = characterLines.some((line) =>
    regressionKeywords.some((kw) => line.includes(kw))
  )

  let status: CharacterArcSnapshot['status'] = 'stagnant'
  let description = '本集无明显变化'

  if (!previousArcStatus) {
    if (hasChange) {
      status = 'advanced'
      description = '角色开始有内心或行为上的转变'
    } else if (hasRegression) {
      status = 'regressed'
      description = '角色从之前的进展退回去了'
    }
  } else if (previousArcStatus === 'new' || previousArcStatus === 'stagnant') {
    if (hasChange) {
      status = 'advanced'
      description = '角色开始有内心或行为上的转变'
    } else if (hasRegression) {
      status = 'regressed'
      description = '角色从之前的进展退回去了'
    }
  } else if (previousArcStatus === 'advanced') {
    if (hasChange) {
      status = 'advanced'
      description = '角色有持续的内心成长或行为变化'
    } else if (hasRegression) {
      status = 'regressed'
      description = '角色从已有的成长退回去了'
    }
  } else if (previousArcStatus === 'regressed') {
    if (hasChange) {
      status = 'advanced'
      description = '角色从退步状态中恢复，开始新的转变'
    }
  }

  return {
    characterName,
    status,
    description,
    evidence: evidence.slice(0, 3)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 商业传播力检测函数（5项）
// ─────────────────────────────────────────────────────────────────────────────

/** 开局冲击分：前5行是否有高损失/高羞辱/高危险/高反转事件 */
export function computeOpeningShockScore(scene: ScriptSegmentDto): number {
  const lines = getScreenplayLines(scene)
  if (lines.length === 0) return 0

  // 跳过标题行、场号行和"人物"行，找前5行正文
  const contentLines = lines.filter(
    (l) => !l.startsWith('第') && !/^\d+-\d+/.test(l) && !l.startsWith('人物')
  )
  const firstLines = contentLines.slice(0, 5)
  const firstText = firstLines.join('\n')

  const lossKeywords = [
    '失去', '丢', '被夺', '抢走', '摔碎', '毁掉', '剥夺', '撤销', '废掉', '罢免',
    '开除', '解雇', '炒', '分手', '背叛', '退婚', '出轨', '被甩', '丢工作',
    '被抢', '破产', '查封', '冻结', '没收'
  ]
  const humiliationKeywords = [
    '当众', '跪下', '扇', '羞辱', '嘲笑', '辱骂', '打脸', '踩在', '践踏',
    '废物', '垃圾', '滚', '不配', '没用', '泼', '浇', '倒', '甩',
    '你算什么东西', '你也配'
  ]
  const dangerKeywords = [
    '刀', '剑', '抵住', '逼近', '包围', '火', '毒', '悬崖', '陷阱', '杀',
    '威胁', '绑架', '打手', '围堵', '砸', '撞', '追', '堵',
    '掐住', '勒住', '按倒'
  ]
  const twistKeywords = [
    '原来', '竟然', '不是', '假的', '才发现', '真正的', '居然', '竟是',
    '原来你', '我一直以为', '结果是', '你竟然', '没想到'
  ]

  // 开场强视觉冲击加分（泼酒、扇耳光、被按倒等具象动作）
  const visualStrikeKeywords = ['泼', '浇', '扇', '甩', '踢', '踹', '砸', '撞', '摔', '掐', '按', '踩']
  const hasVisualStrike = firstLines.some((l) => visualStrikeKeywords.some((k) => l.includes(k)))

  let score = 15 // 基础分从0提到15，鼓励有开场动作的剧集
  if (lossKeywords.some((k) => firstText.includes(k))) score += 25
  if (humiliationKeywords.some((k) => firstText.includes(k))) score += 25
  if (dangerKeywords.some((k) => firstText.includes(k))) score += 20
  if (twistKeywords.some((k) => firstText.includes(k))) score += 20
  if (hasVisualStrike) score += 10

  // 额外加分：如果第一场有△动作（眼前事件优先）
  if (firstLines.some((l) => l.startsWith('△'))) score += 5

  return Math.min(100, score)
}

/** 集尾留客分：最后3-5行是否停在新危机压到眼前的瞬间 */
export function computeHookRetentionScore(scene: ScriptSegmentDto): number {
  const lines = getScreenplayLines(scene)
  if (lines.length === 0) return 0

  const lastLines = lines.slice(-5)
  const lastText = lastLines.join('\n')

  const crisisKeywords = ['逼近', '追来', '围住', '火光', '喊声', '脚步声', '传来', '压到', '堵住', '封死',
    '短信', '电话', '陌生', '震动', '消息', '通知', '推送', '新闻',
    '有人在看', '监视', '跟踪', '盯', '尾随',
    '刹车', '车灯', '车门', '引擎', '喇叭',
    '等着', '别走', '站住'
  ]
  const hookEndKeywords = ['谁', '什么', '怎么会', '不可能', '完了', '糟了', '小心', '明天', '下一步', '怎么办',
    '等着', '你等着', '走着瞧', '还没完', '这才开始', '好戏',
    '下一个', '更大的', '新的', '又来了', '又是'
  ]
  const weakEndings = ['准备', '打算', '似乎', '仿佛', '将要', '也许', '可能']

  let score = 20
  if (crisisKeywords.some((k) => lastText.includes(k))) score += 35
  if (hookEndKeywords.some((k) => lastText.includes(k))) score += 25

  // 最后一句是对白（带：）加分
  const lastLine = lastLines[lastLines.length - 1] || ''
  if (lastLine.includes('：') && lastLine.length <= 30) score += 20

  // 扣分：开放式弱结尾
  if (weakEndings.some((k) => lastLine.includes(k))) score -= 25

  return Math.min(100, Math.max(0, score))
}

/** 金句密度分：是否有15字以内短钉子句绑定具体物件 */
export function computePunchlineDensityScore(scene: ScriptSegmentDto): number {
  const lines = getScreenplayLines(scene)
  if (lines.length === 0) return 0

  // 提取所有对白行（包含"："的行）
  const dialogueLines = lines.filter((l) => l.includes('：'))
  if (dialogueLines.length === 0) return 0

  // 短句检测：15字以内
  const shortLines = dialogueLines.filter((l) => {
    const text = l.split('：')[1] || ''
    return text.length > 0 && text.length <= 15
  })

  // 反转点附近（包含反转词的行 ±2 行内）
  const twistKeywords = ['原来', '竟然', '不是', '假的', '才发现', '居然', '竟是', '反转']
  const twistIndices = lines
    .map((l, i) => (twistKeywords.some((k) => l.includes(k)) ? i : -1))
    .filter((i) => i >= 0)

  const nearTwist = dialogueLines.filter((l) => {
    const idx = lines.indexOf(l)
    return twistIndices.some((ti) => Math.abs(ti - idx) <= 2)
  })

  // 绑定物件检测：包含具体名词
  const objectKeywords = ['账册', '钥匙', '身份', '底牌', '证据', '规矩', '契书', '令牌', '玉佩']
  const boundLines = dialogueLines.filter((l) => objectKeywords.some((k) => l.includes(k)))

  let score = 0
  score += Math.min(40, shortLines.length * 15)
  score += Math.min(30, nearTwist.length * 15)
  score += Math.min(30, boundLines.length * 15)

  return Math.min(100, score)
}

/** 反派压迫质量分：反派是否用规则/权力/利益/布局压人，不是只吼 */
export function computeVillainOppressionQualityScore(
  scene: ScriptSegmentDto,
  antagonistName = '李柯'
): number {
  const lines = getScreenplayLines(scene)
  if (lines.length === 0) return 0

  const antagonistLines = lines.filter((l) => l.includes(antagonistName))
  if (antagonistLines.length === 0) return 40 // 反派没出场给基础分

  const rulePressure = ['规矩', '门规', '宗规', '按律', '法令', '制度', '程序', '条例']
  const powerPressure = ['权力', '罢免', '撤职', '封杀', '禁足', '逐出', '降职', '革除']
  const interestPressure = ['收买', '分化', '离间', '挑拨', '筹码', '交换', '条件', '利益']
  const proxyPressure = ['借', '利用', '当枪', '替罪', '嫁祸', '引到', '推给']
  const lowQualityPressure = ['废物', '没用', '蠢货', '饭桶', '垃圾', '去死', '滚']

  let score = 30
  if (antagonistLines.some((l) => rulePressure.some((k) => l.includes(k)))) score += 20
  if (antagonistLines.some((l) => powerPressure.some((k) => l.includes(k)))) score += 20
  if (antagonistLines.some((l) => interestPressure.some((k) => l.includes(k)))) score += 20
  if (antagonistLines.some((l) => proxyPressure.some((k) => l.includes(k)))) score += 20

  // 扣分：只靠辱骂/吼叫
  const lowQualityCount = antagonistLines.filter((l) =>
    lowQualityPressure.some((k) => l.includes(k))
  ).length
  const totalAntagonistDialogue = antagonistLines.filter((l) => l.includes('：')).length
  if (totalAntagonistDialogue > 0 && lowQualityCount / totalAntagonistDialogue > 0.5) {
    score -= 30
  }

  return Math.min(100, Math.max(0, score))
}

/** 爽点兑现分：主角反击+反派损失+旁观者反应是否完整 */
export function computeCatharsisPayoffScore(
  scene: ScriptSegmentDto,
  protagonistName = '黎明'
): number {
  const lines = getScreenplayLines(scene)
  if (lines.length === 0) return 0

  const protagonistLines = lines.filter((l) => l.includes(protagonistName))

  const counterKeywords = ['反击', '翻盘', '打脸', '揭穿', '底牌', '证据', '真相', '念出', '亮出',
    '出示', '掏出', '拿出', '调出', '播放', '摆出', '拍出',
    '账本', 'U盘', '照片', '录音', '截图', '文件', '合同', '录像']
  const villainLossKeywords = ['后退', '脸色', '瘫坐', '掉落', '发抖', '惊', '慌', '怕', '愣住', '铁青',
    '脸色一变', '脸色变了', '僵住', '急了', '慌了', '满头大汗', '失态',
    '求饶', '认输', '恐慌', '崩溃', '瘫', '跌倒', '扶住']
  const bystanderKeywords = ['围观', '众人', '震惊', '哗然', '不敢', '瞪大', '倒吸', '议论',
    '鸦雀无声', '全场', '满座', '注视', '回头', '死寂', '安静', '站起']

  let score = 0
  if (protagonistLines.some((l) => counterKeywords.some((k) => l.includes(k)))) score += 35
  if (lines.some((l) => villainLossKeywords.some((k) => l.includes(k)))) score += 35
  if (lines.some((l) => bystanderKeywords.some((k) => l.includes(k)))) score += 30

  return Math.min(100, score)
}

// ─────────────────────────────────────────────────────────────────────────────
// 男频垂类质量检测函数
// ─────────────────────────────────────────────────────────────────────────────

export function computeMaleStatusReversalScore(
  scene: ScriptSegmentDto,
  protagonistName = '黎明'
): { score: number; evidence: string[]; repairHint: string } {
  const lines = getScreenplayLines(scene)
  const evidence: string[] = []

  const reversalKeywords = [
    '剥夺', '废除', '撤销', '降职', '碾压', '翻身', '逆袭', '打脸',
    '暴露身份', '亮出', '原来你是', '没想到', '竟敢', '你也配', '跪下', '废除',
    // 都市向
    '被开除', '被解雇', '炒鱿鱼', '上位', '反败为胜', '升职', '提拔',
    '取代', '替换', '拿回', '夺回', '赢回', '胜出', '入选'
  ]
  const protagonistLines = lines.filter((l) => l.includes(protagonistName))

  let score = 20
  for (const line of lines) {
    if (reversalKeywords.some((k) => line.includes(k))) {
      score += 15
      evidence.push(line)
    }
  }

  // 额外加分：主角有反击动作
  const counterKeywords = ['反击', '翻盘', '揭穿', '证据', '真相', '念出', '亮出']
  if (protagonistLines.some((l) => counterKeywords.some((k) => l.includes(k)))) {
    score += 20
  }

  return {
    score: Math.min(100, score),
    evidence: evidence.slice(0, 3),
    repairHint:
      '增加身份/地位/战力反转：主角通过底牌、证据或实力让反派当众吃瘪，旁观者震惊。'
  }
}

export function computeMalePowerProgressionScore(
  scene: ScriptSegmentDto,
  protagonistName = '黎明'
): { score: number; evidence: string[]; repairHint: string } {
  const lines = getScreenplayLines(scene)
  const evidence: string[] = []

  const progressionKeywords = [
    '得到', '获得', '突破', '升级', '新信息', '收服', '变强', '进步',
    '掌握', '觉醒', '晋升', '提拔', '升职', '晋封',
    // 都市向：资源/信息/职位增长
    '拿到证据', '取得信任', '打入内部', '建立人脉', '挖到信息',
    '升迁', '加薪', '中标', '签约', '当选', '任命', '接管', '负责',
    '账户', '余额', '到账', '转入', '收入', '利润', '资金'
  ]
  const protagonistLines = lines.filter((l) => l.includes(protagonistName))

  let score = 15
  for (const line of protagonistLines) {
    if (progressionKeywords.some((k) => line.includes(k))) {
      score += 20
      evidence.push(line)
    }
  }

  // 道具/资源获得加分
  const resourceKeywords = ['钥匙', '账册', '契书', '令牌', '功法', '丹药', '秘籍', '线索',
    // 都市向
    '账本', 'U盘', '照片', '录音', '文件', '合同', '录像', '截图',
    '转账记录', '银行流水', '通讯录', '证据', '数据', '资料']
  if (protagonistLines.some((l) => resourceKeywords.some((k) => l.includes(k)))) {
    score += 15
  }

  return {
    score: Math.min(100, score),
    evidence: evidence.slice(0, 3),
    repairHint: '增加主角能力/资源/身份的显性增长：获得新道具、突破境界、收服新人或掌握关键信息。'
  }
}

export function computeMaleHiddenCardScore(
  scene: ScriptSegmentDto,
  _protagonistName = '黎明'
): { score: number; evidence: string[]; repairHint: string } {
  const lines = getScreenplayLines(scene)
  const evidence: string[] = []

  const hiddenCardKeywords = ['底牌', '隐藏', '秘密', '伏笔', '早就', '一直藏着', '原来', '竟然', '没想到',
    // 都市向
    '身份', '背景', '过去', '经历', '曾经', '以前', '生前', '退役',
    '侦察兵', '特种兵', '当过兵', '老战友', '联系', '资源'
  ]
  const revealKeywords = ['亮出', '展示', '拿出', '掏出', '取出', '揭开', '展开',
    // 都市向
    '出示', '播放', '递过去', '推过去', '摆在', '拍到桌上']

  let score = 10
  for (const line of lines) {
    if (hiddenCardKeywords.some((k) => line.includes(k))) {
      score += 15
      evidence.push(line)
    }
    if (revealKeywords.some((k) => line.includes(k))) {
      score += 15
      evidence.push(line)
    }
  }

  return {
    score: Math.min(100, score),
    evidence: evidence.slice(0, 3),
    repairHint: '底牌要具体可见：前文埋下伏笔（道具/信息/关系），亮出时通过具体动作和对白爆发。'
  }
}

export function computeMalePublicPayoffScore(
  scene: ScriptSegmentDto,
  protagonistName = '黎明',
  antagonistName = '李柯'
): { score: number; evidence: string[]; repairHint: string } {
  const lines = getScreenplayLines(scene)
  const evidence: string[] = []

  const publicKeywords = ['当众', '震惊', '哗然', '不敢', '愣住', '铁青', '后退', '瘫坐', '掉落', '发抖',
    // 都市向
    '脸色变了', '脸色一变', '僵住', '张大', '瞪', '满座', '全场',
    '鸦雀无声', '鸦雀', '死寂', '空气凝固', '安静', '注视', '回头'
  ]
  const protagonistLines = lines.filter((l) => l.includes(protagonistName))
  const antagonistLines = lines.filter((l) => l.includes(antagonistName))

  let score = 10
  for (const line of lines) {
    if (publicKeywords.some((k) => line.includes(k))) {
      score += 15
      evidence.push(line)
    }
  }

  // 主角反击 + 反派溃败同时出现加分
  const counterKeywords = ['证据', '真相', '揭穿', '念出', '亮出', '录音', '照片', '账本', '截图', '文件']
  const villainLossKeywords = ['后退', '脸色', '瘫坐', '掉落', '发抖', '惊', '慌', '怕', '愣住',
    '急了', '慌了', '求饶', '认输', '失态', '满头大汗', '僵住']
  const hasCounter = protagonistLines.some((l) => counterKeywords.some((k) => l.includes(k)))
  const hasVillainLoss = antagonistLines.some((l) => villainLossKeywords.some((k) => l.includes(k)))

  if (hasCounter) score += 20
  if (hasVillainLoss) score += 20
  if (hasCounter && hasVillainLoss) score += 15

  return {
    score: Math.min(100, score),
    evidence: evidence.slice(0, 3),
    repairHint: '打脸要当场兑现：主角打出底牌→反派实质受损（身体/地位/面子）→旁观者震惊反应。'
  }
}

export function computeMaleVillainHierarchyScore(
  scene: ScriptSegmentDto,
  antagonistName = '李柯'
): { score: number; evidence: string[]; repairHint: string } {
  const lines = getScreenplayLines(scene)
  const evidence: string[] = []

  const rulePressure = ['规矩', '门规', '宗规', '按律', '法令', '制度', '程序', '条例', '规定', '公司规定', '平台规则', '合同', '条款']
  const powerPressure = ['权力', '罢免', '撤职', '封杀', '禁足', '逐出', '降职', '革除', '开除', '解雇', '调离', '处罚']
  const interestPressure = ['收买', '分化', '离间', '挑拨', '筹码', '交换', '条件', '利益', '交易', '合作', '分红']
  const proxyPressure = ['借', '利用', '当枪', '替罪', '嫁祸', '引到', '推给', '报警', '举报', '投诉', '告状']
  const lowQualityPressure = ['废物', '没用', '蠢货', '饭桶', '垃圾', '去死', '滚']

  const antagonistLines = lines.filter((l) => l.includes(antagonistName))
  if (antagonistLines.length === 0) {
    return {
      score: 30,
      evidence: [],
      repairHint: '反派未出场，需增加反派施压场景以体现层级递进。'
    }
  }

  let score = 20
  const pressures = [
    { keywords: rulePressure, label: '规则压迫' },
    { keywords: powerPressure, label: '权位压迫' },
    { keywords: interestPressure, label: '利益分化' },
    { keywords: proxyPressure, label: '借刀杀人' }
  ]

  for (const { keywords, label } of pressures) {
    if (antagonistLines.some((l) => keywords.some((k) => l.includes(k)))) {
      score += 15
      evidence.push(`${label}：${antagonistLines.find((l) => keywords.some((k) => l.includes(k)))}`)
    }
  }

  // 扣分：只靠辱骂
  const lowQualityCount = antagonistLines.filter((l) =>
    lowQualityPressure.some((k) => l.includes(k))
  ).length
  const totalDialogue = antagonistLines.filter((l) => l.includes('：')).length
  if (totalDialogue > 0 && lowQualityCount / totalDialogue > 0.5) {
    score -= 30
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    evidence: evidence.slice(0, 3),
    repairHint:
      '反派层级要递进：低级用言语羞辱，中级用规则/权位/利益，高级用布局/借刀杀人。不同层级手段必须有差异。'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 女频垂类质量检测函数
// ─────────────────────────────────────────────────────────────────────────────

export function computeFemaleEmotionalIdentificationScore(
  scene: ScriptSegmentDto,
  protagonistName = '女主'
): { score: number; evidence: string[]; repairHint: string } {
  const lines = getScreenplayLines(scene)
  const evidence: string[] = []

  // 女主具体身体反应（不是情绪总结句）
  const bodyReactionKeywords = [
    '攥紧',
    '颤抖',
    '后退',
    '低头',
    '咬唇',
    '眼眶',
    '发抖',
    '掐',
    '攥',
    '握拳',
    '指尖',
    '掌心',
    '肩膀',
    '缩',
    '挺直',
    '仰起'
  ]
  const protagonistLines = lines.filter((l) => l.includes(protagonistName))

  let score = 15
  for (const line of protagonistLines) {
    if (bodyReactionKeywords.some((k) => line.includes(k))) {
      score += 20
      evidence.push(line)
    }
  }

  // 扣分：直接写情绪总结
  const emotionSummaryPatterns = /她很委屈|她很害怕|她很生气|她很痛苦|内心充满了|感到绝望|感到无助/
  const hasEmotionSummary = lines.some((l) => emotionSummaryPatterns.test(l))
  if (hasEmotionSummary) {
    score -= 25
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    evidence: evidence.slice(0, 3),
    repairHint:
      '情绪必须通过具体身体反应传递：攥紧衣角、后退半步、声音发抖。禁止写"她很委屈"这类总结句。'
  }
}

export function computeFemaleRelationshipTensionScore(
  scene: ScriptSegmentDto,
  _protagonistName = '女主'
): { score: number; evidence: string[]; repairHint: string } {
  const lines = getScreenplayLines(scene)
  const evidence: string[] = []

  const tensionKeywords = [
    '逼近',
    '退后',
    '挡',
    '拦住',
    '别走',
    '为什么',
    '误会',
    '解释',
    '不信',
    '放手',
    '别碰',
    '够了',
    '你什么意思',
    '你到底',
    '沉默',
    '避开'
  ]

  let score = 15
  for (const line of lines) {
    if (tensionKeywords.some((k) => line.includes(k))) {
      score += 15
      evidence.push(line)
    }
  }

  // 对话中的留白/反问加分
  const subtextPatterns = /\?|？|…|——|凭什么|为什么|是吗|对吧|不是吗/
  const dialogueLines = lines.filter((l) => l.includes('：'))
  const hasSubtext = dialogueLines.some((l) => subtextPatterns.test(l))
  if (hasSubtext) score += 15

  return {
    score: Math.min(100, score),
    evidence: evidence.slice(0, 3),
    repairHint:
      '关系拉扯要有张力：一方逼近→另一方退或挡→再逼近→再化解/破裂。用对话语速、措辞、留白体现。'
  }
}

export function computeFemalePowerBorrowingScore(
  scene: ScriptSegmentDto,
  protagonistName = '女主'
): { score: number; evidence: string[]; repairHint: string } {
  const lines = getScreenplayLines(scene)
  const evidence: string[] = []

  const borrowKeywords = [
    '信物',
    '规矩',
    '靠山',
    '背后',
    '撑腰',
    '借用',
    '搬出',
    '引述',
    '以你的名义',
    '令牌',
    '玉佩',
    '指环'
  ]
  const weakBorrowPatterns = /我有靠山|我有人撑腰|你知道我是谁吗|你惹不起/

  const protagonistLines = lines.filter((l) => l.includes(protagonistName))

  let score = 10
  for (const line of protagonistLines) {
    if (borrowKeywords.some((k) => line.includes(k))) {
      score += 25
      evidence.push(line)
    }
  }

  // 扣分：只会空口说"我有靠山"
  if (protagonistLines.some((l) => weakBorrowPatterns.test(l))) {
    score -= 20
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    evidence: evidence.slice(0, 3),
    repairHint:
      '借权反击必须具体：展示信物、引述规则、搬出靠山名字，不能只用一句"我有靠山"。'
  }
}

export function computeFemaleSupportingPowerRevealScore(
  scene: ScriptSegmentDto,
  _protagonistName = '女主'
): { score: number; evidence: string[]; repairHint: string } {
  const lines = getScreenplayLines(scene)
  const evidence: string[] = []

  const supportKeywords = [
    '到场',
    '亲自',
    '派人',
    '传话',
    '展示',
    '特权',
    '下令',
    '保她',
    '护她',
    '谁敢',
    '我的人',
    '有我在'
  ]
  const reactionKeywords = ['震惊', '变了脸色', '不敢', '恭敬', '低头', '退后', '恭敬']

  let score = 10
  for (const line of lines) {
    if (supportKeywords.some((k) => line.includes(k))) {
      score += 20
      evidence.push(line)
    }
  }

  // 周围人反应变化加分
  if (lines.some((l) => reactionKeywords.some((k) => l.includes(k)))) {
    score += 15
  }

  return {
    score: Math.min(100, score),
    evidence: evidence.slice(0, 3),
    repairHint:
      '撑腰场景要写出权力者的具体动作（亲自到场/派人传话/展示特权）和周围人的反应变化。'
  }
}

export function computeFemaleGrowthScore(
  scene: ScriptSegmentDto,
  protagonistName = '女主'
): { score: number; evidence: string[]; repairHint: string } {
  const lines = getScreenplayLines(scene)
  const evidence: string[] = []

  const activeChoiceKeywords = [
    '决定',
    '选择',
    '拒绝',
    '不',
    '我要',
    '我自己',
    '我来',
    '我不怕',
    '不需要',
    '不用你',
    '我自己来'
  ]
  const passiveKeywords = ['救我', '帮我', '带我走', '求求你', '怎么办', '我好怕', '我不敢']

  const protagonistLines = lines.filter((l) => l.includes(protagonistName))

  let score = 20
  for (const line of protagonistLines) {
    if (activeChoiceKeywords.some((k) => line.includes(k))) {
      score += 20
      evidence.push(line)
    }
  }

  // 扣分：只会被动求救
  const passiveCount = protagonistLines.filter((l) =>
    passiveKeywords.some((k) => l.includes(k))
  ).length
  if (passiveCount > 0) {
    score -= passiveCount * 15
  }

  // 扣分：男主救女主但女主无行动
  const rescuePattern = /救她|救我|保护她|护住她|拦住.*她/
  const hasRescue = lines.some((l) => rescuePattern.test(l))
  const hasActiveChoice = protagonistLines.some((l) =>
    activeChoiceKeywords.some((k) => l.includes(k))
  )
  if (hasRescue && !hasActiveChoice) {
    score -= 20
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    evidence: evidence.slice(0, 3),
    repairHint:
      '女主必须有独立判断和行动：主动选择、拒绝、表态。不能只会哭喊求救或等男主救。'
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 通用增强检测函数
// ─────────────────────────────────────────────────────────────────────────────

export function computeInformationDensityScore(scene: ScriptSegmentDto): number {
  const screenplay = normalize(scene.screenplay)
  if (!screenplay) return 0

  const checkpointResults = checkSceneInformationDensity(screenplay)
  const passedCount = checkpointResults.filter((r) => r.passed).length
  const expositionLines = detectExpositionLines(screenplay)

  let score = passedCount * 20

  // 解释性台词扣分
  if (expositionLines.length > 0) {
    score -= Math.min(40, expositionLines.length * 10)
  }

  // 大段解释（连续3行以上无冲突）检测
  const lines = getScreenplayLines(scene)
  let expositionStreak = 0
  let maxExpositionStreak = 0
  for (const line of lines) {
    const isAction = line.startsWith('△')
    const isDialogue = line.includes('：')
    const hasConflict = /[反对抗拒争骂打逼压羞辱嘲笑威胁配]/u.test(line)
    if ((isAction || isDialogue) && !hasConflict) {
      expositionStreak++
      maxExpositionStreak = Math.max(maxExpositionStreak, expositionStreak)
    } else {
      expositionStreak = 0
    }
  }
  if (maxExpositionStreak >= 3) {
    score -= 15
  }

  return Math.min(100, Math.max(0, score))
}

export function computeScreenplayFormatScore(scene: ScriptSegmentDto): number {
  const screenplay = normalize(scene.screenplay)
  if (!screenplay) return 0

  const issues = detectFormatIssues(screenplay)
  const lines = getScreenplayLines(scene)

  let score = 100

  // 每个反模式扣分
  for (const issue of issues) {
    score -= Math.min(20, issue.occurrences.length * 5)
  }

  // 检查对话行是否带双引号（直引号或弯引号）
  const dialogueLines = lines.filter((l) => l.includes('：') && !l.startsWith('△'))
  const quotedCount = dialogueLines.filter((l) => /["“”]/.test(l)).length
  if (quotedCount > 0) {
    score -= Math.min(25, quotedCount * 5)
  }

  // 检查是否有场景标题
  const hasSceneHeadings = lines.some((l) => /^\d+\s*-\s*\d+/.test(l))
  if (!hasSceneHeadings) {
    score -= 20
  }

  // 检查是否有"第X集"标题
  const hasEpisodeTitle = lines.some((l) => /^第\d+集/.test(l))
  if (!hasEpisodeTitle) {
    score -= 10
  }

  // 检查是否像小说旁白
  const novelPatterns = /那是一个|他想起|她回忆起|思绪|往事|多年前|内心充满了/
  const novelLines = lines.filter((l) => novelPatterns.test(l)).length
  if (novelLines > 0) {
    score -= Math.min(30, novelLines * 10)
  }

  return Math.min(100, Math.max(0, score))
}

// ─────────────────────────────────────────────────────────────────────────────
// 市场质量聚合函数
// ─────────────────────────────────────────────────────────────────────────────

function computeMarketQuality(
  scene: ScriptSegmentDto,
  marketProfile: MarketProfileDto,
  protagonistName: string,
  antagonistName: string
): MarketQualitySignal {
  const isMale = marketProfile.audienceLane === 'male'

  if (isMale) {
    const statusReversal = computeMaleStatusReversalScore(scene, protagonistName)
    const powerProgression = computeMalePowerProgressionScore(scene, protagonistName)
    const hiddenCard = computeMaleHiddenCardScore(scene, protagonistName)
    const publicPayoff = computeMalePublicPayoffScore(scene, protagonistName, antagonistName)
    const villainHierarchy = computeMaleVillainHierarchyScore(scene, antagonistName)

    const dimensions: MarketQualityDimension[] = [
      {
        id: 'statusReversal',
        label: '逆袭/身份反转',
        score: statusReversal.score,
        evidence: statusReversal.evidence,
        repairHint: statusReversal.repairHint
      },
      {
        id: 'powerProgression',
        label: '实力/资源增长',
        score: powerProgression.score,
        evidence: powerProgression.evidence,
        repairHint: powerProgression.repairHint
      },
      {
        id: 'hiddenCard',
        label: '底牌具体可见',
        score: hiddenCard.score,
        evidence: hiddenCard.evidence,
        repairHint: hiddenCard.repairHint
      },
      {
        id: 'publicPayoff',
        label: '打脸当场兑现',
        score: publicPayoff.score,
        evidence: publicPayoff.evidence,
        repairHint: publicPayoff.repairHint
      },
      {
        id: 'villainHierarchy',
        label: '反派层级递进',
        score: villainHierarchy.score,
        evidence: villainHierarchy.evidence,
        repairHint: villainHierarchy.repairHint
      }
    ]

    const avgScore = Math.round(
      dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
    )

    return {
      audienceLane: 'male',
      subgenre: marketProfile.subgenre,
      score: avgScore,
      dimensions
    }
  }

  const emotionalIdentification = computeFemaleEmotionalIdentificationScore(scene, protagonistName)
  const relationshipTension = computeFemaleRelationshipTensionScore(scene, protagonistName)
  const powerBorrowing = computeFemalePowerBorrowingScore(scene, protagonistName)
  const supportingPowerReveal = computeFemaleSupportingPowerRevealScore(scene, protagonistName)
  const femaleGrowth = computeFemaleGrowthScore(scene, protagonistName)

  const dimensions: MarketQualityDimension[] = [
    {
      id: 'emotionalIdentification',
      label: '情绪代入',
      score: emotionalIdentification.score,
      evidence: emotionalIdentification.evidence,
      repairHint: emotionalIdentification.repairHint
    },
    {
      id: 'relationshipTension',
      label: '关系拉扯',
      score: relationshipTension.score,
      evidence: relationshipTension.evidence,
      repairHint: relationshipTension.repairHint
    },
    {
      id: 'powerBorrowing',
      label: '权力借用',
      score: powerBorrowing.score,
      evidence: powerBorrowing.evidence,
      repairHint: powerBorrowing.repairHint
    },
    {
      id: 'supportingPowerReveal',
      label: '高权力者撑腰',
      score: supportingPowerReveal.score,
      evidence: supportingPowerReveal.evidence,
      repairHint: supportingPowerReveal.repairHint
    },
    {
      id: 'femaleGrowth',
      label: '女主成长',
      score: femaleGrowth.score,
      evidence: femaleGrowth.evidence,
      repairHint: femaleGrowth.repairHint
    }
  ]

  const avgScore = Math.round(
    dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length
  )

  return {
    audienceLane: 'female',
    subgenre: marketProfile.subgenre,
    score: avgScore,
    dimensions
  }
}

/**
 * 单集内容质量检测。
 * 综合循环、人物弧线、主题锚定、情节新鲜度、商业传播力、垂类市场质量、信息密度、剧本格式。
 */
export function inspectContentQualityEpisode(
  scene: ScriptSegmentDto,
  options?: {
    sellingPremise?: string
    themeText?: string
    protagonistName?: string
    supportingName?: string
    antagonistName?: string
    previousScenes?: ScriptSegmentDto[]
    previousCharacterArcs?: CharacterArcSnapshot[]
    /** 本集的压迫手段类型（来自 EpisodeControlCard） */
    pressureType?: string
    /** 前几集的压迫手段历史 */
    tacticHistory?: TacticCategory[]
    /** 垂类市场定位（男频/女频），不存在时不检测市场质量 */
    marketProfile?: MarketProfileDto | null
    /** MarketPlaybook，不存在时不检测对齐度 */
    playbook?: MarketPlaybookDto | null
    /** story state snapshot，用于连续性质检 */
    snapshot?: StoryStateSnapshotDto | null
  }
): ContentQualitySignal {
  const {
    protagonistName = '黎明',
    supportingName = '小柔',
    antagonistName = '李柯',
    previousScenes = [],
    previousCharacterArcs = [],
    themeText,
    pressureType,
    tacticHistory = [],
    marketProfile,
    playbook,
    snapshot
  } = options || {}

  const loops = detectLoopsInEpisode(scene)
  const realLoops = loops.filter((l) => l.isRealLoop)

  const themeAnchoringScore = computeThemeAnchoring(scene, protagonistName, themeText)
  const plotNoveltyScore = computePlotNovelty(scene, previousScenes)
  const dramaticTurnScore = computeDramaticTurnScore(scene)
  const sceneEngineScore = computeSceneEngineScore(scene)
  const characterFunctionScore = computeCharacterFunctionScore(
    scene,
    protagonistName,
    supportingName,
    antagonistName
  )

  // 商业传播力5项检测
  const openingShockScore = computeOpeningShockScore(scene)
  const hookRetentionScore = computeHookRetentionScore(scene)
  const punchlineDensityScore = computePunchlineDensityScore(scene)
  const villainOppressionQualityScore = computeVillainOppressionQualityScore(scene, antagonistName)
  const catharsisPayoffScore = computeCatharsisPayoffScore(scene, protagonistName)

  // 通用增强检测
  const informationDensityScore = computeInformationDensityScore(scene)
  const screenplayFormatScore = computeScreenplayFormatScore(scene)

  // 故事连续性质检（snapshot 驱动）
  const storyContinuityScore = snapshot
    ? inspectStoryContinuityAgainstSnapshot({ snapshot, scene }).score
    : 100

  // 垂类市场质量检测
  let marketQuality: MarketQualitySignal | undefined
  if (marketProfile) {
    marketQuality = computeMarketQuality(scene, marketProfile, protagonistName, antagonistName)
  }

  // MarketPlaybook 对齐度观测（不进入 overallScore，不触发修稿）
  const playbookAlignment = inspectPlaybookAlignment({
    text: normalize(scene.screenplay),
    playbook
  })
  const playbookAlignmentScore = playbookAlignment?.score

  // 人物弧线检测
  const characterNames = [protagonistName, supportingName, antagonistName]
  const characterArcs: CharacterArcSnapshot[] = []
  const arcMap = new Map(previousCharacterArcs.map((a) => [a.characterName, a.status]))

  for (const name of characterNames) {
    const prevStatus = arcMap.get(name)
    const arc = computeCharacterArcProgress(scene, name, prevStatus)
    characterArcs.push(arc)
  }

  // 窝囊检测
  const weaknessDetection = detectProtagonistWeakness(scene, protagonistName)

  // 打法轮换检测
  const currentCategory = mapPressureTypeToCategory(pressureType)
  const tacticRotationResult = validateTacticRotation(currentCategory, tacticHistory)

  // 计算总分（各项加权平均）
  const loopPenalty = realLoops.length * 15
  const loopWeight = 0.15

  const stalledOrRegressed = characterArcs.filter(
    (a) => a.status === 'stagnant' || a.status === 'regressed'
  ).length
  const arcScore = Math.max(0, 100 - stalledOrRegressed * 20)

  // 窝囊严重度扣分
  const weaknessPenalty = weaknessDetection.hasForbiddenBehavior
    ? weaknessDetection.severity * 10
    : 0
  // 打法轮换违规扣分
  const tacticPenalty = tacticRotationResult.isDuplicate ? 10 : 0

  // 商业传播力加权纳入总分（权重各10%）
  const commercialScore = Math.round(
    (openingShockScore +
      hookRetentionScore +
      punchlineDensityScore +
      villainOppressionQualityScore +
      catharsisPayoffScore) /
      5
  )

  let overallScore: number
  if (marketQuality) {
    overallScore = Math.max(
      0,
      Math.round(
        themeAnchoringScore * 0.12 +
          plotNoveltyScore * 0.12 +
          dramaticTurnScore * 0.12 +
          sceneEngineScore * 0.12 +
          ((arcScore + characterFunctionScore) / 2) * 0.12 +
          commercialScore * 0.15 +
          informationDensityScore * 0.05 +
          screenplayFormatScore * 0.05 +
          storyContinuityScore * 0.05 +
          marketQuality.score * 0.10 -
          loopPenalty * loopWeight -
          weaknessPenalty -
          tacticPenalty
      )
    )
  } else {
    overallScore = Math.max(
      0,
      Math.round(
        themeAnchoringScore * 0.15 +
          plotNoveltyScore * 0.15 +
          dramaticTurnScore * 0.15 +
          sceneEngineScore * 0.15 +
          ((arcScore + characterFunctionScore) / 2) * 0.15 +
          commercialScore * 0.22 +
          storyContinuityScore * 0.03 -
          loopPenalty * loopWeight -
          weaknessPenalty -
          tacticPenalty
      )
    )
  }

  // 生成返修推荐
  const repairRecommendations: ContentRepairRecommendation[] = []

  if (
    realLoops.length > 0 ||
    plotNoveltyScore < 55 ||
    dramaticTurnScore < 55 ||
    sceneEngineScore < 55
  ) {
    repairRecommendations.push({
      type: 'episode_engine',
      priority: realLoops.length >= 2 || dramaticTurnScore < 45 ? 'high' : 'medium',
      reason:
        realLoops.length > 0
          ? `检测到 ${realLoops.length} 个真实循环模式，且本集推进不足，需要打破重复并让局面真的变化`
          : `本集更像原地说话，缺少新推进/结果落地（推进${dramaticTurnScore}，场次引擎${sceneEngineScore}）`,
      targetCharacters: [...new Set(realLoops.map((l) => l.patternLabel))]
    })
  }

  const stalledArcs = characterArcs.filter(
    (a) => a.status === 'stagnant' || a.status === 'regressed'
  )
  if (stalledArcs.length > 0 || characterFunctionScore < 60) {
    repairRecommendations.push({
      type: 'arc_control',
      priority: stalledArcs.length >= 2 || characterFunctionScore < 45 ? 'high' : 'medium',
      reason:
        stalledArcs.length > 0
          ? `${stalledArcs.map((a) => a.characterName).join('、')} 的弧线停滞/退化，而且角色戏剧功能不够明确`
          : `主角选择、对手施压、配角杠杆这三件事不够清楚（功能分 ${characterFunctionScore}）`,
      targetCharacters:
        stalledArcs.length > 0
          ? stalledArcs.map((a) => a.characterName)
          : [protagonistName, supportingName, antagonistName]
    })
  }

  // 窝囊行为返修推荐
  if (weaknessDetection.hasForbiddenBehavior) {
    const behaviorLabels = weaknessDetection.behaviorTypes
      .map((t) => {
        switch (t) {
          case 'kneeling':
            return '下跪'
          case 'begging':
            return '求饶'
          case 'freeze':
            return '呆住无反应'
          case 'empty_threat':
            return '空头威胁'
          case 'excessive_apology':
            return '过度道歉'
        }
      })
      .join('、')
    repairRecommendations.push({
      type: 'arc_control',
      priority: weaknessDetection.severity >= 2 ? 'high' : 'medium',
      reason: `检测到主角窝囊行为：${behaviorLabels}，必须重写为装弱反击或直接反击`,
      targetCharacters: [protagonistName]
    })
  }

  // 打法轮换违规返修推荐
  if (tacticRotationResult.isDuplicate) {
    const suggestion = tacticRotationResult.suggestion
    const suggested = suggestion ? `（建议换成${TACTIC_CATEGORY_LABELS[suggestion]}）` : ''
    repairRecommendations.push({
      type: 'episode_engine',
      priority: 'medium',
      reason: `本集压迫手段与上一集重复${suggested}，需要换一种打法推进`,
      targetCharacters: [antagonistName]
    })
  }

  if (themeAnchoringScore < 60) {
    repairRecommendations.push({
      type: 'emotion_lane',
      priority: 'medium',
      reason: `情绪/主题锚定分数 ${themeAnchoringScore}，低于60分阈值，当前核心情绪没有稳定落地`
    })
  }

  // 商业传播力返修推荐
  if (openingShockScore < 50) {
    repairRecommendations.push({
      type: 'episode_engine',
      priority: 'medium',
      reason: `开局冲击分 ${openingShockScore}，前5行缺少高损失/高羞辱/高危险/高反转事件，建议重写第一场`
    })
  }
  if (hookRetentionScore < 50) {
    repairRecommendations.push({
      type: 'episode_engine',
      priority: 'medium',
      reason: `集尾留客分 ${hookRetentionScore}，集尾未停在新危机压到眼前的瞬间，建议重写最后3-5行`
    })
  }
  if (punchlineDensityScore < 40) {
    repairRecommendations.push({
      type: 'emotion_lane',
      priority: 'medium',
      reason: `金句密度分 ${punchlineDensityScore}，缺少15字以内短钉子句或金句未绑定具体物件`
    })
  }
  if (villainOppressionQualityScore < 50) {
    repairRecommendations.push({
      type: 'arc_control',
      priority: 'medium',
      reason: `反派压迫质量分 ${villainOppressionQualityScore}，反派只靠吼叫/辱骂/无脑栽赃，建议改为规则/权位/利益/布局压迫`
    })
  }
  if (catharsisPayoffScore < 50) {
    repairRecommendations.push({
      type: 'episode_engine',
      priority: 'high',
      reason: `爽点兑现分 ${catharsisPayoffScore}，爽点不完整：缺少主角反击/反派实质损失/旁观者反应之一`
    })
  }
  if (informationDensityScore < 50) {
    repairRecommendations.push({
      type: 'episode_engine',
      priority: 'medium',
      reason: `信息密度分 ${informationDensityScore}，缺少冲突载体/道具载体/潜台词/动作情绪节拍四要素之一`
    })
  }
  if (screenplayFormatScore < 50) {
    repairRecommendations.push({
      type: 'episode_engine',
      priority: 'medium',
      reason: `剧本格式分 ${screenplayFormatScore}，存在格式问题（双引号对白/小说旁白/缺少场景标题等）`
    })
  }
  if (storyContinuityScore < 60) {
    repairRecommendations.push({
      type: 'episode_engine',
      priority: storyContinuityScore < 40 ? 'high' : 'medium',
      reason: `故事连续性分 ${storyContinuityScore}，检测到穿帮/状态不一致/钩子未接续/硬约束违反`
    })
  }
  if (marketQuality) {
    for (const dim of marketQuality.dimensions) {
      if (dim.score < 50) {
        repairRecommendations.push({
          type:
            dim.id === 'emotionalIdentification' || dim.id === 'femaleGrowth'
              ? 'arc_control'
              : 'episode_engine',
          priority: dim.score < 30 ? 'high' : 'medium',
          reason: `【${marketQuality.audienceLane === 'male' ? '男频' : '女频'}】${dim.label}分 ${dim.score}，${dim.repairHint}`,
          targetCharacters: [protagonistName]
        })
      }
    }
  }

  return {
    sceneNo: scene.sceneNo || null,
    loops,
    characterArcs,
    themeAnchoringScore,
    plotNoveltyScore,
    dramaticTurnScore,
    sceneEngineScore,
    characterFunctionScore,
    weaknessDetection,
    tacticRotation: {
      currentCategory,
      isDuplicate: tacticRotationResult.isDuplicate,
      suggestedCategory: tacticRotationResult.suggestion ?? undefined
    },
    openingShockScore,
    hookRetentionScore,
    punchlineDensityScore,
    villainOppressionQualityScore,
    catharsisPayoffScore,
    informationDensityScore,
    screenplayFormatScore,
    storyContinuityScore,
    marketQuality,
    playbookAlignmentScore,
    overallScore,
    repairRecommendations
  }
}

/**
 * 批量内容质量检测。
 */
export function inspectContentQualityBatch(
  scenes: ScriptSegmentDto[],
  options?: {
    sellingPremise?: string
    protagonistName?: string
    supportingName?: string
    antagonistName?: string
    marketProfile?: MarketProfileDto | null
    playbook?: MarketPlaybookDto | null
    snapshots?: StoryStateSnapshotDto[]
  }
): BatchContentQualityReport {
  const previousScenes: ScriptSegmentDto[] = []
  const previousCharacterArcs: CharacterArcSnapshot[] = []
  const tacticHistory: TacticCategory[] = []
  const episodes: ContentQualitySignal[] = []

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i]
    // 从 episode 控制卡或剧本中提取 pressureType（如果可用）
    const pressureType =
      ('pressureType' in scene
        ? String((scene as Record<string, unknown>).pressureType)
        : undefined) || undefined
    const currentCategory = mapPressureTypeToCategory(pressureType)

    const signal = inspectContentQualityEpisode(scene, {
      sellingPremise: options?.sellingPremise,
      protagonistName: options?.protagonistName,
      supportingName: options?.supportingName,
      antagonistName: options?.antagonistName,
      previousScenes,
      previousCharacterArcs,
      pressureType,
      tacticHistory,
      marketProfile: options?.marketProfile,
      playbook: options?.playbook,
      snapshot: options?.snapshots?.[i] ?? null
    })
    episodes.push(signal)

    // 累积上下文
    previousScenes.push(scene)
    // 累积角色弧线状态（取最新）
    for (const arc of signal.characterArcs) {
      const existing = previousCharacterArcs.find((a) => a.characterName === arc.characterName)
      if (existing) {
        existing.status = arc.status
        existing.description = arc.description
        existing.evidence = arc.evidence
      } else {
        previousCharacterArcs.push({ ...arc })
      }
    }

    // 累积打法历史
    if (currentCategory) {
      tacticHistory.push(currentCategory)
    }
  }

  const episodesNeedingRepair = episodes.filter((e) => e.repairRecommendations.length > 0).length

  const loopProblemSummary = {
    totalLoops: episodes.reduce((sum, e) => sum + e.loops.filter((l) => l.isRealLoop).length, 0),
    byPattern: {} as Record<string, number>
  }

  for (const episode of episodes) {
    for (const loop of episode.loops.filter((l) => l.isRealLoop)) {
      loopProblemSummary.byPattern[loop.patternLabel] =
        (loopProblemSummary.byPattern[loop.patternLabel] || 0) + 1
    }
  }

  const validEpisodes = episodes.filter((e) => e.themeAnchoringScore > 0 || e.plotNoveltyScore > 0)
  const averageThemeAnchoringScore =
    validEpisodes.length > 0
      ? Math.round(
          validEpisodes.reduce((sum, e) => sum + e.themeAnchoringScore, 0) / validEpisodes.length
        )
      : 0
  const averagePlotNoveltyScore =
    validEpisodes.length > 0
      ? Math.round(
          validEpisodes.reduce((sum, e) => sum + e.plotNoveltyScore, 0) / validEpisodes.length
        )
      : 0
  const averageOpeningShockScore =
    validEpisodes.length > 0
      ? Math.round(
          validEpisodes.reduce((sum, e) => sum + e.openingShockScore, 0) / validEpisodes.length
        )
      : 0
  const averagePunchlineDensityScore =
    validEpisodes.length > 0
      ? Math.round(
          validEpisodes.reduce((sum, e) => sum + e.punchlineDensityScore, 0) / validEpisodes.length
        )
      : 0
  const averageCatharsisPayoffScore =
    validEpisodes.length > 0
      ? Math.round(
          validEpisodes.reduce((sum, e) => sum + e.catharsisPayoffScore, 0) / validEpisodes.length
        )
      : 0
  const averageVillainOppressionQualityScore =
    validEpisodes.length > 0
      ? Math.round(
          validEpisodes.reduce((sum, e) => sum + e.villainOppressionQualityScore, 0) /
            validEpisodes.length
        )
      : 0
  const averageHookRetentionScore =
    validEpisodes.length > 0
      ? Math.round(
          validEpisodes.reduce((sum, e) => sum + e.hookRetentionScore, 0) / validEpisodes.length
        )
      : 0
  const averageInformationDensityScore =
    validEpisodes.length > 0
      ? Math.round(
          validEpisodes.reduce((sum, e) => sum + e.informationDensityScore, 0) / validEpisodes.length
        )
      : 0
  const averageScreenplayFormatScore =
    validEpisodes.length > 0
      ? Math.round(
          validEpisodes.reduce((sum, e) => sum + e.screenplayFormatScore, 0) / validEpisodes.length
        )
      : 0
  const averageStoryContinuityScore =
    validEpisodes.length > 0
      ? Math.round(
          validEpisodes.reduce((sum, e) => sum + e.storyContinuityScore, 0) / validEpisodes.length
        )
      : 0
  const episodesWithMarketQuality = validEpisodes.filter((e) => e.marketQuality != null)
  const averageMarketQualityScore =
    episodesWithMarketQuality.length > 0
      ? Math.round(
          episodesWithMarketQuality.reduce((sum, e) => sum + (e.marketQuality?.score ?? 0), 0) /
            episodesWithMarketQuality.length
        )
      : undefined
  const episodesWithPlaybookAlignment = validEpisodes.filter((e) => e.playbookAlignmentScore != null)
  const averagePlaybookAlignmentScore =
    episodesWithPlaybookAlignment.length > 0
      ? Math.round(
          episodesWithPlaybookAlignment.reduce(
            (sum, e) => sum + (e.playbookAlignmentScore ?? 0),
            0
          ) / episodesWithPlaybookAlignment.length
        )
      : undefined

  return {
    episodeCount: episodes.length,
    episodes,
    episodesNeedingRepair,
    averageThemeAnchoringScore,
    averagePlotNoveltyScore,
    averageOpeningShockScore,
    averagePunchlineDensityScore,
    averageCatharsisPayoffScore,
    averageVillainOppressionQualityScore,
    averageHookRetentionScore,
    averageInformationDensityScore,
    averageScreenplayFormatScore,
    averageStoryContinuityScore,
    averageMarketQualityScore,
    averagePlaybookAlignmentScore,
    loopProblemSummary
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 结构化修稿信号生成
// ─────────────────────────────────────────────────────────────────────────────

const REPAIR_THRESHOLD = 50

/**
 * 把 content quality signal 转成结构化修稿信号列表。
 * 低分项包括：商业传播力5项、信息密度、剧本格式、垂类市场维度（如有）。
 * 排序：high severity 优先，同 severity 低分优先，上限 5 条。
 */
export function buildContentRepairSignals(
  signal: ContentQualitySignal,
  marketProfile?: MarketProfileDto | null
): ContentRepairSignal[] {
  const signals: ContentRepairSignal[] = []

  // 商业传播力5项
  if (signal.openingShockScore < REPAIR_THRESHOLD) {
    signals.push({
      id: 'openingShock',
      severity: 'high',
      score: signal.openingShockScore,
      title: '开局冲击不足',
      diagnosis: `开局冲击分 ${signal.openingShockScore}，前5行缺少高损失/高羞辱/高危险/高反转事件`,
      repairInstruction: '重写第一场前3-5行，让高损失/高羞辱/高危险/高反转事件立刻发生，不准先铺背景。',
      evidence: []
    })
  }

  if (signal.hookRetentionScore < REPAIR_THRESHOLD) {
    signals.push({
      id: 'hookRetention',
      severity: 'high',
      score: signal.hookRetentionScore,
      title: '集尾留客不足',
      diagnosis: `集尾留客分 ${signal.hookRetentionScore}，集尾未停在新危机压到眼前的瞬间`,
      repairInstruction: '重写最后3-5行，让新危机压到眼前的瞬间，最后一句台词扎心（≤15字为佳）。',
      evidence: []
    })
  }

  if (signal.punchlineDensityScore < REPAIR_THRESHOLD - 10) {
    signals.push({
      id: 'punchlineDensity',
      severity: 'medium',
      score: signal.punchlineDensityScore,
      title: '金句密度不足',
      diagnosis: `金句密度分 ${signal.punchlineDensityScore}，缺少15字以内短钉子句或金句未绑定具体物件`,
      repairInstruction: '在反转点附近补一句15字以内短钉子句，必须绑定当前身份/道具/证据/规则。',
      evidence: []
    })
  }

  if (signal.villainOppressionQualityScore < REPAIR_THRESHOLD) {
    signals.push({
      id: 'villainOppression',
      severity: 'high',
      score: signal.villainOppressionQualityScore,
      title: '反派压迫不足',
      diagnosis: `反派压迫质量分 ${signal.villainOppressionQualityScore}，反派只靠吼叫/辱骂/无脑栽赃`,
      repairInstruction: '把反派的吼叫/辱骂改成规则压迫/权位压迫/利益分化/借刀杀人，用具体手段施压。',
      evidence: []
    })
  }

  if (signal.catharsisPayoffScore < REPAIR_THRESHOLD) {
    signals.push({
      id: 'catharsisPayoff',
      severity: 'high',
      score: signal.catharsisPayoffScore,
      title: '爽点兑现不足',
      diagnosis: `爽点兑现分 ${signal.catharsisPayoffScore}，爽点不完整：缺少主角反击/反派实质损失/旁观者反应之一`,
      repairInstruction: '补全爽点三步：①主角打出底牌反击 ②反派写出实质性身体溃败 ③旁观者震惊反应。',
      evidence: []
    })
  }

  // 信息密度
  if (signal.informationDensityScore < REPAIR_THRESHOLD) {
    signals.push({
      id: 'informationDensity',
      severity: 'medium',
      score: signal.informationDensityScore,
      title: '信息密度低',
      diagnosis: `信息密度分 ${signal.informationDensityScore}，缺少冲突载体/道具载体/潜台词/动作情绪节拍四要素之一`,
      repairInstruction: '删除大段解释，把关键信息改成冲突场景、道具对象、潜台词和动作情绪来呈现。',
      evidence: []
    })
  }

  // 剧本格式
  if (signal.screenplayFormatScore < REPAIR_THRESHOLD) {
    signals.push({
      id: 'screenplayFormat',
      severity: 'medium',
      score: signal.screenplayFormatScore,
      title: '剧本格式不规范',
      diagnosis: `剧本格式分 ${signal.screenplayFormatScore}，存在双引号对白/小说旁白/缺少场景标题等格式问题`,
      repairInstruction: '修正为可拍摄剧本格式：场景标题清楚，地点具体，日夜/内外明确，动作行写可见动作，台词不用双引号，不写小说式旁白。',
      evidence: []
    })
  }

  // 故事连续性
  if (signal.storyContinuityScore < REPAIR_THRESHOLD) {
    signals.push({
      id: 'storyContinuity',
      severity: signal.storyContinuityScore < 30 ? 'high' : 'medium',
      score: signal.storyContinuityScore,
      title: '故事连续性穿帮',
      diagnosis: `故事连续性分 ${signal.storyContinuityScore}，检测到人物状态不一致/道具丢失/钩子未接续/硬约束违反`,
      repairInstruction: '对照故事状态快照检查：①主角/反派目标是否落地 ②道具状态是否一致 ③上一集钩子是否接续 ④硬约束是否被违反。',
      evidence: []
    })
  }

  // 垂类市场质量维度
  if (signal.marketQuality && marketProfile) {
    const isMale = marketProfile.audienceLane === 'male'

    for (const dim of signal.marketQuality.dimensions) {
      if (dim.score >= REPAIR_THRESHOLD) continue

      signals.push({
        id: dim.id,
        severity: dim.score < 30 ? 'high' : 'medium',
        score: dim.score,
        title: isMale ? getMaleTitle(dim.id) : getFemaleTitle(dim.id),
        diagnosis: dim.evidence.length > 0
          ? `【${isMale ? '男频' : '女频'}】${dim.label}分 ${dim.score}，${dim.evidence.slice(0, 2).join('；')}`
          : `【${isMale ? '男频' : '女频'}】${dim.label}分 ${dim.score}，检测到不足`,
        repairInstruction: dim.repairHint,
        evidence: dim.evidence
      })
    }
  }

  // 排序：high severity 优先，同 severity 低分优先
  signals.sort((a, b) => {
    const sevOrder = { high: 0, medium: 1 }
    const sevDiff = sevOrder[a.severity] - sevOrder[b.severity]
    if (sevDiff !== 0) return sevDiff
    return a.score - b.score
  })

  return signals.slice(0, 5)
}

function getMaleTitle(id: string): string {
  const titles: Record<string, string> = {
    statusReversal: '逆袭/身份反转不足',
    powerProgression: '升级推进不足',
    hiddenCard: '底牌不具体',
    publicPayoff: '打脸不够当场兑现',
    villainHierarchy: '反派层级无递进'
  }
  return titles[id] || '垂类质量不足'
}

function getFemaleTitle(id: string): string {
  const titles: Record<string, string> = {
    emotionalIdentification: '女主情绪代入不足',
    relationshipTension: '关系拉扯不足',
    powerBorrowing: '权力借用不具体',
    supportingPowerReveal: '缺少高权力者撑腰',
    femaleGrowth: '女主缺少独立行动'
  }
  return titles[id] || '垂类质量不足'
}

export type { MarketProfileDto }
