import type {
  FormalFactAuthorityType,
  FormalFactDeclaredBy,
  FormalFactProvenanceTier
} from './formal-fact'

export type ProjectEntityType = 'character' | 'faction' | 'location' | 'item' | 'relation'

export interface ProjectEntityProvenanceDto {
  provenanceTier: FormalFactProvenanceTier
  originAuthorityType: FormalFactAuthorityType
  originDeclaredBy: FormalFactDeclaredBy
  sourceStage: 'chat' | 'outline' | 'character' | 'detailed_outline' | 'script'
  sourceRef?: string
  createdAt: string
  updatedAt: string
}

export interface BaseProjectEntityDto {
  id: string
  projectId: string
  type: ProjectEntityType
  name: string
  aliases: string[]
  summary: string
  tags: string[]
  provenance: ProjectEntityProvenanceDto
}

export interface CharacterEntityDto extends BaseProjectEntityDto {
  type: 'character'
  roleLayer: 'core' | 'active' | 'functional'
  goals: string[]
  pressures: string[]
  linkedFactionIds: string[]
  linkedLocationIds: string[]
  linkedItemIds: string[]
  identityMode?: 'named' | 'slot'
  slotKey?: string
  factionRole?: string
  rankLevel?: 'leader' | 'senior' | 'mid' | 'junior' | 'support'
  publicIdentity?: string
  stance?: string
  currentFunction?: string
  voiceStyle?: string
  firstSeenEpisode?: number
  activeEpisodeRange?: string
  upgradeCandidate?: boolean
}

export interface FactionEntityDto extends BaseProjectEntityDto {
  type: 'faction'
  factionType: 'sect' | 'clan' | 'organization' | 'court' | 'other'
  memberCharacterIds: string[]
}

export interface LocationEntityDto extends BaseProjectEntityDto {
  type: 'location'
  locationType: 'region' | 'city' | 'site' | 'interior' | 'other'
  controllingFactionId?: string
}

export interface ItemEntityDto extends BaseProjectEntityDto {
  type: 'item'
  itemType: 'artifact' | 'weapon' | 'evidence' | 'resource' | 'other'
  ownerCharacterId?: string
}

export interface RelationEntityDto extends BaseProjectEntityDto {
  type: 'relation'
  relationType: 'alliance' | 'hostility' | 'kinship' | 'romance' | 'debt' | 'mastery' | 'other'
  fromEntityId: string
  toEntityId: string
}

export type ProjectEntityDto =
  | CharacterEntityDto
  | FactionEntityDto
  | LocationEntityDto
  | ItemEntityDto
  | RelationEntityDto

export interface ProjectEntityStoreDto {
  characters: CharacterEntityDto[]
  factions: FactionEntityDto[]
  locations: LocationEntityDto[]
  items: ItemEntityDto[]
  relations: RelationEntityDto[]
}
