/**
 * src/shared/domain/market-playbook/create-draft-from-samples.ts
 *
 * P5: 从样本文本启发式提取 MarketPlaybook 草案。
 * 第一版不调用 AI，只做关键词信号提取。
 */

import type {
  MarketPlaybookDraftDto,
  MarketPlaybookSourceSampleDto,
  MarketPatternDto,
  MarketPatternType,
  AudienceLane
} from '../../contracts/market-playbook.ts'

// ============================================================
// 常量
// ============================================================

const MAX_SAMPLE_LENGTH = 500_000
const MIN_SAMPLE_LENGTH = 100
const MAX_SAMPLES = 20

// ============================================================
// 关键词词典
// ============================================================

interface PatternKeywordRule {
  type: MarketPatternType
  name: string
  keywords: string[]
  minHits: number
  description: string
}

const PATTERN_KEYWORD_RULES: PatternKeywordRule[] = [
  {
    type: 'opening_pressure',
    name: '开局压迫',
    keywords: [
      '羞辱', '嘲笑', '退婚', '废灵根', '废物', '看不起', '被抛弃',
      '替身', '替代品', '被利用', '当众', '众人面前', '跪下', '道歉',
      '被赶出', '逐出', '被除名', '冷眼', '嘲讽', '不屑', '鄙夷'
    ],
    minHits: 2,
    description: '开局必须有公开场合的压迫/羞辱事件'
  },
  {
    type: 'villain_pressure',
    name: '反派压迫',
    keywords: [
      '暗杀', '追杀', '陷害', '栽赃', '围剿', '阴谋', '背叛',
      '出卖', '设计', '圈套', '陷阱', '毒害', '封印', '镇压',
      '通缉', '追捕', '围攻', '暗中', '密谋', '算计'
    ],
    minHits: 2,
    description: '反派势力对主角的压迫手段'
  },
  {
    type: 'payoff',
    name: '爽点兑现',
    keywords: [
      '打脸', '逆袭', '反杀', '碾压', '震慑', '震惊', '跪服',
      '臣服', '求饶', '后悔', '刮目相看', '不敢相信', '全场震惊',
      '身份暴露', '实力暴露', '底牌', '觉醒', '突破', '碾压'
    ],
    minHits: 2,
    description: '读者爽点兑现方式'
  },
  {
    type: 'hook',
    name: '钩子悬念',
    keywords: [
      '悬念', '伏笔', '秘密', '真相', '身世', '谜团', '未知',
      '隐藏', '封印', '背后', '不为人知', '另有隐情', '意想不到',
      '反转', '出乎意料', '万万没想到', '竟然是', '原来'
    ],
    minHits: 2,
    description: '钩子句与悬念设置'
  },
  {
    type: 'protagonist_action',
    name: '主角反击',
    keywords: [
      '反击', '反攻', '布局', '谋划', '隐忍', '修炼', '突破',
      '领悟', '掌握', '获得', '习得', '觉醒', '解封', '蜕变',
      '成长', '变强', '逆转', '翻盘', '以弱胜强'
    ],
    minHits: 2,
    description: '主角主动反击与成长方式'
  },
  {
    type: 'relationship_tension',
    name: '关系压迫',
    keywords: [
      '误会', '误解', '冷落', '忽视', '利用', '抛弃', '背叛',
      '不信任', '怀疑', '疏远', '冷漠', '绝交', '反目',
      '情敌', '三角', '吃醋', '争宠', '偏心', '不公'
    ],
    minHits: 2,
    description: '关系层面的压迫与张力'
  }
]

// ============================================================
// 输入校验
// ============================================================

export interface CreateDraftFromSamplesInput {
  samples: MarketPlaybookSourceSampleDto[]
  name: string
  audienceLane: AudienceLane
  subgenre: string
  sourceMonth?: string
  version?: string
}

export class SampleValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SampleValidationError'
  }
}

