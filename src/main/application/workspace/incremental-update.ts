/**
 * src/main/application/workspace/incremental-update.ts
 *
 * 局部重绘工具函数。
 *
 * 核心设计：
 * 1. isLocked 标记用户确认过的节点——锁定后不会被重跑覆盖
 * 2. 按 ID 增量更新：只改用户指定改的，其他保持不动
 * 3. 重跑时把锁定节点作为"已确认事实"注入，保证新输出与旧事实对齐
 */

import type {
  FactionMatrixDto,
  FactionDto,
  FactionBranchDto,
  CharacterPlaceholderDto
} from '../../../shared/contracts/faction-matrix.ts'
import type { CharacterProfileV2Dto } from '../../../shared/contracts/character-profile-v2.ts'

// ─────────────────────────────────────────────────────────────────────────────
// FactionMatrix 增量更新
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 增量更新势力拆解表。
 * 只更新非锁定的节点，锁定节点原样保留。
 */
export function patchFactionMatrix(
  existing: FactionMatrixDto,
  patch: Partial<FactionMatrixDto>
): FactionMatrixDto {
  return {
    title: patch.title ?? existing.title,
    totalEpisodes: patch.totalEpisodes ?? existing.totalEpisodes,
    landscapeSummary: patch.landscapeSummary ?? existing.landscapeSummary,
    crossRelations: patch.crossRelations ?? existing.crossRelations,
    factionTimetable: patch.factionTimetable ?? existing.factionTimetable,
    factions: patch.factions
      ? mergeFactionLists(existing.factions, patch.factions)
      : existing.factions
  }
}

/**
 * 合并两个势力列表，以 existing 为基础，用 patch 中非锁定的项覆盖。
 * 锁定项保留 existing 的版本。
 */
function mergeFactionLists(existing: FactionDto[], patch: FactionDto[]): FactionDto[] {
  const existingMap = new Map(existing.map((f) => [f.id, f]))
  const result: FactionDto[] = []

  // 先处理 patch 中的项（按 patch 的顺序）
  for (const patchFaction of patch) {
    const existingFaction = existingMap.get(patchFaction.id)
    if (!existingFaction) {
      // 全新势力，直接加入
      result.push(patchFaction)
      continue
    }

    // 已有的势力：如果被锁定，保留旧版本
    if (existingFaction.isLocked) {
      result.push(existingFaction)
      continue
    }

    // 未锁定：合并
    result.push(mergeFaction(existingFaction, patchFaction))
    existingMap.delete(patchFaction.id)
  }

  // 再加入 existing 中 patch 未覆盖的项
  for (const [, faction] of existingMap) {
    result.push(faction)
  }

  return result
}

function mergeFaction(existing: FactionDto, patch: FactionDto): FactionDto {
  return {
    id: existing.id,
    name: patch.name ?? existing.name,
    positioning: patch.positioning ?? existing.positioning,
    coreDemand: patch.coreDemand ?? existing.coreDemand,
    coreValues: patch.coreValues ?? existing.coreValues,
    mainMethods: patch.mainMethods ?? existing.mainMethods,
    vulnerabilities: patch.vulnerabilities ?? existing.vulnerabilities,
    isLocked: patch.isLocked ?? existing.isLocked,
    branches: mergeBranchLists(existing.branches, patch.branches)
  }
}

function mergeBranchLists(
  existing: FactionBranchDto[],
  patch: FactionBranchDto[]
): FactionBranchDto[] {
  const existingMap = new Map(existing.map((b) => [b.id, b]))
  const result: FactionBranchDto[] = []

  for (const patchBranch of patch) {
    const existingBranch = existingMap.get(patchBranch.id)
    if (!existingBranch) {
      result.push(patchBranch)
      continue
    }

    if (existingBranch.isLocked) {
      result.push(existingBranch)
      continue
    }

    result.push(mergeBranch(existingBranch, patchBranch))
    existingMap.delete(patchBranch.id)
  }

  for (const [, branch] of existingMap) {
    result.push(branch)
  }

  return result
}

function mergeBranch(existing: FactionBranchDto, patch: FactionBranchDto): FactionBranchDto {
  return {
    id: existing.id,
    name: patch.name ?? existing.name,
    parentFactionId: patch.parentFactionId ?? existing.parentFactionId,
    positioning: patch.positioning ?? existing.positioning,
    coreDemand: patch.coreDemand ?? existing.coreDemand,
    isLocked: patch.isLocked ?? existing.isLocked,
    characters: mergeCharacterLists(existing.characters, patch.characters)
  }
}

