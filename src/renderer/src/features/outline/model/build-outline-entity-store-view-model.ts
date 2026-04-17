import type { ProjectEntityStoreDto } from '../../../../../shared/contracts/entities.ts'

export interface OutlineEntityStoreViewModel {
  isEmpty: boolean
  counts: {
    characters: number
    factions: number
    locations: number
    items: number
    relations: number
  }
  factions: Array<{
    name: string
    summary: string
    seatCount: number
  }>
  characters: Array<{
    name: string
    roleLayerLabel: string
    summary: string
  }>
  relations: string[]
}

function roleLayerLabel(roleLayer: 'core' | 'active' | 'functional'): string {
  switch (roleLayer) {
    case 'core':
      return '核心人物'
    case 'active':
      return '活跃人物'
    default:
      return '功能人物'
  }
}

export function buildOutlineEntityStoreViewModel(
  entityStore?: ProjectEntityStoreDto | null
): OutlineEntityStoreViewModel {
  const counts = {
    characters: entityStore?.characters.length || 0,
    factions: entityStore?.factions.length || 0,
    locations: entityStore?.locations.length || 0,
    items: entityStore?.items.length || 0,
    relations: entityStore?.relations.length || 0
  }

  return {
    isEmpty:
      counts.characters === 0 &&
      counts.factions === 0 &&
      counts.locations === 0 &&
      counts.items === 0 &&
      counts.relations === 0,
    counts,
    factions: (entityStore?.factions || []).slice(0, 4).map((item) => ({
      name: item.name,
      summary: item.summary,
      seatCount: item.memberCharacterIds.length
    })),
    characters: (entityStore?.characters || [])
      .slice()
      .sort((left, right) => {
        const weight = { core: 0, active: 1, functional: 2 } as const
        return weight[left.roleLayer] - weight[right.roleLayer]
      })
      .slice(0, 6)
      .map((item) => ({
        name: item.name,
        roleLayerLabel: roleLayerLabel(item.roleLayer),
        summary: item.summary
      })),
    relations: (entityStore?.relations || [])
      .map((item) => item.summary.trim())
      .filter(Boolean)
      .slice(0, 3)
  }
}
