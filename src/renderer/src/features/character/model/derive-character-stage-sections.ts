import type {
  CharacterEntityDto,
  FactionEntityDto,
  ProjectEntityStoreDto
} from '../../../../../shared/contracts/entities.ts'
import type { CharacterDraftDto } from '../../../../../shared/contracts/workflow.ts'
import {
  findCharacterEntityByName,
  fromMasterEntity,
  resolveMasterEntityId
} from '../../../../../shared/domain/entities/character-draft-mapper.ts'
import {
  buildFactionSeatBlueprints,
  isSlotCharacterEntity
} from '../../../../../shared/domain/entities/faction-seat-characters.ts'

const EMPTY_ENTITY_STORE: ProjectEntityStoreDto = {
  characters: [],
  factions: [],
  locations: [],
  items: [],
  relations: []
}

const ROLE_LAYER_WEIGHT: Record<CharacterEntityDto['roleLayer'], number> = {
  core: 0,
  active: 1,
  functional: 2
}

export interface CharacterStageLightCard {
  entityId: string
  name: string
  summary: string
  roleLayer: CharacterEntityDto['roleLayer']
  roleLayerLabel: string
  factionNames: string[]
  factionRole?: string
  publicIdentity?: string
  stance?: string
  currentFunction?: string
  voiceStyle?: string
  identityMode: 'named' | 'slot'
  upgradeCandidate: boolean
  goalPreview: string
  pressurePreview: string
}

export interface CharacterStageFactionMember {
  entityId: string
  name: string
  roleLayer: CharacterEntityDto['roleLayer']
  roleLayerLabel: string
  isFullProfile: boolean
}

export interface CharacterStageFactionPlaceholderSeat {
  seatKey: string
  label: string
  roleLayer: CharacterEntityDto['roleLayer']
  roleLayerLabel: string
  sourceEntityId?: string
}

export interface CharacterStageFactionRosterItem {
  factionId: string
  name: string
  factionType: FactionEntityDto['factionType']
  factionTypeLabel: string
  summary: string
  members: CharacterStageFactionMember[]
  placeholderSeats: CharacterStageFactionPlaceholderSeat[]
  seatCount: number
}

export interface CharacterStageSections {
  fullProfiles: CharacterDraftDto[]
  lightCards: CharacterStageLightCard[]
  factionRoster: CharacterStageFactionRosterItem[]
  factionSeatCount: number
}

function getRoleLayerLabel(roleLayer: CharacterEntityDto['roleLayer']): string {
  switch (roleLayer) {
    case 'core':
      return '核心人物'
    case 'active':
      return '活跃人物'
    default:
      return '功能人物'
  }
}

function getFactionTypeLabel(type: FactionEntityDto['factionType']): string {
  switch (type) {
    case 'sect':
      return '宗门'
    case 'clan':
      return '家族'
    case 'organization':
      return '组织'
    case 'court':
      return '官面'
    default:
      return '其他势力'
  }
}

function byRoleThenName(left: CharacterEntityDto, right: CharacterEntityDto): number {
  const roleDelta = ROLE_LAYER_WEIGHT[left.roleLayer] - ROLE_LAYER_WEIGHT[right.roleLayer]
  if (roleDelta !== 0) return roleDelta
  return left.name.localeCompare(right.name, 'zh-Hans-CN')
}

function buildFactionPlaceholderSeats(
  faction: FactionEntityDto,
  members: CharacterStageFactionMember[]
): CharacterStageFactionPlaceholderSeat[] {
  const remainingByRole: Record<CharacterEntityDto['roleLayer'], number> = {
    core: 0,
    active: 0,
    functional: 0
  }

  for (const member of members) {
    remainingByRole[member.roleLayer] += 1
  }

  return buildFactionSeatBlueprints(faction)
    .filter((blueprint) => {
      if (remainingByRole[blueprint.roleLayer] > 0) {
        remainingByRole[blueprint.roleLayer] -= 1
        return false
      }

      return true
    })
    .map((seat) => ({
      seatKey: `${faction.id}:${seat.key}`,
      label: seat.label,
      roleLayer: seat.roleLayer,
      roleLayerLabel: getRoleLayerLabel(seat.roleLayer)
    }))
}

function buildFactionSlotSeats(
  faction: FactionEntityDto,
  entityStore: ProjectEntityStoreDto
): CharacterStageFactionPlaceholderSeat[] {
  return entityStore.characters
    .filter((character) => isSlotCharacterEntity(character) && character.linkedFactionIds.includes(faction.id))
    .sort(byRoleThenName)
    .map((character) => ({
      seatKey: character.slotKey || character.id,
      label: character.factionRole || character.name,
      roleLayer: character.roleLayer,
      roleLayerLabel: getRoleLayerLabel(character.roleLayer),
      sourceEntityId: character.id
    }))
}