function validateSamples(samples: MarketPlaybookSourceSampleDto[]): void {
  if (!samples || samples.length === 0) {
    throw new SampleValidationError('至少需要一个样本文本')
  }

  if (samples.length > MAX_SAMPLES) {
    throw new SampleValidationError(`样本数量不能超过 ${MAX_SAMPLES}，当前 ${samples.length}`)
  }

  for (const sample of samples) {
    if (!sample.contentText || sample.contentText.trim().length < MIN_SAMPLE_LENGTH) {
      throw new SampleValidationError(
        `样本 "${sample.name}" 内容太短，至少需要 ${MIN_SAMPLE_LENGTH} 字符`
      )
    }

    if (sample.contentText.length > MAX_SAMPLE_LENGTH) {
      throw new SampleValidationError(
        `样本 "${sample.name}" 内容太长，超过 ${MAX_SAMPLE_LENGTH} 字符限制`
      )
    }
  }
}

// ============================================================
// 启发式提取
// ============================================================

function countKeywordHits(text: string, keywords: string[]): number {
  let hits = 0
  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      hits += 1
    }
  }
  return hits
}

function extractMatchedKeywords(text: string, keywords: string[], maxExamples: number = 3): string[] {
  const matched: string[] = []
  for (const keyword of keywords) {
    if (text.includes(keyword) && !matched.includes(keyword)) {
      matched.push(keyword)
      if (matched.length >= maxExamples) break
    }
  }
  return matched
}

function extractPatterns(combinedText: string): MarketPatternDto[] {
  const patterns: MarketPatternDto[] = []

  for (const rule of PATTERN_KEYWORD_RULES) {
    const hits = countKeywordHits(combinedText, rule.keywords)
    if (hits >= rule.minHits) {
      const examples = extractMatchedKeywords(combinedText, rule.keywords, 5)
      patterns.push({
        id: `draft-${rule.type}-${Date.now()}`,
        name: rule.name,
        type: rule.type,
        description: `${rule.description}（启发式提取，命中 ${hits} 个关键词）`,
        appliesTo: {},
        promptInstruction: rule.description,
        qualitySignal: `样本文本中出现 ${hits} 个相关关键词信号`,
        examples
      })
    }
  }

  return patterns
}

function extractAntiPatterns(combinedText: string): string[] {
  const antiPatterns: string[] = []

  const checks: [string, string][] = [
    ['主角太被动', '被动等待'],
    ['节奏拖沓', '重复啰嗦'],
    ['反派太弱', '反派太弱'],
    ['逻辑不通', '逻辑不通'],
    ['主角性格不一致', '性格前后矛盾']
  ]

  for (const [label, keyword] of checks) {
    if (combinedText.includes(keyword)) {
      antiPatterns.push(label)
    }
  }

  return antiPatterns
}

function extractPromptRules(patterns: MarketPatternDto[]): string[] {
  return patterns
    .filter((p) => p.promptInstruction)
    .map((p) => p.promptInstruction)
}

function extractQualitySignals(patterns: MarketPatternDto[]): string[] {
  return patterns
    .filter((p) => p.qualitySignal)
    .map((p) => p.qualitySignal)
}

// ============================================================
// 主函数
// ============================================================

export function createMarketPlaybookDraftFromSamples(
  input: CreateDraftFromSamplesInput
): MarketPlaybookDraftDto {
  validateSamples(input.samples)

  const combinedText = input.samples.map((s) => s.contentText).join('\n\n')
  const now = new Date().toISOString()
  const month = input.sourceMonth ?? now.slice(0, 7)
  const version = input.version ?? 'draft-1'

  const extractedPatterns = extractPatterns(combinedText)

  return {
    id: `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    sourceSampleIds: input.samples.map((s) => s.id),
    audienceLane: input.audienceLane,
    subgenre: input.subgenre,
    sourceMonth: month,
    version,
    status: 'draft',
    extractedPatterns,
    antiPatterns: extractAntiPatterns(combinedText),
    promptRules: extractPromptRules(extractedPatterns),
    qualitySignals: extractQualitySignals(extractedPatterns),
    createdAt: now,
    updatedAt: now
  }
}

// ============================================================
// 样本创建辅助
// ============================================================

export function createSourceSample(input: {
  name: string
  contentText: string
  sourceType: 'txt' | 'md' | 'manual'
  audienceLane?: AudienceLane
  subgenre?: string
}): MarketPlaybookSourceSampleDto {
  return {
    id: `sample-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name,
    contentText: input.contentText,
    sourceType: input.sourceType,
    audienceLane: input.audienceLane,
    subgenre: input.subgenre,
    importedAt: new Date().toISOString()
  }
}
