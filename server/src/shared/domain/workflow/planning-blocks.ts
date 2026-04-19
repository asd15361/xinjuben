import type {
  CharacterBlockDto,
  CharacterDraftDto,
  DetailedOutlineBlockDto,
  DetailedOutlineEpisodeBeatDto,
  OutlineBlockDto,
  OutlineEpisodeDto,
  OutlineDraftDto,
  ScriptBatchGovernanceDto,
  ScriptBatchContextDto
} from '../../contracts/workflow'
import type { StoryContractDto, UserAnchorLedgerDto } from '../../contracts/story-contract'
import type { StoryIntentPackageDto } from '../../contracts/intake'
import type { ProjectEntityStoreDto } from '../../contracts/entities'
import { analyzeLoadBearing } from './load-bearing-annotations'
import { deriveActiveCharacterPackage } from './active-character-package'
import {
  getGovernanceOutlineBlockSize,
  getGovernanceScriptBatchSize
} from './batching-contract'

const DEFAULT_OUTLINE_BLOCK_EPISODES = getGovernanceOutlineBlockSize()
const DEFAULT_SCRIPT_BATCH_EPISODES = getGovernanceScriptBatchSize()

type NarrativeThread = NonNullable<ScriptBatchContextDto['narrativeThreads']>[number]
type LoadBearingRole = NonNullable<ScriptBatchContextDto['loadBearingRoles']>[number]
type LoadBearingEntity = NonNullable<ScriptBatchContextDto['loadBearingEntities']>[number]

function normalizeEpisodes(input: OutlineEpisodeDto[]): OutlineEpisodeDto[] {
  return input
    .map((episode, index) => ({
      episodeNo:
        Number.isFinite(Number(episode?.episodeNo)) && Number(episode.episodeNo) > 0
          ? Math.floor(Number(episode.episodeNo))
          : index + 1,
      summary: episode?.summary?.trim() || ''
    }))
    .filter((episode) => episode.summary)
    .sort((left, right) => left.episodeNo - right.episodeNo)
}

export function getPlanningUnitEpisodes(
  outline: Pick<OutlineDraftDto, 'planningUnitEpisodes'> | null | undefined
): number {
  const value = Number(outline?.planningUnitEpisodes)
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_OUTLINE_BLOCK_EPISODES
  return Math.floor(value)
}

export function buildOutlineBlocks(
  episodes: OutlineEpisodeDto[],
  planningUnitEpisodes = DEFAULT_OUTLINE_BLOCK_EPISODES
): OutlineBlockDto[] {
  const normalizedEpisodes = normalizeEpisodes(episodes)
  if (normalizedEpisodes.length === 0) return []

  const blocks: OutlineBlockDto[] = []
  for (let index = 0; index < normalizedEpisodes.length; index += planningUnitEpisodes) {
    const blockEpisodes = normalizedEpisodes.slice(index, index + planningUnitEpisodes)
    const startEpisode = blockEpisodes[0].episodeNo
    const endEpisode = blockEpisodes[blockEpisodes.length - 1].episodeNo
    blocks.push({
      blockNo: blocks.length + 1,
      label: `第${startEpisode}${startEpisode === endEpisode ? '' : `-${endEpisode}`}集规划块`,
      startEpisode,
      endEpisode,
      summary: blockEpisodes
        .map((episode) => `第${episode.episodeNo}集：${episode.summary}`)
        .join('\n'),
      episodes: blockEpisodes
    })
  }

  return blocks
}

function collectDetailedOutlineEpisodeBeats(
  detailedOutlineBlocks: DetailedOutlineBlockDto[] | undefined
): DetailedOutlineEpisodeBeatDto[] {
  const seen = new Map<number, DetailedOutlineEpisodeBeatDto>()
  for (const block of detailedOutlineBlocks || []) {
    const nestedBeats = [
      ...(block.episodeBeats || []),
      ...(block.sections || []).flatMap((section) => section.episodeBeats || [])
    ]
    for (const beat of nestedBeats) {
      const episodeNo = Number.isFinite(Number(beat?.episodeNo))
        ? Math.floor(Number(beat.episodeNo))
        : 0
      if (episodeNo > 0 && !seen.has(episodeNo)) {
        seen.set(episodeNo, beat)
      }
    }
  }

  return Array.from(seen.values()).sort((left, right) => left.episodeNo - right.episodeNo)
}

