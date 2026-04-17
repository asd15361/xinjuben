import type {
  BaseProjectEntityDto,
  CharacterEntityDto,
  ProjectEntityDto,
  ProjectEntityStoreDto,
  ProjectEntityType
} from '../../contracts/entities'

function normalizeBaseEntity<T extends BaseProjectEntityDto>(
  entity: T,
  type: ProjectEntityType
): T {
  return {
    ...entity,
    type: type as T['type'],
    name: entity.name.trim(),
    aliases: (entity.aliases || []).map((item) => item.trim()).filter(Boolean),
    summary: entity.summary.trim(),
    tags: (entity.tags || []).map((item) => item.trim()).filter(Boolean)
  }
}

function normalizeEntity<T extends ProjectEntityDto>(entity: T): T {
  switch (entity.type) {
    case 'character':
      return normalizeCharacterEntity(entity) as T
    case 'faction':
      return normalizeBaseEntity(entity, 'faction')
    case 'location':
      return normalizeBaseEntity(entity, 'location')
    case 'item':
      return normalizeBaseEntity(entity, 'item')
    case 'relation':
      return normalizeBaseEntity(entity, 'relation')
    default:
      return entity
  }
}

function normalizePositiveInteger(value: unknown): number | undefined {
  const next = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(next) || next <= 0) return undefined
  return Math.floor(next)
}

function normalizeRankLevel(value: unknown): CharacterEntityDto['rankLevel'] | undefined {
  return value === 'leader' ||
    value === 'senior' ||
    value === 'mid' ||
    value === 'junior' ||
    value === 'support'
    ? value
    : undefined
}

function normalizeCharacterEntity(entity: CharacterEntityDto): CharacterEntityDto {
  const normalized = normalizeBaseEntity(entity, 'character')
  return {
    ...normalized,
    identityMode: entity.identityMode === 'slot' ? 'slot' : 'named',
    slotKey: entity.slotKey?.trim() || undefined,
    factionRole: entity.factionRole?.trim() || undefined,
    rankLevel: normalizeRankLevel(entity.rankLevel),
    publicIdentity: entity.publicIdentity?.trim() || undefined,
    stance: entity.stance?.trim() || undefined,
    currentFunction: entity.currentFunction?.trim() || undefined,
    voiceStyle: entity.voiceStyle?.trim() || undefined,
    firstSeenEpisode: normalizePositiveInteger(entity.firstSeenEpisode),
    activeEpisodeRange: entity.activeEpisodeRange?.trim() || undefined,
    upgradeCandidate: Boolean(entity.upgradeCandidate)
  }
}

export function normalizeEntityStore(
  entityStore?: ProjectEntityStoreDto | null
): ProjectEntityStoreDto {
  return {
    characters: (entityStore?.characters || []).map((item) => normalizeEntity(item)),
    factions: (entityStore?.factions || []).map((item) => normalizeEntity(item)),
    locations: (entityStore?.locations || []).map((item) => normalizeEntity(item)),
    items: (entityStore?.items || []).map((item) => normalizeEntity(item)),
    relations: (entityStore?.relations || []).map((item) => normalizeEntity(item))
  }
}