function mergeCharacterLists(
  existing: CharacterPlaceholderDto[],
  patch: CharacterPlaceholderDto[]
): CharacterPlaceholderDto[] {
  const existingMap = new Map(existing.map((c) => [c.id, c]))
  const result: CharacterPlaceholderDto[] = []

  for (const patchChar of patch) {
    const existingChar = existingMap.get(patchChar.id)
    if (!existingChar) {
      result.push(patchChar)
      continue
    }

    if (existingChar.isLocked) {
      result.push(existingChar)
      continue
    }

    result.push({ ...existingChar, ...patchChar })
    existingMap.delete(patchChar.id)
  }

  for (const [, char] of existingMap) {
    result.push(char)
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// CharacterProfileV2 增量更新
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 增量更新五维人物小传列表。
 * 只更新非锁定的角色，锁定角色原样保留。
 */
export function patchCharacterProfiles(
  existing: CharacterProfileV2Dto[],
  patch: CharacterProfileV2Dto[]
): CharacterProfileV2Dto[] {
  const existingMap = new Map(existing.map((c) => [c.id, c]))
  const result: CharacterProfileV2Dto[] = []

  for (const patchChar of patch) {
    const existingChar = existingMap.get(patchChar.id)
    if (!existingChar) {
      result.push(patchChar)
      continue
    }

    if (existingChar.isLocked) {
      result.push(existingChar)
      continue
    }

    result.push({ ...existingChar, ...patchChar })
    existingMap.delete(patchChar.id)
  }

  for (const [, char] of existingMap) {
    result.push(char)
  }

  return result
}

// ─────────────────────────────────────────────────────────────────────────────
// 锁定/解锁工具
// ─────────────────────────────────────────────────────────────────────────────

/** 锁定指定 ID 的势力 */
export function lockFaction(matrix: FactionMatrixDto, factionId: string): FactionMatrixDto {
  return {
    ...matrix,
    factions: matrix.factions.map((f) => (f.id === factionId ? { ...f, isLocked: true } : f))
  }
}

/** 解锁指定 ID 的势力 */
export function unlockFaction(matrix: FactionMatrixDto, factionId: string): FactionMatrixDto {
  return {
    ...matrix,
    factions: matrix.factions.map((f) => (f.id === factionId ? { ...f, isLocked: false } : f))
  }
}

/** 锁定指定 ID 的人物 */
export function lockCharacter(
  characters: CharacterProfileV2Dto[],
  characterId: string
): CharacterProfileV2Dto[] {
  return characters.map((c) => (c.id === characterId ? { ...c, isLocked: true } : c))
}

/** 解锁指定 ID 的人物 */
export function unlockCharacter(
  characters: CharacterProfileV2Dto[],
  characterId: string
): CharacterProfileV2Dto[] {
  return characters.map((c) => (c.id === characterId ? { ...c, isLocked: false } : c))
}

// ─────────────────────────────────────────────────────────────────────────────
// 重跑上下文生成：把锁定节点序列化为"不可更改的既定事实"
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 从势力拆解表中提取所有锁定节点，生成"既定事实"文本。
 * 在局部重跑时注入 Prompt，确保 AI 不会改变用户确认过的内容。
 */
export function renderLockedFactionsAsFact(matrix: FactionMatrixDto): string {
  const lockedFactions = matrix.factions.filter((f) => f.isLocked)
  if (lockedFactions.length === 0) return ''

  const lines: string[] = []
  lines.push('【以下内容已由用户确认锁定，绝对不可修改：】')

  for (const faction of lockedFactions) {
    lines.push(
      `■ ${faction.name}（${faction.positioning}）- 诉求：${faction.coreDemand} - 价值观：${faction.coreValues}`
    )
    const lockedBranches = faction.branches.filter((b) => b.isLocked)
    for (const branch of lockedBranches) {
      lines.push(`  ├─ ${branch.name}（${branch.positioning}）- 诉求：${branch.coreDemand}`)
      const lockedChars = branch.characters.filter((c) => c.isLocked)
      for (const char of lockedChars) {
        lines.push(
          `  │  ├─ ${char.name}（${char.roleInFaction}）：${char.identity}｜动机：${char.coreMotivation}`
        )
      }
    }
  }

  return lines.join('\n')
}

/**
 * 从五维人物列表中提取锁定节点，生成"既定事实"文本。
 */
export function renderLockedCharactersAsFact(characters: CharacterProfileV2Dto[]): string {
  const locked = characters.filter((c) => c.isLocked)
  if (locked.length === 0) return ''

  const lines: string[] = []
  lines.push('【以下人物已由用户确认锁定，绝对不可修改：】')

  for (const char of locked) {
    lines.push(`■ ${char.name}｜${char.identity}｜${char.values}｜${char.plotFunction}`)
  }

  return lines.join('\n')
}