function dedupeSorted(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean))).sort((left, right) =>
    left.localeCompare(right)
  )
}

function hasOverlap(
  range: { startEpisode: number; endEpisode: number },
  target: number[]
): boolean {
  return target.some(
    (episodeNo) => episodeNo >= range.startEpisode && episodeNo <= range.endEpisode
  )
}

function classifyRoleLayer(input: {
  roleName: string
  characters: CharacterDraftDto[]
  loadBearingRole: LoadBearingRole
}): 'core' | 'active' | 'supporting' {
  const matchedCharacter = input.characters.find((character) => character.name === input.roleName)
  if (matchedCharacter?.roleLayer === 'core') return 'core'
  if (matchedCharacter?.activeBlockNos?.length) return 'active'
  if (input.loadBearingRole.category === 'narrative_carrier') return 'core'
  if (input.loadBearingRole.category === 'conflict_driver') return 'active'
  return 'supporting'
}

function classifyEntityLayer(entity: LoadBearingEntity): 'core' | 'active' | 'supporting' {
  if (entity.category === 'narrative_carrier') return 'core'
  if (entity.category === 'conflict_driver' || entity.category === 'relationship_lever')
    return 'active'
  return 'supporting'
}

function classifyThreadLayer(thread: NarrativeThread): 'critical' | 'active' | 'supporting' {
  if (
    thread.reason.includes('终局') ||
    thread.reason.includes('对手贯穿') ||
    thread.reason.includes('主题兑现')
  ) {
    return 'critical'
  }
  if (
    thread.reason.includes('关系') ||
    thread.reason.includes('世界观') ||
    thread.reason.includes('锚定')
  ) {
    return 'active'
  }
  return 'supporting'
}

function buildRoleGovernance(input: {
  loadBearingRoles: LoadBearingRole[]
  characters: CharacterDraftDto[]
  activeCharacterNames: string[]
}): Pick<ScriptBatchGovernanceDto, 'grouped' | 'layered'>['grouped' | 'layered'] extends never
  ? never
  : {
      grouped: ScriptBatchGovernanceDto['grouped']
      layered: Pick<ScriptBatchGovernanceDto, 'layered'>['layered']
    } {
  const roleGroups = new Map<string, { label: string; roleNames: string[]; reasons: string[] }>()
  const roleLayers = new Map<
    'core' | 'active' | 'supporting',
    { label: string; roleNames: string[]; reasons: string[] }
  >()

  const ensureRoleGroup = (groupKey: string, label: string) => {
    if (!roleGroups.has(groupKey)) {
      roleGroups.set(groupKey, { label, roleNames: [], reasons: [] })
    }
    return roleGroups.get(groupKey)!
  }

  const ensureRoleLayer = (layerKey: 'core' | 'active' | 'supporting', label: string) => {
    if (!roleLayers.has(layerKey)) {
      roleLayers.set(layerKey, { label, roleNames: [], reasons: [] })
    }
    return roleLayers.get(layerKey)!
  }

  for (const role of input.loadBearingRoles) {
    const layerKey = classifyRoleLayer({
      roleName: role.name,
      characters: input.characters,
      loadBearingRole: role
    })
    const groupKey = layerKey === 'core' ? 'core_roles' : 'conflict_roles'
    const groupLabel = layerKey === 'core' ? '核心层承重角色组' : '当前批次冲突/承接角色组'
    const group = ensureRoleGroup(groupKey, groupLabel)
    group.roleNames.push(role.name)
    group.reasons.push(role.reason)

    const layerLabel = {
      core: '核心层角色治理',
      active: '当前活跃层角色治理',
      supporting: '支撑层角色治理'
    }[layerKey]
    const layer = ensureRoleLayer(layerKey, layerLabel)
    layer.roleNames.push(role.name)
    layer.reasons.push(role.reason)
  }

  if (input.activeCharacterNames.length > 0) {
    const activeGroup = ensureRoleGroup('batch_active_roles', '当前批次承接角色组')
    activeGroup.roleNames.push(...input.activeCharacterNames)
    activeGroup.reasons.push('按当前批次/规划块活跃范围承接')
  }

  return {
    grouped: {
      roleGroups: Array.from(roleGroups.entries()).map(([groupKey, group]) => ({
        groupKey,
        label: group.label,
        roleNames: dedupeSorted(group.roleNames),
        reasons: dedupeSorted(group.reasons)
      })),
      entityGroups: [],
      threadGroups: []
    },
    layered: {
      roleLayers: Array.from(roleLayers.entries()).map(([layerKey, layer]) => ({
        layerKey,
        label: layer.label,
        roleNames: dedupeSorted(layer.roleNames),
        reasons: dedupeSorted(layer.reasons)
      })),
      entityLayers: [],
      threadLayers: []
    }
  }
}

