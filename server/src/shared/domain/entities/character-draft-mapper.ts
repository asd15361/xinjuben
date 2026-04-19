import type { CharacterDraftDto } from '../../contracts/workflow'
import type { CharacterEntityDto, ProjectEntityStoreDto } from '../../contracts/entities'

export interface ToMasterEntityOptions {
  projectId: string
  entityStore: ProjectEntityStoreDto
  createIfNotFound?: boolean
}

export interface FromMasterEntityOptions {
  includeProvenance?: boolean
}

function normalizeName(name: string): string {
  return name.trim().toLowerCase()
}

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

export function resolveMasterEntityId(
  draft: CharacterDraftDto,
  entityStore: ProjectEntityStoreDto
): string | null {
  if (draft.masterEntityId) {
    const exists = entityStore.characters.some((e) => e.id === draft.masterEntityId)
    if (exists) {
      return draft.masterEntityId
    }
  }

  const matched = findCharacterEntityByName(entityStore, draft.name)
  return matched?.id ?? null
}

export function fromMasterEntity(
  entity: CharacterEntityDto,
  _options?: FromMasterEntityOptions
): CharacterDraftDto {
  return {
    masterEntityId: entity.id,
    name: entity.name,
    biography: entity.summary,
    publicMask: '',
    hiddenPressure: entity.pressures.join('\n'),
    fear: '',
    protectTarget: '',
    conflictTrigger: '',
    advantage: '',
    weakness: '',
    goal: entity.goals.join('\n'),
    arc: '',
    roleLayer: entity.roleLayer === 'functional' ? 'active' : entity.roleLayer,
    activeBlockNos: []
  }
}

export function toMasterEntity(
  draft: CharacterDraftDto,
  options: ToMasterEntityOptions
): CharacterEntityDto {
  const { projectId, entityStore, createIfNotFound = true } = options

  const resolvedId = resolveMasterEntityId(draft, entityStore)

  if (resolvedId) {
    const existing = entityStore.characters.find((e) => e.id === resolvedId)
    if (existing) {
      return updateMasterEntityFromDraft(existing, draft, projectId)
    }
  }

  if (!createIfNotFound) {
    return createMasterEntityFromDraft(draft, projectId, `unsaved_${Date.now().toString(36)}`)
  }

  const newId = `char_${projectId}_${normalizeName(draft.name).replace(/\s+/g, '_')}_${Date.now().toString(36)}`
  return createMasterEntityFromDraft(draft, projectId, newId)
}

function updateMasterEntityFromDraft(
  entity: CharacterEntityDto,
  draft: CharacterDraftDto,
  _projectId: string
): CharacterEntityDto {
  const now = new Date().toISOString()

  return {
    ...entity,
    name: draft.name.trim() || entity.name,
    aliases: entity.aliases,
    summary: draft.biography.trim() || entity.summary,
    tags: entity.tags,
    roleLayer: draft.roleLayer === 'active' ? 'active' : draft.roleLayer || entity.roleLayer,
    goals: splitMultiline(draft.goal),
    pressures: splitMultiline(draft.hiddenPressure),
    linkedFactionIds: entity.linkedFactionIds,
    linkedLocationIds: entity.linkedLocationIds,
    linkedItemIds: entity.linkedItemIds,
    provenance: {
      ...entity.provenance,
      updatedAt: now
    }
  }
}

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

function splitMultiline(value: string): string[] {
  if (!value) return []
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

export function draftsToMasterEntities(
  drafts: CharacterDraftDto[],
  options: ToMasterEntityOptions
): CharacterEntityDto[] {
  return drafts.map((draft) => toMasterEntity(draft, options))
}

export function masterEntitiesToDrafts(
  entities: CharacterEntityDto[],
  _options?: FromMasterEntityOptions
): CharacterDraftDto[] {
  return entities.map((entity) => fromMasterEntity(entity, _options))
}
