/**
 * src/shared/contracts/market-playbook.ts
 *
 * 市场打法包合同。
 *
 * 【架构位置】
 * A Stable Writing Kernel：稳定内核，不随市场变（viral-short-drama-policy.ts）
 * B Market Playbook：市场打法包，每月可变（本文件）
 * C Project Intent：项目自身设定，用户输入决定
 *
 * P3 只做 B 的合同和读取，不接 Prompt，不接质量检测。
 */

export type MarketPlaybookStatus = 'draft' | 'active' | 'archived'

export type MarketPatternType =
  | 'opening_pressure'
  | 'payoff'
  | 'hook'
  | 'villain_pressure'
  | 'protagonist_action'
  | 'relationship_tension'
  | 'prop_usage'
  | 'dialogue_style'

export type AudienceLane = 'male' | 'female'

export interface MarketPatternDto {
  id: string
  name: string
  type: MarketPatternType
  description: string
  appliesTo: {
    audienceLane?: AudienceLane
    subgenre?: string
  }
  promptInstruction: string
  qualitySignal: string
  examples: string[]
}

export interface MarketPlaybookExampleDto {
  label: string
  summary: string
  extractedPattern: string
}

export interface MarketPlaybookDto {
  id: string
  name: string
  audienceLane: AudienceLane
  subgenre: string
  sourceMonth: string
  version: string
  status: MarketPlaybookStatus
  summary: string
  patterns: MarketPatternDto[]
  antiPatterns: string[]
  promptRules: string[]
  qualitySignals: string[]
  examples?: MarketPlaybookExampleDto[]
  createdAt: string
  updatedAt: string
}

/**
 * 项目级打法包选择（持久化到项目 metadata）。
 *
 * 原则：市场可以变，项目不能漂。
 * - auto_latest：项目还没锁定，首次生成时选最新 active
 * - locked：项目已锁定，后续永远使用 selectedPlaybookId
 * - manual：用户手动指定某个版本
 */
export interface MarketPlaybookSelectionDto {
  selectedPlaybookId: string | null
  selectionMode: 'auto_latest' | 'locked' | 'manual'
  lockedAt?: string
  selectedVersion?: string
  selectedSourceMonth?: string
}

// ============================================================
// P5: 样本导入与草案结构
// ============================================================

export interface MarketPlaybookSourceSampleDto {
  id: string
  name: string
  contentText: string
  sourceType: 'txt' | 'md' | 'manual'
  audienceLane?: AudienceLane
  subgenre?: string
  importedAt: string
}

export interface MarketPlaybookDraftDto {
  id: string
  name: string
  sourceSampleIds: string[]
  audienceLane: AudienceLane
  subgenre: string
  sourceMonth: string
  version: string
  status: 'draft'
  extractedPatterns: MarketPatternDto[]
  antiPatterns: string[]
  promptRules: string[]
  qualitySignals: string[]
  reviewNotes?: string[]
  createdAt: string
  updatedAt: string
}

export interface SaveActiveMarketPlaybookInputDto {
  playbook: MarketPlaybookDto
}

export interface SaveActiveMarketPlaybookResultDto {
  playbook: MarketPlaybookDto
  selection: MarketPlaybookSelectionDto
}

export interface ListMarketPlaybooksResultDto {
  playbooks: MarketPlaybookDto[]
}