function buildEntityGovernance(loadBearingEntities: LoadBearingEntity[]): {
  entityGroups: ScriptBatchGovernanceDto['grouped']['entityGroups']
  entityLayers: ScriptBatchGovernanceDto['layered']['entityLayers']
} {
  const entityGroups = new Map<
    string,
    { label: string; entityIds: string[]; entityNames: string[]; reasons: string[] }
  >()
  const entityLayers = new Map<
    'core' | 'active' | 'supporting',
    { label: string; entityIds: string[]; entityNames: string[]; reasons: string[] }
  >()

  for (const entity of loadBearingEntities) {
    const groupKey = `${entity.category}_entities`
    const groupLabel = {
      narrative_carrier: '核心叙事实体组',
      conflict_driver: '冲突驱动实体组',
      relationship_lever: '关系杠杆实体组',
      theme_fulfiller: '主题兑现实体组',
      plot_anchor: '情节锚点实体组',
      pressure_point: '当前压力实体组'
    }[entity.category]
    if (!entityGroups.has(groupKey)) {
      entityGroups.set(groupKey, { label: groupLabel, entityIds: [], entityNames: [], reasons: [] })
    }
    const group = entityGroups.get(groupKey)!
    group.entityIds.push(entity.entityId)
    group.entityNames.push(entity.name)
    group.reasons.push(entity.reason)

    const layerKey = classifyEntityLayer(entity)
    const layerLabel = {
      core: '核心层实体治理',
      active: '当前活跃层实体治理',
      supporting: '支撑层实体治理'
    }[layerKey]
    if (!entityLayers.has(layerKey)) {
      entityLayers.set(layerKey, { label: layerLabel, entityIds: [], entityNames: [], reasons: [] })
    }
    const layer = entityLayers.get(layerKey)!
    layer.entityIds.push(entity.entityId)
    layer.entityNames.push(entity.name)
    layer.reasons.push(entity.reason)
  }

  return {
    entityGroups: Array.from(entityGroups.entries()).map(([groupKey, group]) => ({
      groupKey,
      label: group.label,
      entityIds: dedupeSorted(group.entityIds),
      entityNames: dedupeSorted(group.entityNames),
      reasons: dedupeSorted(group.reasons)
    })),
    entityLayers: Array.from(entityLayers.entries()).map(([layerKey, layer]) => ({
      layerKey,
      label: layer.label,
      entityIds: dedupeSorted(layer.entityIds),
      entityNames: dedupeSorted(layer.entityNames),
      reasons: dedupeSorted(layer.reasons)
    }))
  }
}

function buildThreadGovernance(narrativeThreads: NarrativeThread[]): {
  threadGroups: ScriptBatchGovernanceDto['grouped']['threadGroups']
  threadLayers: ScriptBatchGovernanceDto['layered']['threadLayers']
} {
  const threadGroups = new Map<string, { label: string; threads: NarrativeThread[] }>()
  const threadLayers = new Map<
    'critical' | 'active' | 'supporting',
    { label: string; threads: NarrativeThread[] }
  >()

  for (const thread of narrativeThreads) {
    const groupKey = thread.reason.includes('关系')
      ? 'relationship_threads'
      : thread.reason.includes('世界观')
        ? 'world_threads'
        : 'core_threads'
    const groupLabel = {
      relationship_threads: '关系承重线组',
      world_threads: '世界观承重线组',
      core_threads: '主线承重线组'
    }[groupKey]
    if (!threadGroups.has(groupKey)) {
      threadGroups.set(groupKey, { label: groupLabel, threads: [] })
    }
    threadGroups.get(groupKey)!.threads.push(thread)

    const layerKey = classifyThreadLayer(thread)
    const layerLabel = {
      critical: '关键线治理',
      active: '活跃线治理',
      supporting: '支撑线治理'
    }[layerKey]
    if (!threadLayers.has(layerKey)) {
      threadLayers.set(layerKey, { label: layerLabel, threads: [] })
    }
    threadLayers.get(layerKey)!.threads.push(thread)
  }

  const dedupeThreads = (threads: NarrativeThread[]) =>
    Array.from(new Map(threads.map((thread) => [thread.thread, thread])).values()).sort(
      (left, right) => left.thread.localeCompare(right.thread)
    )

  return {
    threadGroups: Array.from(threadGroups.entries()).map(([groupKey, group]) => ({
      groupKey,
      label: group.label,
      threads: dedupeThreads(group.threads)
    })),
    threadLayers: Array.from(threadLayers.entries()).map(([layerKey, layer]) => ({
      layerKey,
      label: layer.label,
      threads: dedupeThreads(layer.threads)
    }))
  }
}

