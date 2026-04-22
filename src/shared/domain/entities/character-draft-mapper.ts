/**
 * Character Draft ↔ Master Entity Mapper
 *
 * T7 first slice (character-only): Provides stable identity mapping between
 * CharacterDraftDto and CharacterEntityDto.
 *
 * Design:
 * - `fromMasterEntity()`: Master → Draft conversion (entityStore → UI/generation)
 * - `toMasterEntity()`: Draft → Master conversion with stable ID resolution
 * - `resolveMasterEntityId()`: Name-based identity resolution when masterEntityId is absent
 *
 * This breaks the isolation of characterDrafts being name-only disconnected records.
 */

import type { CharacterDraftDto } from '../../../shared/contracts/workflow'
import type { CharacterEntityDto, ProjectEntityStoreDto } from '../../../shared/contracts/entities'

/**
 * Options for toMasterEntity conversion.
 */
export interface ToMasterEntityOptions {
  projectId: string
  entityStore: ProjectEntityStoreDto
  /**
   * When true, creates new entity if not found. Default: true
   */
  createIfNotFound?: boolean
}

/**
 * Options for fromMasterEntity conversion.
 */
export interface FromMasterEntityOptions {
  /**
   * Include full provenance in draft. Default: true
   */
  includeProvenance?: boolean
}

/**
 * Normalize a name for comparison (trim + lowercase for matching).
 */
function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

/**
 * Find existing CharacterEntityDto by name or alias in entityStore.
 * Returns null if not found.
 */
export function findCharacterEntityByName(
  entityStore: ProjectEntityStoreDto,
  name: string
): CharacterEntityDto | null {
  const normalized = normalizeName(name)
  if (!normalized) return null

  return (
    entityStore.characters.find(
      (entity) =>
        normalizeName(entity.name) === normalized ||
        entity.aliases.some((alias) => normalizeName(alias) === normalized)
    ) || null
  )
}

/**
 * Resolve stable master entity ID from a character draft.
 *
 * Priority:
 * 1. If draft.masterEntityId is set and exists in entityStore, use it
 * 2. Otherwise, resolve by name matching in entityStore
 * 3. Return null if no match found
 */
export function resolveMasterEntityId(
  draft: CharacterDraftDto,
  entityStore: ProjectEntityStoreDto
): string | null {
  // If masterEntityId is set, verify it exists
  if (draft.masterEntityId) {
    const exists = entityStore.characters.some((e) => e.id === draft.masterEntityId)
    if (exists) {
      return draft.masterEntityId
    }
    // masterEntityId set but not found — fall through to name resolution
  }

  // Resolve by name matching
  const matched = findCharacterEntityByName(entityStore, draft.name)
  return matched?.id ?? null
}

/**
 * Convert a CharacterEntityDto (master) to a CharacterDraftDto.
 *
 * Used when loading from entityStore for UI display or generation consumption.
 */
export function fromMasterEntity(
  entity: CharacterEntityDto,
  _options?: FromMasterEntityOptions
): CharacterDraftDto {
  void _options
  return {
    masterEntityId: entity.id,
    name: entity.name,
    biography: entity.summary, // Map entity.summary to draft.biography
    publicMask: '', // Not in entity
    hiddenPressure: entity.pressures.join('\n'), // Join pressures to string
    fear: '',
    protectTarget: '',
    conflictTrigger: '',
    advantage: '',
    weakness: '',
    goal: entity.goals.join('\n'), // Join goals to string
    arc: '',
    roleLayer: entity.roleLayer === 'functional' ? 'active' : entity.roleLayer, // Normalize functional → active
    activeBlockNos: [] // Not tracked in entity
  }
}

/**
 * Convert a CharacterDraftDto to a CharacterEntityDto (master).
 *
 * Uses stable identity resolution:
 * - If draft.masterEntityId exists and matches, update that entity
 * - Otherwise, find by name and update that entity
 * - If createIfNotFound=true and no match, create new entity
 *
 * This ensures character drafts can be mapped back to stable master entities
 * rather than creating duplicate entities on each save.
 */
