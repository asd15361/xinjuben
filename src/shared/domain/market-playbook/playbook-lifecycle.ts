/**
 * src/shared/domain/market-playbook/playbook-lifecycle.ts
 *
 * P6: MarketPlaybook 草案审核、启用、归档纯函数。
 * 状态流：draft -> active -> archived
 */

import type {
  MarketPlaybookDto,
  MarketPlaybookDraftDto,
  AudienceLane
} from '../../contracts/market-playbook.ts'
import { getActiveMarketPlaybooks } from './market-playbook-registry.ts'

// ============================================================
// 校验结果
// ============================================================

export interface PlaybookValidationResult {
  valid: boolean
  issues: string[]
}

// ============================================================
// 校验：activate 前必须通过
// ============================================================

export function validateMarketPlaybookBeforeActivation(input: {
  draft: MarketPlaybookDraftDto
  existingActivePlaybooks?: MarketPlaybookDto[]
}): PlaybookValidationResult {
  const issues: string[] = []
  const { draft } = input

  // 基础字段
  if (!draft.name || draft.name.trim().length === 0) {
    issues.push('name 不能为空')
  }

  if (!draft.audienceLane || !['male', 'female'].includes(draft.audienceLane)) {
    issues.push('audienceLane 必须为 male 或 female')
  }

  if (!draft.subgenre || draft.subgenre.trim().length === 0) {
    issues.push('subgenre 不能为空')
  }

  if (!draft.sourceMonth || !/^\d{4}-\d{2}$/.test(draft.sourceMonth)) {
    issues.push('sourceMonth 必须为 YYYY-MM 格式')
  }

  if (!draft.version || draft.version.trim().length === 0) {
    issues.push('version 不能为空')
  }

  // patterns
  if (!draft.extractedPatterns || draft.extractedPatterns.length < 3) {
    issues.push(`patterns 至少 3 个，当前 ${draft.extractedPatterns?.length ?? 0}`)
  }

  // 每个 pattern 校验
  if (draft.extractedPatterns) {
    for (let i = 0; i < draft.extractedPatterns.length; i++) {
      const p = draft.extractedPatterns[i]
      if (!p.promptInstruction || p.promptInstruction.trim().length === 0) {
        issues.push(`pattern[${i}] "${p.name ?? p.type}" 缺少 promptInstruction`)
      }
      if (!p.qualitySignal || p.qualitySignal.trim().length === 0) {
        issues.push(`pattern[${i}] "${p.name ?? p.type}" 缺少 qualitySignal`)
      }
    }
  }

  // promptRules
  if (!draft.promptRules || draft.promptRules.length < 1) {
    issues.push('promptRules 至少 1 条')
  }

  // qualitySignals
  if (!draft.qualitySignals || draft.qualitySignals.length < 1) {
    issues.push('qualitySignals 至少 1 条')
  }

  // 版本冲突
  const conflict = detectMarketPlaybookVersionConflict({
    audienceLane: draft.audienceLane,
    subgenre: draft.subgenre,
    sourceMonth: draft.sourceMonth,
    version: draft.version,
    existingActivePlaybooks: input.existingActivePlaybooks
  })

  if (conflict) {
    issues.push(
      `version_conflict: ${draft.audienceLane}/${draft.subgenre}/${draft.sourceMonth}/${draft.version} 已存在 active playbook`
    )
  }

  return { valid: issues.length === 0, issues }
}

// ============================================================
// 版本冲突检测
// ============================================================

export function detectMarketPlaybookVersionConflict(input: {
  audienceLane: AudienceLane
  subgenre: string
  sourceMonth: string
  version: string
  existingActivePlaybooks?: MarketPlaybookDto[]
}): boolean {
  const activePlaybooks =
    input.existingActivePlaybooks ?? getActiveMarketPlaybooks({ audienceLane: input.audienceLane })

  return activePlaybooks.some(
    (p) =>
      p.audienceLane === input.audienceLane &&
      p.subgenre === input.subgenre &&
      p.sourceMonth === input.sourceMonth &&
      p.version === input.version
  )
}

// ============================================================
// activate: draft -> active
// ============================================================

export function activateMarketPlaybookDraft(input: {
  draft: MarketPlaybookDraftDto
  activateAt?: string
}): MarketPlaybookDto {
  const now = input.activateAt ?? new Date().toISOString()

  return {
    id: input.draft.id,
    name: input.draft.name,
    audienceLane: input.draft.audienceLane,
    subgenre: input.draft.subgenre,
    sourceMonth: input.draft.sourceMonth,
    version: input.draft.version,
    status: 'active',
    summary: `从样本草案激活：${input.draft.name}`,
    patterns: input.draft.extractedPatterns,
    antiPatterns: input.draft.antiPatterns,
    promptRules: input.draft.promptRules,
    qualitySignals: input.draft.qualitySignals,
    examples: [],
    createdAt: input.draft.createdAt,
    updatedAt: now
  }
}

// ============================================================
// archive: active -> archived
// ============================================================

export function archiveMarketPlaybook(input: {
  playbook: MarketPlaybookDto
  archivedAt?: string
}): MarketPlaybookDto {
  const now = input.archivedAt ?? new Date().toISOString()

  return {
    ...input.playbook,
    status: 'archived',
    updatedAt: now
  }
}