function buildScriptBatchGovernance(input: {
  batchNo: number
  startEpisode: number
  endEpisode: number
  batchUnitEpisodes: number
  outline: Pick<OutlineDraftDto, 'outlineBlocks' | 'summaryEpisodes' | 'planningUnitEpisodes'>
  characters: CharacterDraftDto[]
  activeCharacterNames: string[]
  loadBearingRoles?: ScriptBatchContextDto['loadBearingRoles']
  loadBearingEntities?: ScriptBatchContextDto['loadBearingEntities']
  narrativeThreads?: ScriptBatchContextDto['narrativeThreads']
}): ScriptBatchGovernanceDto {
  const range = { startEpisode: input.startEpisode, endEpisode: input.endEpisode }
  const planningBlock = findOutlineBlockByEpisode(input.outline, input.startEpisode)
  const loadBearingRoles = (input.loadBearingRoles || []).filter((role) => {
    if (!role.episodeNos?.length) return true
    return hasOverlap(range, role.episodeNos)
  })
  const loadBearingEntities = (input.loadBearingEntities || []).filter((entity) => {
    if (!entity.episodeNos?.length) return true
    return hasOverlap(range, entity.episodeNos)
  })
  const narrativeThreads = input.narrativeThreads || []

  const roleGovernance = buildRoleGovernance({
    loadBearingRoles: [
      ...loadBearingRoles,
      ...input.activeCharacterNames
        .filter((roleName) => !loadBearingRoles.some((role) => role.name === roleName))
        .map((roleName) => ({
          name: roleName,
          reason: '当前批次活跃角色，需要纳入批次治理承接',
          category: 'pressure_point' as const
        }))
    ],
    characters: input.characters,
    activeCharacterNames: input.activeCharacterNames
  })
  const entityGovernance = buildEntityGovernance(loadBearingEntities)
  const threadGovernance = buildThreadGovernance(narrativeThreads)

  return {
    grouped: {
      roleGroups: roleGovernance.grouped.roleGroups,
      entityGroups: entityGovernance.entityGroups,
      threadGroups: threadGovernance.threadGroups
    },
    layered: {
      roleLayers: roleGovernance.layered.roleLayers,
      entityLayers: entityGovernance.entityLayers,
      threadLayers: threadGovernance.threadLayers
    },
    batched: {
      batchNo: input.batchNo,
      startEpisode: input.startEpisode,
      endEpisode: input.endEpisode,
      batchUnitEpisodes: input.batchUnitEpisodes,
      planningBlockNo: planningBlock?.blockNo || null,
      planningBlockStartEpisode: planningBlock?.startEpisode || null,
      planningBlockEndEpisode: planningBlock?.endEpisode || null
    }
  }
}

export function findEpisodeBeat(input: {
  detailedOutlineBlocks?: DetailedOutlineBlockDto[]
  episodeNo: number
}): DetailedOutlineEpisodeBeatDto | null {
  const fromBlocks = collectDetailedOutlineEpisodeBeats(input.detailedOutlineBlocks).find(
    (beat) => beat.episodeNo === input.episodeNo
  )
  if (fromBlocks) return fromBlocks
  return null
}

