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
import { detectProtagonistWeakness, type WeaknessDetectionResult } from './screenplay-weakness-detection.ts'
import {
  TACTIC_CATEGORY_LABELS,
  type TacticCategory,
  mapPressureTypeToCategory,
  validateTacticRotation
} from './screenplay-tactic-rotation.ts'

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
  return String(text || '').replace(/\r\n/g, '\n').trim()
}

function getScreenplayLines(scene: ScriptSegmentDto): string[] {
  const screenplay = normalize(scene.screenplay)
  return screenplay.split('\n').map((l) => l.trim()).filter(Boolean)
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
function detectLoopsInScreenplay(
  screenplay: string,
  sceneNo: number | null
): LoopDetection[] {
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

  const genericChoiceKeywords = ['决定', '选择', '放弃', '退让', '让出', '不追', '不抢', '压住', '收手', '不打开', '交给他', '先忍', '先退', '暂不', '不揭穿', '不翻脸', '藏住']
  const costKeywords = ['代价', '失去', '受伤', '挨打', '被逼', '牺牲', '冒险', '顶上去', '换伤', '扛住', '硬吃', '流血', '暴露']
  const consequenceKeywords = ['于是', '结果', '因此', '当场', '随即', '立刻', '逼得', '换来', '反而', '却让', '局面', '转成']
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
  const protagonistChoiceLine = protagonistLines.find((line) => hasAnyKeyword(line, genericChoiceKeywords)) || ''
  const protagonistCostLine = protagonistLines.find((line) => hasAnyKeyword(line, costKeywords)) || ''
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
  const resultMarkers = ['落下', '被打开', '被杀', '被抓', '被发现', '被毁', '崩塌', '弯折', '撕裂', '渗血', '燃起', '熄灭']
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

  const turnKeywords = ['突然', '却', '反手', '转身', '发现', '原来', '改口', '当场', '逼得', '拦住', '夺包', '翻出', '截住', '压回去']
  const decisionKeywords = ['决定', '选择', '放弃', '交出', '抢回', '揭开', '念出', '答应', '拒绝', '不给', '先退', '先忍', '不揭穿']
  const resultKeywords = ['落下', '被抓', '被打开', '撕裂', '渗血', '撞开', '带走', '押走', '点燃', '炸开', '夺走', '翻出', '卡住', '断裂', '扑空', '落进', '散开']
  const weakEndingKeywords = ['看见', '望向', '盯着', '准备', '打算', '似乎', '仿佛', '像是', '将要']

  const lastLines = lines.slice(-6)
  let score = 25
  score += Math.min(30, countKeywordHits(lines, turnKeywords) * 10)
  score += Math.min(25, countKeywordHits(lines, decisionKeywords) * 8)
  score += Math.min(35, countKeywordHits(lastLines, resultKeywords) * 14)
  if (countKeywordHits(lastLines, resultKeywords) === 0 && countKeywordHits(lastLines, weakEndingKeywords) > 0) {
    score = Math.max(0, score - 20)
  }

  return Math.min(100, score)
}

export function computeSceneEngineScore(scene: ScriptSegmentDto): number {
  const screenplayScenes = scene.screenplayScenes || []
  if (screenplayScenes.length === 0) return 40

  const obstacleKeywords = ['拦', '逼', '搜', '追', '抢', '压', '威胁', '阻', '踹', '挡', '逼近']
  const resultKeywords = ['于是', '结果', '当场', '随即', '立刻', '带走', '打开', '撞开', '发现', '落下', '扔出', '夺包', '断裂', '扑空', '翻出', '卡住']
  const choiceKeywords = ['决定', '选择', '放弃', '答应', '拒绝', '交出', '转身', '冲上去', '退后', '先藏起来', '不给', '先忍', '暂不', '不揭穿']

  let total = 0
  for (const item of screenplayScenes) {
    const lines = normalize(item.body).split('\n').map((line) => line.trim()).filter(Boolean)
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

  const choiceKeywords = ['决定', '选择', '交出', '拒绝', '放弃', '抢回', '念出', '答应', '先忍', '先退', '不揭穿', '不给']
  const leverageKeywords = ['账册', '线索', '契书', '钥匙', '药', '藏', '递给', '提醒', '拖住', '掩护', '挡住', '塞进', '喊出去']
  const pressureKeywords = ['逼', '搜', '抢', '压', '威胁', '带走', '封', '烧', '踹', '押', '撞开', '追', '围住']
  const consequenceKeywords = ['当场', '结果', '于是', '随即', '立刻', '扑空', '断裂', '翻出', '卡住', '退了半步']

  let score = 0
  if (
    protagonistLines.length > 0 &&
    countKeywordHits(protagonistLines, choiceKeywords) > 0 &&
    countKeywordHits(lines, consequenceKeywords) > 0
  ) score += 40
  else if (protagonistLines.length > 0 && countKeywordHits(protagonistLines, choiceKeywords) > 0) score += 25
  else if (protagonistLines.length > 0) score += 15

  if (supportingLines.length > 0 && countKeywordHits(supportingLines, leverageKeywords) > 0) score += 30
  else if (supportingLines.length > 0) score += 5

  if (antagonistLines.length > 0 && countKeywordHits(antagonistLines, pressureKeywords) > 0) score += 35
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
  const changeKeywords = ['决定', '选择', '交出', '拒绝', '冲上', '拦住', '抢回', '念出', '护住', '转身', '终于', '开始']
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

/**
 * 单集内容质量检测。
 * 综合循环、人物弧线、主题锚定、情节新鲜度。
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
    tacticHistory = []
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
  const weaknessPenalty = weaknessDetection.hasForbiddenBehavior ? weaknessDetection.severity * 10 : 0
  // 打法轮换违规扣分
  const tacticPenalty = tacticRotationResult.isDuplicate ? 10 : 0

  const overallScore = Math.max(
    0,
    Math.round(
      themeAnchoringScore * 0.2 +
      plotNoveltyScore * 0.2 +
      dramaticTurnScore * 0.2 +
      sceneEngineScore * 0.2 +
      ((arcScore + characterFunctionScore) / 2) * 0.2 -
      loopPenalty * loopWeight -
      weaknessPenalty -
      tacticPenalty
    )
  )

  // 生成返修推荐
  const repairRecommendations: ContentRepairRecommendation[] = []

  if (realLoops.length > 0 || plotNoveltyScore < 55 || dramaticTurnScore < 55 || sceneEngineScore < 55) {
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
    const behaviorLabels = weaknessDetection.behaviorTypes.map((t) => {
      switch (t) {
        case 'kneeling': return '下跪'
        case 'begging': return '求饶'
        case 'freeze': return '呆住无反应'
        case 'empty_threat': return '空头威胁'
        case 'excessive_apology': return '过度道歉'
      }
    }).join('、')
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
    const suggested = suggestion
      ? `（建议换成${TACTIC_CATEGORY_LABELS[suggestion]}）`
      : ''
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
  }
): BatchContentQualityReport {
  const previousScenes: ScriptSegmentDto[] = []
  const previousCharacterArcs: CharacterArcSnapshot[] = []
  const tacticHistory: TacticCategory[] = []
  const episodes: ContentQualitySignal[] = []

  for (const scene of scenes) {
    // 从 episode 控制卡或剧本中提取 pressureType（如果可用）
    const pressureType = ('pressureType' in scene ? String((scene as Record<string, unknown>).pressureType) : undefined) || undefined
    const currentCategory = mapPressureTypeToCategory(pressureType)

    const signal = inspectContentQualityEpisode(scene, {
      sellingPremise: options?.sellingPremise,
      protagonistName: options?.protagonistName,
      supportingName: options?.supportingName,
      antagonistName: options?.antagonistName,
      previousScenes,
      previousCharacterArcs,
      pressureType,
      tacticHistory
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

  return {
    episodeCount: episodes.length,
    episodes,
    episodesNeedingRepair,
    averageThemeAnchoringScore,
    averagePlotNoveltyScore,
    loopProblemSummary
  }
}
