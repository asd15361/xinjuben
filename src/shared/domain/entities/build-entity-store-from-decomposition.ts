import type {
  DecompositionCharacter,
  DecompositionFaction,
  DecompositionItem,
  DecompositionLocation,
  DecompositionRelation,
  DecompositionResult
} from '../../contracts/decomposition.ts'
import type {
  BaseProjectEntityDto,
  CharacterEntityDto,
  FactionEntityDto,
  ItemEntityDto,
  LocationEntityDto,
  ProjectEntityProvenanceDto,
  ProjectEntityStoreDto,
  RelationEntityDto
} from '../../contracts/entities.ts'
import type {
  FormalFactAuthorityType,
  FormalFactDeclaredBy,
  FormalFactProvenanceTier
} from '../../contracts/formal-fact.ts'
import { normalizeEntityStore } from './entity-normalizers.ts'
import { syncFactionSeatCharacters } from './faction-seat-characters.ts'

const EMPTY_ENTITY_STORE: ProjectEntityStoreDto = {
  characters: [],
  factions: [],
  locations: [],
  items: [],
  relations: []
}

const ROLE_LAYER_PRIORITY: Record<CharacterEntityDto['roleLayer'], number> = {
  functional: 0,
  active: 1,
  core: 2
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase()
}

function hashText(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function toOriginDeclaredBy(authorityType: FormalFactAuthorityType): FormalFactDeclaredBy {
  return authorityType === 'user_declared' ? 'user' : 'system'
}

function createProvenance(input: {
  source: {
    provenanceTier: FormalFactProvenanceTier
    originAuthorityType: FormalFactAuthorityType
    sourceSection?: string
  }
  createdAt: string
}): ProjectEntityProvenanceDto {
  return {
    provenanceTier: input.source.provenanceTier,
    originAuthorityType: input.source.originAuthorityType,
    originDeclaredBy: toOriginDeclaredBy(input.source.originAuthorityType),
    sourceStage: 'chat',
    sourceRef: input.source.sourceSection,
    createdAt: input.createdAt,
    updatedAt: input.createdAt
  }
}

function createEntityId(
  prefix: 'char' | 'faction' | 'loc' | 'item' | 'rel',
  projectId: string,
  ...parts: string[]
): string {
  return `${prefix}_${projectId}_${hashText(parts.map((item) => normalizeName(item)).join('|'))}`
}

function mergeAliases(left: string[], right: string[]): string[] {
  return [...new Set([...left, ...right].map((item) => item.trim()).filter(Boolean))]
}

function mergeTags(left: string[], right: string[]): string[] {
  return [...new Set([...left, ...right].map((item) => item.trim()).filter(Boolean))]
}

function mergeIds(left: string[], right: string[]): string[] {
  return [...new Set([...left, ...right].filter(Boolean))]
}

function pickRoleLayer(
  existing: CharacterEntityDto['roleLayer'],
  incoming: CharacterEntityDto['roleLayer']
): CharacterEntityDto['roleLayer'] {
  return ROLE_LAYER_PRIORITY[incoming] > ROLE_LAYER_PRIORITY[existing] ? incoming : existing
}

function resolveCharacterRoleLayer(
  roleHint?: DecompositionCharacter['roleHint']
): CharacterEntityDto['roleLayer'] {
  switch (roleHint) {
    case 'protagonist':
    case 'antagonist':
      return 'core'
    case 'supporting':
      return 'active'
    default:
      return 'functional'
  }
}

function toFactionType(
  factionType: DecompositionFaction['factionType']
): FactionEntityDto['factionType'] {
  if (factionType === 'family') return 'clan'
  return factionType
}

function toItemType(itemType: DecompositionItem['itemType']): ItemEntityDto['itemType'] {
  return itemType === 'key' ? 'artifact' : itemType
}

function toRelationType(
  relationType: DecompositionRelation['relationType']
): RelationEntityDto['relationType'] {
  return relationType === 'ownership' ? 'other' : relationType
}

function findByName<T extends BaseProjectEntityDto>(
  entities: T[],
  name: string
): T | undefined {
  const normalized = normalizeName(name)
  return entities.find(
    (entity) =>
      normalizeName(entity.name) === normalized ||
      entity.aliases.some((alias) => normalizeName(alias) === normalized)
  )
}

function mergeCharacterEntity(input: {
  existing?: CharacterEntityDto
  projectId: string
  now: string
  character: DecompositionCharacter
}): CharacterEntityDto {
  const { existing, projectId, now, character } = input
  const incomingRoleLayer = resolveCharacterRoleLayer(character.roleHint)
  const incomingTags = [
    incomingRoleLayer === 'core' ? '核心人物' : incomingRoleLayer === 'active' ? '活跃人物' : '功能人物'
  ]

  if (existing) {
    return {
      ...existing,
      name: character.name.trim() || existing.name,
      aliases: mergeAliases(existing.aliases, character.aliases || []),
      summary: character.summary?.trim() || existing.summary,
      tags: mergeTags(existing.tags, incomingTags),
      roleLayer: pickRoleLayer(existing.roleLayer, incomingRoleLayer),
      provenance: {
        ...existing.provenance,
        updatedAt: now
      }
    }
  }

  return {
    id: createEntityId('char', projectId, character.name),
    projectId,
    type: 'character',
    name: character.name.trim(),
    aliases: mergeAliases([], character.aliases || []),
    summary: character.summary?.trim() || '',
    tags: incomingTags,
    roleLayer: incomingRoleLayer,
    goals: [],
    pressures: [],
    linkedFactionIds: [],
    linkedLocationIds: [],
    linkedItemIds: [],
    provenance: createProvenance({
      source: character.source,
      createdAt: now
    })
  }
}

function mergeFactionEntity(input: {
  existing?: FactionEntityDto
  projectId: string
  now: string
  faction: DecompositionFaction
  memberCharacterIds: string[]
}): FactionEntityDto {
  const { existing, projectId, now, faction, memberCharacterIds } = input

  if (existing) {
    return {
      ...existing,
      summary: faction.summary?.trim() || existing.summary,
      tags: mergeTags(existing.tags, ['势力']),
      factionType: toFactionType(faction.factionType),
      memberCharacterIds: mergeIds(existing.memberCharacterIds, memberCharacterIds),
      provenance: {
        ...existing.provenance,
        updatedAt: now
      }
    }
  }

  return {
    id: createEntityId('faction', projectId, faction.name),
    projectId,
    type: 'faction',
    name: faction.name.trim(),
    aliases: [],
    summary: faction.summary?.trim() || '',
    tags: ['势力'],
    factionType: toFactionType(faction.factionType),
    memberCharacterIds,
    provenance: createProvenance({
      source: faction.source,
      createdAt: now
    })
  }
}

function mergeLocationEntity(input: {
  existing?: LocationEntityDto
  projectId: string
  now: string
  location: DecompositionLocation
  controllingFactionId?: string
}): LocationEntityDto {
  const { existing, projectId, now, location, controllingFactionId } = input

  if (existing) {
    return {
      ...existing,
      summary: location.summary?.trim() || existing.summary,
      tags: mergeTags(existing.tags, ['场域']),
      locationType: location.locationType,
      controllingFactionId: controllingFactionId || existing.controllingFactionId,
      provenance: {
        ...existing.provenance,
        updatedAt: now
      }
    }
  }

  return {
    id: createEntityId('loc', projectId, location.name),
    projectId,
    type: 'location',
    name: location.name.trim(),
    aliases: [],
    summary: location.summary?.trim() || '',
    tags: ['场域'],
    locationType: location.locationType,
    controllingFactionId,
    provenance: createProvenance({
      source: location.source,
      createdAt: now
    })
  }
}

function mergeItemEntity(input: {
  existing?: ItemEntityDto
  projectId: string
  now: string
  item: DecompositionItem
  ownerCharacterId?: string
}): ItemEntityDto {
  const { existing, projectId, now, item, ownerCharacterId } = input

  if (existing) {
    return {
      ...existing,
      summary: item.summary?.trim() || existing.summary,
      tags: mergeTags(existing.tags, ['关键物件']),
      itemType: toItemType(item.itemType),
      ownerCharacterId: ownerCharacterId || existing.ownerCharacterId,
      provenance: {
        ...existing.provenance,
        updatedAt: now
      }
    }
  }

  return {
    id: createEntityId('item', projectId, item.name),
    projectId,
    type: 'item',
    name: item.name.trim(),
    aliases: [],
    summary: item.summary?.trim() || '',
    tags: ['关键物件'],
    itemType: toItemType(item.itemType),
    ownerCharacterId,
    provenance: createProvenance({
      source: item.source,
      createdAt: now
    })
  }
}

function findResolvableEntityId(
  store: ProjectEntityStoreDto,
  name: string
): string | undefined {
  return (
    findByName(store.characters, name)?.id ||
    findByName(store.factions, name)?.id ||
    findByName(store.locations, name)?.id ||
    findByName(store.items, name)?.id
  )
}

function mergeRelationEntity(input: {
  existing?: RelationEntityDto
  projectId: string
  now: string
  relation: DecompositionRelation
  fromEntityId: string
  toEntityId: string
}): RelationEntityDto {
  const { existing, projectId, now, relation, fromEntityId, toEntityId } = input

  if (existing) {
    return {
      ...existing,
      name: `${relation.fromName.trim()} -> ${relation.toName.trim()}`,
      summary: relation.summary?.trim() || existing.summary,
      tags: mergeTags(existing.tags, ['关系']),
      relationType: toRelationType(relation.relationType),
      fromEntityId,
      toEntityId,
      provenance: {
        ...existing.provenance,
        updatedAt: now
      }
    }
  }

  return {
    id: createEntityId('rel', projectId, relation.fromName, relation.toName, relation.relationType),
    projectId,
    type: 'relation',
    name: `${relation.fromName.trim()} -> ${relation.toName.trim()}`,
    aliases: [],
    summary: relation.summary?.trim() || '',
    tags: ['关系'],
    relationType: toRelationType(relation.relationType),
    fromEntityId,
    toEntityId,
    provenance: createProvenance({
      source: relation.source,
      createdAt: now
    })
  }
}

export function buildEntityStoreFromDecomposition(input: {
  projectId: string
  decomposition: DecompositionResult
  existingStore?: ProjectEntityStoreDto | null
}): ProjectEntityStoreDto {
  const now = input.decomposition.meta.decomposedAt || new Date().toISOString()
  const existingStore = normalizeEntityStore(input.existingStore || EMPTY_ENTITY_STORE)

  const characters = [...existingStore.characters]
  for (const character of input.decomposition.characters) {
    const existing = findByName(characters, character.name)
    const merged = mergeCharacterEntity({
      existing,
      projectId: input.projectId,
      now,
      character
    })
    if (existing) {
      characters[characters.findIndex((item) => item.id === existing.id)] = merged
    } else {
      characters.push(merged)
    }
  }

  const factions = [...existingStore.factions]
  for (const faction of input.decomposition.factions) {
    const existing = findByName(factions, faction.name)
    const memberCharacterIds = faction.memberNames
      .map((name) => findByName(characters, name)?.id)
      .filter((value): value is string => Boolean(value))
    const merged = mergeFactionEntity({
      existing,
      projectId: input.projectId,
      now,
      faction,
      memberCharacterIds
    })
    if (existing) {
      factions[factions.findIndex((item) => item.id === existing.id)] = merged
    } else {
      factions.push(merged)
    }
  }

  const locations = [...existingStore.locations]
  for (const location of input.decomposition.locations) {
    const existing = findByName(locations, location.name)
    const controllingFactionId = location.controllingFactionName
      ? findByName(factions, location.controllingFactionName)?.id
      : undefined
    const merged = mergeLocationEntity({
      existing,
      projectId: input.projectId,
      now,
      location,
      controllingFactionId
    })
    if (existing) {
      locations[locations.findIndex((item) => item.id === existing.id)] = merged
    } else {
      locations.push(merged)
    }
  }

  const items = [...existingStore.items]
  for (const item of input.decomposition.items) {
    const existing = findByName(items, item.name)
    const ownerCharacterId = item.ownerName ? findByName(characters, item.ownerName)?.id : undefined
    const merged = mergeItemEntity({
      existing,
      projectId: input.projectId,
      now,
      item,
      ownerCharacterId
    })
    if (existing) {
      items[items.findIndex((entry) => entry.id === existing.id)] = merged
    } else {
      items.push(merged)
    }
  }

  const storeBeforeRelations: ProjectEntityStoreDto = {
    characters,
    factions,
    locations,
    items,
    relations: existingStore.relations
  }

  const relations = [...existingStore.relations]
  for (const relation of input.decomposition.relations) {
    const fromEntityId = findResolvableEntityId(storeBeforeRelations, relation.fromName)
    const toEntityId = findResolvableEntityId(storeBeforeRelations, relation.toName)
    if (!fromEntityId || !toEntityId) continue

    const existing = relations.find(
      (entry) =>
        entry.fromEntityId === fromEntityId &&
        entry.toEntityId === toEntityId &&
        entry.relationType === toRelationType(relation.relationType)
    )

    const merged = mergeRelationEntity({
      existing,
      projectId: input.projectId,
      now,
      relation,
      fromEntityId,
      toEntityId
    })
    if (existing) {
      relations[relations.findIndex((entry) => entry.id === existing.id)] = merged
    } else {
      relations.push(merged)
    }
  }

  return normalizeEntityStore(
    syncFactionSeatCharacters(
      normalizeEntityStore({
        characters,
        factions,
        locations,
        items,
        relations
      })
    )
  )
}