export function findOutlineBlockByEpisode(
  outline: Pick<OutlineDraftDto, 'outlineBlocks' | 'summaryEpisodes' | 'planningUnitEpisodes'>,
  episodeNo: number
): OutlineBlockDto | null {
  const blocks =
    outline.outlineBlocks && outline.outlineBlocks.length > 0
      ? outline.outlineBlocks
      : buildOutlineBlocks(
          outline.summaryEpisodes || [],
          outline.planningUnitEpisodes || DEFAULT_OUTLINE_BLOCK_EPISODES
        )

  return (
    blocks.find((block) => episodeNo >= block.startEpisode && episodeNo <= block.endEpisode) || null
  )
}

export function buildScriptBatchContexts(input: {
  outline: Pick<OutlineDraftDto, 'summaryEpisodes' | 'outlineBlocks' | 'planningUnitEpisodes'>
  episodeBeats: DetailedOutlineEpisodeBeatDto[]
  characters: CharacterDraftDto[]
  batchUnitEpisodes?: number
  /** Optional inputs for load-bearing analysis (T13 first slice) */
  storyContract?: StoryContractDto
  userAnchorLedger?: UserAnchorLedgerDto
  storyIntent?: StoryIntentPackageDto | null
  activeCharacterBlocks?: CharacterBlockDto[]
  entityStore?: ProjectEntityStoreDto
}): ScriptBatchContextDto[] {
  const normalizedEpisodes = normalizeEpisodes(input.outline.summaryEpisodes || [])
  if (normalizedEpisodes.length === 0) return []

  const batchUnitEpisodes = input.batchUnitEpisodes || DEFAULT_SCRIPT_BATCH_EPISODES
  const batches: ScriptBatchContextDto[] = []

  for (let index = 0; index < normalizedEpisodes.length; index += batchUnitEpisodes) {
    const batchEpisodes = normalizedEpisodes.slice(index, index + batchUnitEpisodes)
    const startEpisode = batchEpisodes[0].episodeNo
    const endEpisode = batchEpisodes[batchEpisodes.length - 1].episodeNo
    const activeCharacterPackage = deriveActiveCharacterPackage({
      outline: input.outline,
      characterDrafts: input.characters,
      entityStore: input.entityStore,
      startEpisode,
      endEpisode,
      batchNo: batches.length + 1,
      episodeBeats: input.episodeBeats
    })
    const activeCharacterNames = activeCharacterPackage.memberNames

    // T13: Load-bearing analysis (rule/contract-driven, not ML)
    let loadBearingRoles: ScriptBatchContextDto['loadBearingRoles'] = undefined
    let loadBearingEntities: ScriptBatchContextDto['loadBearingEntities'] = undefined
    let narrativeThreads: ScriptBatchContextDto['narrativeThreads'] = undefined

    if (input.storyContract && input.userAnchorLedger) {
      const loadBearing = analyzeLoadBearing({
        storyContract: input.storyContract,
        userAnchorLedger: input.userAnchorLedger,
        storyIntent: input.storyIntent,
        characters: input.characters,
        activeCharacterBlocks: input.activeCharacterBlocks,
        entityStore: input.entityStore,
        startEpisode,
        endEpisode
      })
      loadBearingRoles = loadBearing.roles
      loadBearingEntities = loadBearing.entities
      narrativeThreads = loadBearing.narrativeThreads
    }

    batches.push({
      batchNo: batches.length + 1,
      startEpisode,
      endEpisode,
      title: `第${startEpisode}${startEpisode === endEpisode ? '' : `-${endEpisode}`}集写作批次`,
      summary: batchEpisodes
        .map((episode) => `第${episode.episodeNo}集：${episode.summary}`)
        .join('\n'),
      previousSummary:
        batches.length === 0
          ? '（这是第一批，前情只需要承接正式底稿和开局压力）'
          : batches[batches.length - 1].summary,
      episodeBeats: input.episodeBeats.filter(
        (beat) => beat.episodeNo >= startEpisode && beat.episodeNo <= endEpisode
      ),
      activeCharacterNames,
      activeCharacterPackage,
      loadBearingRoles,
      loadBearingEntities,
      narrativeThreads,
      governance: buildScriptBatchGovernance({
        batchNo: batches.length + 1,
        startEpisode,
        endEpisode,
        batchUnitEpisodes,
        outline: input.outline,
        characters: input.characters,
        activeCharacterNames,
        loadBearingRoles,
        loadBearingEntities,
        narrativeThreads
      })
    })
  }

  return batches
}