export function toMasterEntity(
  draft: CharacterDraftDto,
  options: ToMasterEntityOptions
): CharacterEntityDto {
  const { projectId, entityStore, createIfNotFound = true } = options

  const resolvedId = resolveMasterEntityId(draft, entityStore)

  if (resolvedId) {
    // Update existing entity
    const existing = entityStore.characters.find((e) => e.id === resolvedId)
    if (existing) {
      return updateMasterEntityFromDraft(existing, draft, projectId)
    }
  }

  // Not found — check if we should create
  if (!createIfNotFound) {
    // Return a temporary entity with generated ID but flag as unsaved
    return createMasterEntityFromDraft(draft, projectId, `unsaved_${Date.now().toString(36)}`)
  }

  // Create new entity with stable ID based on name
  const newId = `char_${projectId}_${normalizeName(draft.name).replace(/\s+/g, '_')}_${Date.now().toString(36)}`
  return createMasterEntityFromDraft(draft, projectId, newId)
}

/**
 * Update an existing CharacterEntityDto with values from a CharacterDraftDto.
 * Preserves the existing id and provenance origin fields.
 */
function updateMasterEntityFromDraft(
  entity: CharacterEntityDto,
  draft: CharacterDraftDto,
  _projectId: string
): CharacterEntityDto {
  void _projectId
  const now = new Date().toISOString()

  return {
    ...entity,
    name: draft.name.trim() || entity.name,
    aliases: entity.aliases, // Aliases not in draft, preserve existing
    summary: draft.biography.trim() || entity.summary,
    tags: entity.tags, // Tags not in draft, preserve existing
    roleLayer: draft.roleLayer === 'active' ? 'active' : draft.roleLayer || entity.roleLayer,
    goals: splitMultiline(draft.goal),
    pressures: splitMultiline(draft.hiddenPressure),
    linkedFactionIds: entity.linkedFactionIds, // Relations not in draft
    linkedLocationIds: entity.linkedLocationIds,
    linkedItemIds: entity.linkedItemIds,
    provenance: {
      ...entity.provenance,
      updatedAt: now
    }
  }
}

/**
 * Create a new CharacterEntityDto from a CharacterDraftDto.
 */
function createMasterEntityFromDraft(
  draft: CharacterDraftDto,
  projectId: string,
  id: string
): CharacterEntityDto {
  const now = new Date().toISOString()

  return {
    id,
    projectId,
    type: 'character',
    name: draft.name.trim(),
    aliases: [],
    summary: draft.biography.trim(),
    tags: [],
    roleLayer: draft.roleLayer === 'active' ? 'active' : draft.roleLayer || 'core',
    goals: splitMultiline(draft.goal),
    pressures: splitMultiline(draft.hiddenPressure),
    linkedFactionIds: [],
    linkedLocationIds: [],
    linkedItemIds: [],
    provenance: {
      provenanceTier: 'user_declared',
      originAuthorityType: 'user_declared',
      originDeclaredBy: 'user',
      sourceStage: 'character',
      sourceRef: id,
      createdAt: now,
      updatedAt: now
    }
  }
}

/**
 * Split a multiline string into an array, filtering empty lines.
 */
function splitMultiline(value: string): string[] {
  if (!value) return []
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

/**
 * Convert an array of CharacterDraftDto to an array of CharacterEntityDto.
 *
 * Uses stable identity resolution for each draft, preserving existing entities
 * where possible rather than creating duplicates.
 */
export function draftsToMasterEntities(
  drafts: CharacterDraftDto[],
  options: ToMasterEntityOptions
): CharacterEntityDto[] {
  return drafts.map((draft) => toMasterEntity(draft, options))
}

/**
 * Convert an array of CharacterEntityDto to an array of CharacterDraftDto.
 */
export function masterEntitiesToDrafts(
  entities: CharacterEntityDto[],
  _options?: FromMasterEntityOptions
): CharacterDraftDto[] {
  return entities.map((entity) => fromMasterEntity(entity, _options))
}
