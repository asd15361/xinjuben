/**
 * src/shared/domain/script/screenplay-weakness-detection.ts
 *
 * 主角窝囊自动检测模块。
 *
 * 检测 5 类禁忌行为，区分装弱（战略忍让）与真弱（窝囊），
 * 将结果供 arc-control-agent 和 ContentQualitySignal 使用。
 */

import type { ScriptSegmentDto } from '../../contracts/workflow.ts'

// ─────────────────────────────────────────────────────────────────────────────
// 窝囊行为类型
// ─────────────────────────────────────────────────────────────────────────────

/** 窝囊行为分类 */
export type WeaknessBehaviorType =
  | 'kneeling'
  | 'begging'
  | 'freeze'
  | 'empty_threat'
  | 'excessive_apology'

/** 单条窝囊行为检测记录 */
export interface WeaknessBehaviorRecord {
  type: WeaknessBehaviorType
  /** 命中的行索引 */
  lineIndex: number
  /** 命中的原文 */
  lineText: string
  /** 是否为装弱（战略忍让） */
  isStrategic: boolean
}

/** 窝囊检测总结果 */
export interface WeaknessDetectionResult {
  /** 是否检测到任何禁忌行为（排除装弱后） */
  hasForbiddenBehavior: boolean
  /** 检测到的所有行为记录 */
  behaviors: WeaknessBehaviorRecord[]
  /** 行为类型汇总（去重） */
  behaviorTypes: WeaknessBehaviorType[]
  /** 是否整体判定为装弱（如所有行为都是战略性的） */
  isStrategic: boolean
  /** 证据文本（精简到最多 5 条） */
  evidence: string[]
  /** 窝囊严重度：0=无, 1=轻微, 2=中等, 3=严重 */
  severity: number
}

// ─────────────────────────────────────────────────────────────────────────────
// 窝囊行为关键词库
// ─────────────────────────────────────────────────────────────────────────────

const KNEELING_KEYWORDS = ['下跪', '跪下', '磕头', '跪地', '扑通跪', '双膝跪']
const BEGGING_KEYWORDS = ['求你', '求饶', '饶命', '放过我', '饶了我', '我错了，求', '别杀我', '求你别']
const FREEZE_KEYWORDS = ['愣住', '发呆', '呆立', '沉默不语', '站在原地', '不知所措', '无话可说']
const EMPTY_THREAT_KEYWORDS = ['你等着', '走着瞧', '我会回来', '以后你', '你迟早']
const APOLOGY_KEYWORDS = ['对不起', '抱歉', '我的错', '是我不对', '我认错', '我赔罪']

/** 装弱上下文关键词：出现在同一行或相邻 3 行内，说明是战略忍让 */
const STRATEGIC_CONTEXT_KEYWORDS = [
  '故意', '假装', '实则', '暗中', '后手', '诱敌', '藏', '取',
  '反咬', '借机', '趁机', '趁机拿', '实则已', '实则把', '其实已',
  '眼里闪过', '嘴角微', '袖中', '指尖', '低头的瞬间', '假意'
]

// ─────────────────────────────────────────────────────────────────────────────────────
// 内部辅助函数
// ─────────────────────────────────────────────────────────────────────────────

function normalize(text: string | undefined): string {
  return String(text || '').replace(/\r\n/g, '\n').trim()
}

function getScreenplayLines(scene: ScriptSegmentDto): string[] {
  const screenplay = normalize(scene.screenplay)
  return screenplay.split('\n').map((l) => l.trim()).filter(Boolean)
}

/** 判断某行落点前后是否存在装弱上下文 */
function hasStrategicContext(lines: string[], lineIndex: number): boolean {
  const start = Math.max(0, lineIndex - 1)
  const end = Math.min(lines.length - 1, lineIndex + 1)
  for (let i = start; i <= end; i++) {
    if (STRATEGIC_CONTEXT_KEYWORDS.some((kw) => lines[i].includes(kw))) {
      return true
    }
  }
  return false
}

/** 检测某类窝囊行为 */
function detectBehaviorType(
  lines: string[],
  protagonistName: string,
  keywords: string[],
  type: WeaknessBehaviorType
): WeaknessBehaviorRecord[] {
  const records: WeaknessBehaviorRecord[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // 只检测包含主角名的行，或检测任意行（全局语境）
    const isProtagonistLine = line.includes(protagonistName)
    const hasKeyword = keywords.some((kw) => line.includes(kw))
    if (!hasKeyword) continue
    // 下跪/求饶必须涉及主角才标记，其他类型可以更宽松
    if ((type === 'kneeling' || type === 'begging') && !isProtagonistLine) continue

    const isStrategic = hasStrategicContext(lines, i)
    records.push({
      type,
      lineIndex: i,
      lineText: line,
      isStrategic
    })
  }
  return records
}

// ─────────────────────────────────────────────────────────────────────────────
// 公开函数
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 检测剧本中主角的窝囊行为。
 *
 * 区分装弱（战略忍让，允许）与真弱（窝囊，禁止）。
 * 返回所有检测到的行为及相关信息。
 */
export function detectProtagonistWeakness(
  scene: ScriptSegmentDto,
  protagonistName: string = '黎明'
): WeaknessDetectionResult {
  const lines = getScreenplayLines(scene)
  if (lines.length === 0) {
    return {
      hasForbiddenBehavior: false,
      behaviors: [],
      behaviorTypes: [],
      isStrategic: false,
      evidence: [],
      severity: 0
    }
  }

  const allBehaviors: WeaknessBehaviorRecord[] = [
    ...detectBehaviorType(lines, protagonistName, KNEELING_KEYWORDS, 'kneeling'),
    ...detectBehaviorType(lines, protagonistName, BEGGING_KEYWORDS, 'begging'),
    ...detectBehaviorType(lines, protagonistName, FREEZE_KEYWORDS, 'freeze'),
    ...detectBehaviorType(lines, protagonistName, EMPTY_THREAT_KEYWORDS, 'empty_threat'),
    ...detectBehaviorType(lines, protagonistName, APOLOGY_KEYWORDS, 'excessive_apology')
  ]

  // 过滤掉装弱行为，只保留真弱
  const forbiddenBehaviors = allBehaviors.filter((b) => !b.isStrategic)
  const behaviorTypes = [...new Set(forbiddenBehaviors.map((b) => b.type))]
  const hasForbidden = forbiddenBehaviors.length > 0

  // 判断整体是否为装弱：所有行为都是战略性的
  const isStrategic = allBehaviors.length > 0 && allBehaviors.every((b) => b.isStrategic)

  // 严重度计算
  let severity = 0
  if (hasForbidden) {
    severity = Math.min(3, forbiddenBehaviors.length)
    // 下跪和求饶最严重
    if (behaviorTypes.includes('kneeling')) severity = Math.max(severity, 2)
    if (behaviorTypes.includes('begging')) severity = Math.max(severity, 2)
    // 多种类型叠加更严重
    if (behaviorTypes.length >= 3) severity = Math.max(severity, 3)
  }

  // 证据文本（最多 5 条，优先真弱行为）
  const evidence = forbiddenBehaviors
    .slice(0, 5)
    .map((b) => b.lineText)

  return {
    hasForbiddenBehavior: hasForbidden,
    behaviors: allBehaviors,
    behaviorTypes,
    isStrategic,
    evidence,
    severity
  }
}