function resolveFullProfileEntityIds(
  characterDrafts: CharacterDraftDto[],
  entityStore: ProjectEntityStoreDto
): Set<string> {
  const ids = new Set<string>()

  for (const draft of characterDrafts) {
    const resolvedId = resolveMasterEntityId(draft, entityStore)
    if (resolvedId) {
      ids.add(resolvedId)
      continue
    }

    const matched = findCharacterEntityByName(entityStore, draft.name)
    if (matched) {
      ids.add(matched.id)
    }
  }

  return ids
}

function buildLightCards(
  entityStore: ProjectEntityStoreDto,
  fullProfileEntityIds: Set<string>
): CharacterStageLightCard[] {
  const factionById = new Map(entityStore.factions.map((item) => [item.id, item]))

  return [...entityStore.characters]
    .filter((entity) => !fullProfileEntityIds.has(entity.id))
    .sort(byRoleThenName)
    .map((entity) => ({
      entityId: entity.id,
      name: entity.name,
      summary: entity.summary,
      roleLayer: entity.roleLayer,
      roleLayerLabel: getRoleLayerLabel(entity.roleLayer),
      factionNames: entity.linkedFactionIds
        .map((factionId) => factionById.get(factionId)?.name || '')
        .filter(Boolean),
      factionRole: entity.factionRole,
      publicIdentity: entity.publicIdentity,
      stance: entity.stance,
      currentFunction: entity.currentFunction,
      voiceStyle: entity.voiceStyle,
      identityMode: entity.identityMode || 'named',
      upgradeCandidate: Boolean(entity.upgradeCandidate),
      goalPreview: entity.goals.join(' / '),
      pressurePreview: entity.pressures.join(' / ')
    }))
}

function buildFactionRoster(
  entityStore: ProjectEntityStoreDto,
  fullProfileEntityIds: Set<string>
): CharacterStageFactionRosterItem[] {
  const namedCharacterById = new Map(
    entityStore.characters
      .filter((character) => !isSlotCharacterEntity(character))
      .map((character) => [character.id, character])
  )

  return entityStore.factions.map((faction) => {
    const memberIds = new Set<string>([
      ...faction.memberCharacterIds,
      ...entityStore.characters
        .filter(
          (character) => !isSlotCharacterEntity(character) && character.linkedFactionIds.includes(faction.id)
        )
        .map((character) => character.id)
    ])
    const members = [...memberIds]
      .map((characterId) => namedCharacterById.get(characterId))
      .filter((item): item is CharacterEntityDto => Boolean(item))
      .sort(byRoleThenName)
      .map((member) => ({
        entityId: member.id,
        name: member.name,
        roleLayer: member.roleLayer,
        roleLayerLabel: getRoleLayerLabel(member.roleLayer),
        isFullProfile: fullProfileEntityIds.has(member.id)
      }))
    const slotSeats = buildFactionSlotSeats(faction, entityStore)
    const placeholderSeats = slotSeats.length > 0 ? slotSeats : buildFactionPlaceholderSeats(faction, members)

    return {
      factionId: faction.id,
      name: faction.name,
      factionType: faction.factionType,
      factionTypeLabel: getFactionTypeLabel(faction.factionType),
      summary: faction.summary,
      members,
      placeholderSeats,
      seatCount: members.length + placeholderSeats.length
    }
  })
}

export function buildCharacterStageSections(input: {
  characterDrafts?: CharacterDraftDto[] | null
  entityStore?: ProjectEntityStoreDto | null
}): CharacterStageSections {
  const characterDrafts = input.characterDrafts ?? []
  const entityStore = input.entityStore ?? EMPTY_ENTITY_STORE
  const fullProfileEntityIds = resolveFullProfileEntityIds(characterDrafts, entityStore)
  const factionRoster = buildFactionRoster(entityStore, fullProfileEntityIds)

  return {
    fullProfiles: characterDrafts,
    lightCards: buildLightCards(entityStore, fullProfileEntityIds),
    factionRoster,
    factionSeatCount: factionRoster.reduce((total, faction) => total + faction.seatCount, 0)
  }
}

export function createCharacterDraftFromEntityStore(input: {
  entityStore?: ProjectEntityStoreDto | null
  characterEntityId: string
}): CharacterDraftDto | null {
  const entityStore = input.entityStore ?? EMPTY_ENTITY_STORE
  const entity = entityStore.characters.find((item) => item.id === input.characterEntityId)
  if (!entity) {
    return null
  }
  return fromMasterEntity(entity)
}
