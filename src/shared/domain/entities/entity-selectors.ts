import type {
  CharacterEntityDto,
  ProjectEntityDto,
  ProjectEntityStoreDto,
  ProjectEntityType
} from '../../contracts/entities'

export function getEntitiesByType<T extends ProjectEntityType>(
  entityStore: ProjectEntityStoreDto,
  type: T
): Extract<ProjectEntityDto, { type: T }>[] {
  switch (type) {
    case 'character':
      return entityStore.characters as Extract<ProjectEntityDto, { type: T }>[]
    case 'faction':
      return entityStore.factions as Extract<ProjectEntityDto, { type: T }>[]
    case 'location':
      return entityStore.locations as Extract<ProjectEntityDto, { type: T }>[]
    case 'item':
      return entityStore.items as Extract<ProjectEntityDto, { type: T }>[]
    case 'relation':
      return entityStore.relations as Extract<ProjectEntityDto, { type: T }>[]
    default:
      return [] as Extract<ProjectEntityDto, { type: T }>[]
  }
}

export function getCharacterEntityByName(
  entityStore: ProjectEntityStoreDto,
  name: string
): CharacterEntityDto | null {
  const normalized = name.trim()
  if (!normalized) return null
  return (
    entityStore.characters.find(
      (entity) => entity.name === normalized || entity.aliases.includes(normalized)
    ) || null
  )
}
