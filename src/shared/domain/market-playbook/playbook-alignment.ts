/**
 * src/shared/domain/market-playbook/playbook-alignment.ts
 *
 * MarketPlaybook 对齐度观察（P9）。
 *
 * 只做观测，不做裁判。回答的问题是：
 * "这集内容有没有体现当前项目锁定打法包里的市场打法？"
 *
 * 不能回答："这集是不是好剧本？"
 * 好剧本由稳定质量指标、用户设定、七问、剧本骨架和人工样本判断共同决定。
 *
 * 【安全边界】
 * - 不进入 overallScore
 * - 不进入 marketQualityScore
 * - 不触发修稿信号
 * - 只是可观测的辅助字段
 */

import type { MarketPlaybookDto } from '../../contracts/market-playbook.ts'

// ============================================================
// 常量
// ============================================================

/** 对齐度检测最多取前 6 条 patterns，和 Prompt 注入一致 */
const MAX_ALIGNMENT_PATTERNS = 6

// ============================================================
// 类型
// ============================================================

export interface PlaybookAlignmentResult {
  playbookId: string
  version: string
  sourceMonth: string
  score: number
  matchedSignals: string[]
  missingSignals: string[]
  notes: string[]
}

// ============================================================
// 核心函数
// ============================================================

/**
 * 从 qualitySignal 文本中提取用于匹配的关键词片段。
 *
 * qualitySignal 是一句描述性文本，例如：
 * "读者在前3集必须感受到"这人被冤枉了/被看扁了"的愤怒感"
 *
 * 提取策略：按常见分隔符拆分，取长度 >= 2 的片段作为匹配关键词。
 */
function extractMatchKeywords(qualitySignal: string): string[] {
  const keywords: string[] = []

  // 按中文标点和常见分隔符拆分
  const segments = qualitySignal
    .split(/[，。；：！？、""''（）\s]+/)
    .map((s) => s.trim())
    .filter((s) => s.length >= 2)

  keywords.push(...segments)

  // 额外提取引号内的关键短语
  const quotedMatches = qualitySignal.match(/"([^"]+)"|「([^」]+)」|『([^』]+)』/g)
  if (quotedMatches) {
    for (const match of quotedMatches) {
      const cleaned = match.replace(/[""「」『』]/g, '').trim()
      if (cleaned.length >= 2) {
        keywords.push(cleaned)
      }
    }
  }

  // 去重
  return [...new Set(keywords)]
}

/**
 * 检测文本是否命中某个 qualitySignal 的关键词。
 * 只要命中任意一个关键词片段就算匹配。
 */
function matchesSignal(text: string, qualitySignal: string): boolean {
  const keywords = extractMatchKeywords(qualitySignal)
  if (keywords.length === 0) return false
  return keywords.some((keyword) => text.includes(keyword))
}

/**
 * 观测剧本内容与 MarketPlaybook 的对齐度。
 *
 * - playbook 为空 -> null
 * - patterns 为空 -> null
 * - 每个 pattern 的 qualitySignal 转成关键词/短句
 * - 文本命中 -> matchedSignals
 * - 文本未命中 -> missingSignals
 * - score = matched / total * 100
 * - 最多取前 6 条 patterns
 */
export function inspectPlaybookAlignment(input: {
  text: string
  playbook: MarketPlaybookDto | null | undefined
}): PlaybookAlignmentResult | null {
  const { text, playbook } = input

  if (!playbook) return null
  if (!playbook.patterns || playbook.patterns.length === 0) return null

  const patterns = playbook.patterns.slice(0, MAX_ALIGNMENT_PATTERNS)
  const matchedSignals: string[] = []
  const missingSignals: string[] = []
  const notes: string[] = []

  for (const pattern of patterns) {
    if (!pattern.qualitySignal || pattern.qualitySignal.trim().length === 0) {
      notes.push(`pattern "${pattern.name}" 无 qualitySignal，跳过`)
      continue
    }

    const matched = matchesSignal(text, pattern.qualitySignal)
    if (matched) {
      matchedSignals.push(pattern.qualitySignal)
    } else {
      missingSignals.push(pattern.qualitySignal)
    }
  }

  const total = matchedSignals.length + missingSignals.length
  if (total === 0) {
    notes.push('所有 patterns 均无有效 qualitySignal')
    return {
      playbookId: playbook.id,
      version: playbook.version,
      sourceMonth: playbook.sourceMonth,
      score: 0,
      matchedSignals,
      missingSignals,
      notes
    }
  }

  const score = Math.round((matchedSignals.length / total) * 100)

  return {
    playbookId: playbook.id,
    version: playbook.version,
    sourceMonth: playbook.sourceMonth,
    score,
    matchedSignals,
    missingSignals,
    notes
  }
}
