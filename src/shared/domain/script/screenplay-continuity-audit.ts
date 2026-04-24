/**
 * 剧本连续性质检：用 StoryStateSnapshot 检测穿帮/ discontinuity。
 *
 * 纯函数，不依赖外部状态，只比對 snapshot 和剧本正文。
 */

import type { StoryStateSnapshotDto } from '../../contracts/story-state'
import type { ScriptSegmentDto } from '../../contracts/workflow'

export interface StoryContinuityIssue {
  category:
    | 'character_state'
    | 'prop_continuity'
    | 'hook_continuation'
    | 'villain_progression'
    | 'hard_constraint'
  severity: 'high' | 'medium' | 'low'
  detail: string
  evidence: string[]
}

export interface StoryContinuityAuditResult {
  /** 0-100，100=无连续性错误 */
  score: number
  issues: StoryContinuityIssue[]
  /** 各分类摘要 */
  categorySummary: Record<string, { count: number; topIssue: string }>
}

const HIGH_PENALTY = 20
const MEDIUM_PENALTY = 10
const LOW_PENALTY = 5

function normalize(text: string | undefined): string {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

/**
 * 从搜索词生成可匹配的子串列表。
 * 对中文（无空格分隔）生成 bigram；对已有空格/标点的按原样拆分。
 */
function extractSearchTokens(text: string): string[] {
  const normalized = normalize(text)
  if (!normalized) return []

  // 先按常规分隔符拆分
  const parts = normalized.split(/[,，\s]+/).filter((w) => w.length >= 2)

  const tokens: string[] = []
  for (const part of parts) {
    tokens.push(part)
    // 如果该部分全是 CJK 字符且无空格，补充 bigram
    if (/^[一-鿿]+$/.test(part) && part.length >= 3) {
      for (let i = 0; i < part.length - 1; i++) {
        tokens.push(part.slice(i, i + 2))
      }
    }
  }

  return [...new Set(tokens)]
}

function hasAnyToken(screenplay: string, tokens: string[]): boolean {
  return tokens.some((t) => screenplay.includes(t))
}

function getScreenplayText(scene: ScriptSegmentDto): string {
  return normalize(scene.screenplay)
}

/**
 * 1. 人物状态连续性
 * 检查主角/反派的 snapshot 状态是否在剧本中有体现。
 * 启发式：主角名字 + 状态关键词（目标/情绪）是否出现在台词或动作中。
 */
function checkCharacterStateContinuity(
  snapshot: StoryStateSnapshotDto,
  screenplay: string
): StoryContinuityIssue[] {
  const issues: StoryContinuityIssue[] = []

  // 主角状态
  const protagonistGoal = normalize(snapshot.protagonistState.statusSummary)
  const protagonistEmotion = normalize(snapshot.protagonistState.emotionalArc)
  if (protagonistGoal && protagonistGoal !== '待补') {
    const goalTokens = extractSearchTokens(protagonistGoal)
    if (goalTokens.length > 0 && !hasAnyToken(screenplay, goalTokens)) {
      issues.push({
        category: 'character_state',
        severity: 'medium',
        detail: `主角状态「${protagonistGoal}」在剧本中无体现`,
        evidence: [protagonistGoal]
      })
    }
  }
  if (protagonistEmotion && protagonistEmotion !== '待补') {
    const emotionKeywords = ['怒', '恨', '悲', '惧', '喜', '爽', '绝望', '兴奋', '冷', '热']
    const hasEmotion = emotionKeywords.some((kw) => screenplay.includes(kw))
    if (!hasEmotion) {
      issues.push({
        category: 'character_state',
        severity: 'low',
        detail: `主角情绪线「${protagonistEmotion}」在剧本中无明显情绪词`,
        evidence: [protagonistEmotion]
      })
    }
  }

  // 反派状态
  const antagonistGoal = normalize(snapshot.antagonistState.currentGoal)
  const antagonistThreat = normalize(snapshot.antagonistState.threatLevel)
  if (antagonistGoal && antagonistGoal !== '待补') {
    const goalTokens = extractSearchTokens(antagonistGoal)
    if (goalTokens.length > 0 && !hasAnyToken(screenplay, goalTokens)) {
      issues.push({
        category: 'character_state',
        severity: 'medium',
        detail: `反派目标「${antagonistGoal}」在剧本中无体现`,
        evidence: [antagonistGoal]
      })
    }
  }
  if (antagonistThreat && antagonistThreat !== '待补' && antagonistThreat !== '无') {
    const threatKeywords = ['压', '逼', '困', '围', '堵', '杀', '罚', '禁', '囚']
    const hasThreat = threatKeywords.some((kw) => screenplay.includes(kw))
    if (!hasThreat) {
      issues.push({
        category: 'character_state',
        severity: 'low',
        detail: `反派威胁等级「${antagonistThreat}」在剧本中无压迫感体现`,
        evidence: [antagonistThreat]
      })
    }
  }

  return issues
}

/**
 * 2. 道具连续性
 * snapshot 中的 activeProps 必须在剧本中出现，且状态一致。
 */
function checkRequiredPropContinuity(
  snapshot: StoryStateSnapshotDto,
  screenplay: string
): StoryContinuityIssue[] {
  const issues: StoryContinuityIssue[] = []

  for (const prop of snapshot.activeProps) {
    const propName = normalize(prop.name)
    if (!propName) continue

    if (!screenplay.includes(propName)) {
      issues.push({
        category: 'prop_continuity',
        severity: 'high',
        detail: `道具「${propName}」在当前集剧本中未出现，状态为「${prop.status}」`,
        evidence: [propName]
      })
      continue
    }

    // 简单状态校验：lost 的道具不应被"使用"，used 后不应再 held
    if (prop.status === 'lost') {
      const usagePatterns = ['使用', '用', '拿出', '掏出', '举起', '挥动']
      const hasUsage = usagePatterns.some((p) => {
        // 在道具名附近 20 字内查找使用动词
        const idx = screenplay.indexOf(propName)
        if (idx < 0) return false
        const nearby = screenplay.slice(Math.max(0, idx - 20), idx + propName.length + 20)
        return nearby.includes(p)
      })
      if (hasUsage) {
        issues.push({
          category: 'prop_continuity',
          severity: 'high',
          detail: `道具「${propName}」状态为「已丢失」，但剧本中仍在使用`,
          evidence: [propName]
        })
      }
    }
  }

  return issues
}

/**
 * 3. 钩子接续
 * snapshot 中的 unresolvedHooks 应该在本集中被回应或推进。
 */
function checkHookContinuation(
  snapshot: StoryStateSnapshotDto,
  screenplay: string
): StoryContinuityIssue[] {
  const issues: StoryContinuityIssue[] = []

  for (const hook of snapshot.unresolvedHooks) {
    const hookText = normalize(hook)
    if (!hookText) continue

    // 提取钩子核心词（去掉泛词）
    const stopWords = new Set(['钩子', '悬念', '未解', '待解', '上', '一', '集', '的', '了', '被'])
    const tokens = hookText
      .split(/[,，\s]+/)
      .filter((w) => w.length >= 2 && !stopWords.has(w))

    // 优先检查完整 token 命中
    let hasContinuation = tokens.some((kw) => screenplay.includes(kw))

    // 如果无完整命中，检查 2-gram 重叠率（对中文更友好）
    if (!hasContinuation && tokens.length > 0) {
      const allTokens = tokens.join('')
      const bigrams: string[] = []
      for (let i = 0; i < allTokens.length - 1; i++) {
        bigrams.push(allTokens.slice(i, i + 2))
      }
      const hits = bigrams.filter((bg) => screenplay.includes(bg)).length
      // 超过 30% 的 2-gram 命中视为有接续
      hasContinuation = bigrams.length > 0 && hits / bigrams.length >= 0.3
    }

    if (!hasContinuation) {
      issues.push({
        category: 'hook_continuation',
        severity: 'high',
        detail: `上一集钩子「${hookText}」在本集无接续`,
        evidence: [hookText]
      })
    }
  }

  return issues
}

/**
 * 4. 反派推进
 * 反派不应原地踏步；剧本应体现威胁升级或手段变化。
 */
function checkVillainProgressionContinuity(
  snapshot: StoryStateSnapshotDto,
  screenplay: string
): StoryContinuityIssue[] {
  const issues: StoryContinuityIssue[] = []

  const threatLevel = normalize(snapshot.antagonistState.threatLevel)
  if (!threatLevel || threatLevel === '待补') return issues

  // 威胁等级映射到期望的压迫手段关键词
  const threatKeywords: Record<string, string[]> = {
    高压: ['压', '逼', '围', '困', '封锁', '禁'],
    极压: ['杀', '灭', '毁', '断', '绝'],
    潜伏: ['暗中', '悄悄', '不露', '背后'],
    试探: ['试探', '观察', '摸底', '接触']
  }

  const expectedKeywords =
    Object.entries(threatKeywords).find(([key]) => threatLevel.includes(key))?.[1] || []

  if (expectedKeywords.length > 0) {
    const hasExpectedPressure = expectedKeywords.some((kw) => screenplay.includes(kw))
    if (!hasExpectedPressure) {
      issues.push({
        category: 'villain_progression',
        severity: 'medium',
        detail: `反派威胁等级「${threatLevel}」但剧本未体现对应压迫手段`,
        evidence: [threatLevel, expectedKeywords.join('/')]
      })
    }
  }

  return issues
}

/**
 * 5. 硬约束违反
 * snapshot 中的 continuityConstraints 是"不可违背"的事实/规则。
 */
function checkHardConstraintViolations(
  snapshot: StoryStateSnapshotDto,
  screenplay: string
): StoryContinuityIssue[] {
  const issues: StoryContinuityIssue[] = []

  for (const constraint of snapshot.continuityConstraints) {
    const constraintText = normalize(constraint)
    if (!constraintText) continue

    // 约束通常是"某角色已死""某物已毁"这类否定事实
    // 检测方式：如果约束说"已死"，但剧本中出现"活着""醒来""说话"等，即违反
    const negationIndicators = ['已死', '死亡', '被杀', '销毁', '毁灭', '废除', '禁止', '不能']
    const affirmationIndicators = ['活着', '醒来', '说话', '使用', '出现', '到场', '行动']

    const hasNegation = negationIndicators.some((n) => constraintText.includes(n))
    if (!hasNegation) continue

    // 提取主体：约束中去掉否定词后的第一个实词
    let subject = constraintText
    for (const ni of negationIndicators) {
      subject = subject.replace(ni, '')
    }
    subject = subject.replace(/[，,\s]+/g, '').trim()
    if (subject.length < 1) continue

    const violationMarkers = affirmationIndicators.filter((a) => screenplay.includes(a))
    // 只有在主体也出现在剧本中时才判断违反
    if (screenplay.includes(subject) && violationMarkers.length > 0) {
      issues.push({
        category: 'hard_constraint',
        severity: 'high',
        detail: `硬约束违反：「${constraintText}」——剧本中该主体仍表现出被禁止的状态`,
        evidence: [constraintText, violationMarkers.join(', ')]
      })
    }
  }

  return issues
}

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────────────────────

export interface InspectStoryContinuityInput {
  snapshot: StoryStateSnapshotDto
  scene: ScriptSegmentDto
}

/**
 * 主入口：用 story state snapshot 检测单集剧本的连续性问题。
 * 返回 score（0-100）和 issue 列表。
 */
export function inspectStoryContinuityAgainstSnapshot(
  input: InspectStoryContinuityInput
): StoryContinuityAuditResult {
  const { snapshot, scene } = input
  const screenplay = getScreenplayText(scene)

  if (!screenplay || screenplay.length < 10) {
    return {
      score: 0,
      issues: [
        {
          category: 'hard_constraint',
          severity: 'high',
          detail: '剧本正文为空或太短，无法检测连续性',
          evidence: []
        }
      ],
      categorySummary: { hard_constraint: { count: 1, topIssue: '剧本为空' } }
    }
  }

  const allIssues: StoryContinuityIssue[] = [
    ...checkCharacterStateContinuity(snapshot, screenplay),
    ...checkRequiredPropContinuity(snapshot, screenplay),
    ...checkHookContinuation(snapshot, screenplay),
    ...checkVillainProgressionContinuity(snapshot, screenplay),
    ...checkHardConstraintViolations(snapshot, screenplay)
  ]

  // 按严重程度计算扣分
  const penalty = allIssues.reduce((sum, issue) => {
    if (issue.severity === 'high') return sum + HIGH_PENALTY
    if (issue.severity === 'medium') return sum + MEDIUM_PENALTY
    return sum + LOW_PENALTY
  }, 0)

  const score = Math.max(0, Math.min(100, 100 - penalty))

  // 分类摘要
  const categorySummary: Record<string, { count: number; topIssue: string }> = {}
  for (const issue of allIssues) {
    const cat = issue.category
    if (!categorySummary[cat]) {
      categorySummary[cat] = { count: 0, topIssue: issue.detail }
    }
    categorySummary[cat].count++
  }

  return { score, issues: allIssues, categorySummary }
}
