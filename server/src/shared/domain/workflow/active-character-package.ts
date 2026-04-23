import type { CharacterEntityDto, ProjectEntityStoreDto } from '../../contracts/entities'
import type {
  ActiveCharacterPackageDto,
  ActiveCharacterPackageMemberDto,
  CharacterDraftDto,
  DetailedOutlineEpisodeBeatDto,
  OutlineBlockDto,
  OutlineDraftDto,
  OutlineEpisodeDto
} from '../../contracts/workflow'
import { getGovernanceOutlineBlockSize } from './batching-contract'
import {
  findCharacterEntityByName,
  fromMasterEntity,
  resolveMasterEntityId
} from '../entities/character-draft-mapper'

const EMPTY_ENTITY_STORE: ProjectEntityStoreDto = {
  characters: [],
  factions: [],
  locations: [],
  items: [],
  relations: []
}

const ROLE_WEIGHT: Record<'core' | 'active' | 'functional', number> = {
  core: 0,
  active: 1,
  functional: 2
}

function normalizeText(value: string | undefined): string {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function uniq(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function buildOutlineBlocks(
  outline: Pick<OutlineDraftDto, 'summaryEpisodes' | 'outlineBlocks' | 'planningUnitEpisodes'>
): OutlineBlockDto[] {
  if (Array.isArray(outline.outlineBlocks) && outline.outlineBlocks.length > 0) {
    return outline.outlineBlocks
  }

  const planningUnit = outline.planningUnitEpisodes || getGovernanceOutlineBlockSize()
  const normalizedEpisodes = (outline.summaryEpisodes || [])
    .filter((episode) => episode.summary?.trim())
    .sort((left, right) => left.episodeNo - right.episodeNo)

  const blocks: OutlineBlockDto[] = []
  for (let index = 0; index < normalizedEpisodes.length; index += planningUnit) {
    const blockEpisodes = normalizedEpisodes.slice(index, index + planningUnit)
    if (blockEpisodes.length === 0) continue
    blocks.push({
      blockNo: blocks.length + 1,
      label: `第${blockEpisodes[0].episodeNo}-${blockEpisodes[blockEpisodes.length - 1].episodeNo}集规划块`,
      startEpisode: blockEpisodes[0].episodeNo,
      endEpisode: blockEpisodes[blockEpisodes.length - 1].episodeNo,
      summary: blockEpisodes
        .map((episode) => `第${episode.episodeNo}集：${episode.summary}`)
        .join('\n'),
      episodes: blockEpisodes
    })
  }

  return blocks
}

function findOutlineBlockNo(
  outline: Pick<OutlineDraftDto, 'summaryEpisodes' | 'outlineBlocks' | 'planningUnitEpisodes'>,
  episodeNo: number
): number | null {
  const blocks = buildOutlineBlocks(outline)
  const block = blocks.find(
    (item) => episodeNo >= item.startEpisode && episodeNo <= item.endEpisode
  )
  return block?.blockNo ?? null
}

function collectEpisodeTexts(
  episodes: OutlineEpisodeDto[],
  startEpisode: number,
  endEpisode: number
): string[] {
  return episodes
    .filter((episode) => episode.episodeNo >= startEpisode && episode.episodeNo <= endEpisode)
    .map((episode) => episode.summary.trim())
    .filter(Boolean)
}

function collectEpisodeBeatTexts(
  episodeBeats: DetailedOutlineEpisodeBeatDto[] | undefined,
  startEpisode: number,
  endEpisode: number
): string[] {
  return (episodeBeats || [])
    .filter((episode) => episode.episodeNo >= startEpisode && episode.episodeNo <= endEpisode)
    .flatMap((episode) => [
      episode.summary.trim(),
      ...(episode.sceneByScene || []).flatMap((scene) => [
        scene.location?.trim() || '',
        scene.timeOfDay?.trim() || '',
        scene.setup?.trim() || '',
        scene.tension?.trim() || '',
        scene.hookEnd?.trim() || ''
      ])
    ])
    .filter(Boolean)
}

function buildTextCorpus(input: {
  outline: Pick<OutlineDraftDto, 'summaryEpisodes'>
  startEpisode: number
  endEpisode: number
  episodeBeats?: DetailedOutlineEpisodeBeatDto[]
}): string {
  return [
    ...collectEpisodeTexts(
      input.outline.summaryEpisodes || [],
      input.startEpisode,
      input.endEpisode
    ),
    ...collectEpisodeBeatTexts(input.episodeBeats, input.startEpisode, input.endEpisode)
  ]
    .join('\n')
    .toLowerCase()
}

function mentionsName(textCorpus: string, name: string, aliases: string[] = []): boolean {
  const candidates = [name, ...aliases].map((item) => normalizeText(item)).filter(Boolean)
  return candidates.some((candidate) => textCorpus.includes(candidate))
}

function getFactionNames(entityStore: ProjectEntityStoreDto, factionIds: string[]): string[] {
  const factionById = new Map(entityStore.factions.map((item) => [item.id, item.name]))
  return uniq(factionIds.map((id) => factionById.get(id) || ''))
}

function buildMemberFromFullProfile(input: {
  draft: CharacterDraftDto
  entityStore: ProjectEntityStoreDto
  isNewThisBatch: boolean
}): ActiveCharacterPackageMemberDto {
  const entity =
    (input.draft.masterEntityId
      ? input.entityStore.characters.find((item) => item.id === input.draft.masterEntityId) || null
      : null) || findCharacterEntityByName(input.entityStore, input.draft.name)

  return {
    name: input.draft.name,
    masterEntityId: entity?.id ?? input.draft.masterEntityId,
    roleLayer: input.draft.roleLayer || entity?.roleLayer || 'active',
    source: 'full_profile',
    summary: input.draft.biography || entity?.summary || '',
    factionNames: entity ? getFactionNames(input.entityStore, entity.linkedFactionIds) : [],
    isNewThisBatch: input.isNewThisBatch,
    needsUpgrade: false
  }
}

function buildMemberFromLightEntity(input: {
  entity: CharacterEntityDto
  entityStore: ProjectEntityStoreDto
  isNewThisBatch: boolean
}): ActiveCharacterPackageMemberDto {
  return {
    name: input.entity.name,
    masterEntityId: input.entity.id,
    roleLayer: input.entity.roleLayer,
    source: 'light_card',
    summary: input.entity.summary,
    factionNames: getFactionNames(input.entityStore, input.entity.linkedFactionIds),
    isNewThisBatch: input.isNewThisBatch,
    needsUpgrade: input.entity.roleLayer === 'core' || input.entity.roleLayer === 'active'
  }
}

function compareMembers(
  left: ActiveCharacterPackageMemberDto,
  right: ActiveCharacterPackageMemberDto
): number {
  const roleDelta = ROLE_WEIGHT[left.roleLayer] - ROLE_WEIGHT[right.roleLayer]
  if (roleDelta !== 0) return roleDelta
  if (left.source !== right.source) return left.source === 'full_profile' ? -1 : 1
  return left.name.localeCompare(right.name, 'zh-Hans-CN')
}

export function deriveActiveCharacterPackage(input: {
  outline: Pick<OutlineDraftDto, 'summaryEpisodes' | 'outlineBlocks' | 'planningUnitEpisodes'> & {
    protagonist?: string
  }
  characterDrafts: CharacterDraftDto[]
  entityStore?: ProjectEntityStoreDto | null
  startEpisode: number
  endEpisode: number
  batchNo?: number
  episodeBeats?: DetailedOutlineEpisodeBeatDto[]
}): ActiveCharacterPackageDto {
  const entityStore = input.entityStore ?? EMPTY_ENTITY_STORE
  const batchText = buildTextCorpus({
    outline: input.outline,
    startEpisode: input.startEpisode,
    endEpisode: input.endEpisode,
    episodeBeats: input.episodeBeats
  })
  const previousText = buildTextCorpus({
    outline: input.outline,
    startEpisode: 1,
    endEpisode: Math.max(0, input.startEpisode - 1),
    episodeBeats: input.episodeBeats
  })
  const batchBlockNo = findOutlineBlockNo(input.outline, input.startEpisode)
  const fullProfiles = input.characterDrafts.filter((draft) => {
    if (draft.name === input.outline.protagonist) return true
    if (draft.roleLayer === 'core') return true
    if (batchBlockNo && draft.activeBlockNos?.includes(batchBlockNo)) return true

    const entity =
      (resolveMasterEntityId(draft, entityStore)
        ? entityStore.characters.find(
            (item) => item.id === resolveMasterEntityId(draft, entityStore)
          )
        : null) || findCharacterEntityByName(entityStore, draft.name)

    return mentionsName(batchText, draft.name, entity?.aliases || [])
  })

  const fullProfileEntityIds = new Set(
    fullProfiles
      .map((draft) => resolveMasterEntityId(draft, entityStore))
      .filter((value): value is string => Boolean(value))
  )

  const lightEntities = entityStore.characters.filter((entity) => {
    if (fullProfileEntityIds.has(entity.id)) return false
    if (entity.roleLayer === 'core') return true
    if (mentionsName(batchText, entity.name, entity.aliases)) return true
    return false
  })

  const members = [
    ...fullProfiles.map((draft) =>
      buildMemberFromFullProfile({
        draft,
        entityStore,
        isNewThisBatch: !mentionsName(previousText, draft.name)
      })
    ),
    ...lightEntities.map((entity) =>
      buildMemberFromLightEntity({
        entity,
        entityStore,
        isNewThisBatch: !mentionsName(previousText, entity.name, entity.aliases)
      })
    )
  ].sort(compareMembers)

  const characters = [
    ...fullProfiles,
    ...lightEntities.map((entity) => fromMasterEntity(entity))
  ].sort((left, right) => {
    const leftRole = left.roleLayer || 'active'
    const rightRole = right.roleLayer || 'active'
    const roleDelta = ROLE_WEIGHT[leftRole] - ROLE_WEIGHT[rightRole]
    if (roleDelta !== 0) return roleDelta
    return left.name.localeCompare(right.name, 'zh-Hans-CN')
  })

  return {
    batchNo: input.batchNo ?? 1,
    startEpisode: input.startEpisode,
    endEpisode: input.endEpisode,
    memberNames: members.map((member) => member.name),
    debutCharacterNames: members
      .filter((member) => member.isNewThisBatch)
      .map((member) => member.name),
    carryOverCharacterNames: members
      .filter((member) => !member.isNewThisBatch)
      .map((member) => member.name),
    upgradeCandidateNames: members
      .filter((member) => member.needsUpgrade)
      .map((member) => member.name),
    members,
    characters
  }
}