export function buildScriptBatchContext(input: {
  outline: Pick<OutlineDraftDto, 'summaryEpisodes' | 'outlineBlocks' | 'planningUnitEpisodes'>
  detailedOutlineBlocks?: DetailedOutlineBlockDto[]
  characters?: CharacterDraftDto[]
  episodeNo: number
  batchUnitEpisodes?: number
  /** Optional inputs for load-bearing analysis (T13 first slice) */
  storyContract?: StoryContractDto
  userAnchorLedger?: UserAnchorLedgerDto
  storyIntent?: StoryIntentPackageDto | null
  activeCharacterBlocks?: CharacterBlockDto[]
  entityStore?: ProjectEntityStoreDto
}): ScriptBatchContextDto {
  const batchContexts = buildScriptBatchContexts({
    outline: input.outline,
    episodeBeats: collectDetailedOutlineEpisodeBeats(input.detailedOutlineBlocks),
    characters: input.characters || [],
    batchUnitEpisodes: input.batchUnitEpisodes,
    storyContract: input.storyContract,
    userAnchorLedger: input.userAnchorLedger,
    storyIntent: input.storyIntent,
    activeCharacterBlocks: input.activeCharacterBlocks,
    entityStore: input.entityStore
  })

  return (
    findScriptBatchContext(batchContexts, input.episodeNo) || {
      batchNo: 1,
      startEpisode: input.episodeNo,
      endEpisode: input.episodeNo,
      title: `第${input.episodeNo}集写作批次`,
      summary: '（当前批次摘要待补）',
      previousSummary: '（前情待补）',
      episodeBeats: [],
      activeCharacterNames: [],
      activeCharacterPackage: undefined
    }
  )
}

export function findScriptBatchContext(
  batchContexts: ScriptBatchContextDto[],
  episodeNo: number
): ScriptBatchContextDto | null {
  return (
    batchContexts.find(
      (batch) => episodeNo >= batch.startEpisode && episodeNo <= batch.endEpisode
    ) || null
  )
}

export function findCharacterBlock(input: {
  characterBlocks?: CharacterBlockDto[]
  episodeNo: number
}): CharacterBlockDto | null {
  return (
    (input.characterBlocks || []).find(
      (block) => input.episodeNo >= block.startEpisode && input.episodeNo <= block.endEpisode
    ) || null
  )
}

export function buildCharacterBlocks(input: {
  outlineBlocks: OutlineBlockDto[]
  characters: CharacterDraftDto[]
  protagonist?: string
}): CharacterBlockDto[] {
  return input.outlineBlocks.map((block) => {
    const characters = input.characters.filter((character) => {
      if (character.name === input.protagonist) return true
      if (character.roleLayer === 'core') return true
      if (character.activeBlockNos && character.activeBlockNos.length > 0) {
        return character.activeBlockNos.includes(block.blockNo)
      }
      return (
        block.summary.includes(character.name) ||
        block.episodes.some((episode) => episode.summary.includes(character.name))
      )
    })

    return {
      blockNo: block.blockNo,
      startEpisode: block.startEpisode,
      endEpisode: block.endEpisode,
      summary: block.summary,
      characterNames: characters.map((character) => character.name),
      characters
    }
  })
}

export function deriveProjectCharacterBlocks(input: {
  outline: Pick<
    OutlineDraftDto,
    'summaryEpisodes' | 'outlineBlocks' | 'planningUnitEpisodes' | 'protagonist'
  > | null | undefined
  characters: CharacterDraftDto[]
}): CharacterBlockDto[] {
  if (!input.outline || !Array.isArray(input.outline.summaryEpisodes)) return []

  const outlineBlocks =
    Array.isArray(input.outline.outlineBlocks) && input.outline.outlineBlocks.length > 0
      ? input.outline.outlineBlocks
      : buildOutlineBlocks(
          input.outline.summaryEpisodes,
          getPlanningUnitEpisodes(input.outline)
        )

  if (outlineBlocks.length === 0) return []

  return buildCharacterBlocks({
    outlineBlocks,
    characters: input.characters,
    protagonist: input.outline.protagonist
  })
}