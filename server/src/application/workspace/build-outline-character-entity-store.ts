import type { CharacterProfileV2Dto } from '@shared/contracts/character-profile-v2'
import type {
  CharacterEntityDto,
  FactionEntityDto,
  ProjectEntityStoreDto,
  RelationEntityDto
} from '@shared/contracts/entities'
import type { FactionDto, FactionMatrixDto } from '@shared/contracts/faction-matrix'
import type { CharacterDraftDto } from '@shared/contracts/workflow'

const EMPTY_ENTITY_STORE: ProjectEntityStoreDto = {
  characters: [],
  factions: [],
  locations: [],
  items: [],
  relations: []
}

const MIN_VISIBLE_CHARACTER_COUNT = 22
const ROLE_LAYER_WEIGHT: Record<CharacterEntityDto['roleLayer'], number> = {
  core: 0,
  active: 1,
  functional: 2
}
const RANK_LEVEL_WEIGHT: Record<NonNullable<CharacterEntityDto['rankLevel']>, number> = {
  leader: 0,
  senior: 1,
  mid: 2,
  support: 3,
  junior: 4
}


function normalizeName(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function hashText(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

function createEntityId(prefix: string, projectId: string, ...parts: string[]): string {
  return `${prefix}_${projectId}_${hashText(parts.map((part) => normalizeName(part)).join('|'))}`
}

function createSeatMatchKey(input: {
  factionId?: string | null
  branchId?: string | null
  roleInFaction?: string | null
}): string {
  return [input.factionId, input.branchId, input.roleInFaction]
    .map((value) => normalizeName(value || ''))
    .join('|')
}

function createProvenance(sourceRef: string) {
  const now = new Date().toISOString()
  return {
    provenanceTier: 'ai_suggested' as const,
    originAuthorityType: 'ai_suggested' as const,
    originDeclaredBy: 'system' as const,
    sourceStage: 'outline' as const,
    sourceRef,
    createdAt: now,
    updatedAt: now
  }
}

function toFactionType(positioning: string): FactionEntityDto['factionType'] {
  const text = positioning.trim()
  if (/(宫|门|派|宗|教)/.test(text)) return 'sect'
  if (/(府|朝|司|监|衙|军)/.test(text)) return 'court'
  if (/(氏|家族|世家)/.test(text)) return 'clan'
  if (text) return 'organization'
  return 'other'
}

function toRoleLayer(depthLevel?: 'core' | 'mid' | 'extra'): CharacterEntityDto['roleLayer'] {
  if (depthLevel === 'core') return 'core'
  if (depthLevel === 'mid') return 'active'
  return 'functional'
}

function buildCharacterSummary(profile: CharacterProfileV2Dto | undefined, draft: CharacterDraftDto | undefined, fallbackIdentity: string): string {
  if (draft?.biography?.trim()) return draft.biography.trim()
  if (profile?.biography?.trim()) return profile.biography.trim()

  const parts = [
    profile?.identity?.trim() || fallbackIdentity.trim(),
    profile?.values?.trim() || draft?.goal?.trim() || '',
    profile?.plotFunction?.trim() || ''
  ].filter(Boolean)

  return parts.join('，')
}

function mergeStringList(...values: Array<string | undefined>): string[] {
  return values
    .map((value) => value?.trim() || '')
    .filter(Boolean)
}

function createCharacterEntity(input: {
  projectId: string
  faction: FactionDto
  placeholder: FactionDto['branches'][number]['characters'][number]
  profile?: CharacterProfileV2Dto
  draft?: CharacterDraftDto
}): CharacterEntityDto {
  const { projectId, faction, placeholder, profile, draft } = input
  const entityId = createEntityId('char', projectId, faction.id, placeholder.id, profile?.name || placeholder.name)
  const factionId = createEntityId('faction', projectId, faction.id, faction.name)
  const publicIdentity = profile?.identity?.trim() || placeholder.identity.trim()
  const summary = buildCharacterSummary(profile, draft, placeholder.identity)

  return {
    id: entityId,
    projectId,
    type: 'character',
    name: (profile?.name || placeholder.name).trim(),
    aliases: [],
    summary,
    tags: [faction.name.trim(), placeholder.roleInFaction, placeholder.depthLevel],
    roleLayer: toRoleLayer(profile?.depthLevel || placeholder.depthLevel),
    goals: mergeStringList(draft?.goal, profile?.goal, placeholder.coreMotivation),
    pressures: mergeStringList(draft?.hiddenPressure, profile?.hiddenPressure, profile?.fear),
    linkedFactionIds: [factionId],
    linkedLocationIds: [],
    linkedItemIds: [],
    factionRole: placeholder.roleInFaction,
    rankLevel:
      placeholder.roleInFaction === 'leader'
        ? 'leader'
        : placeholder.depthLevel === 'core'
          ? 'senior'
          : placeholder.depthLevel === 'mid'
            ? 'mid'
            : 'support',
    publicIdentity,
    stance: profile?.values?.trim() || '',
    currentFunction: profile?.plotFunction?.trim() || placeholder.plotFunction.trim(),
    voiceStyle: profile?.personality?.trim() || '',
    identityMode: 'named',
    upgradeCandidate: !(draft?.name?.trim()),
    provenance: createProvenance(placeholder.id)
  }
}

function createFactionEntity(input: {
  projectId: string
  faction: FactionDto
  memberCharacterIds: string[]
}): FactionEntityDto {
  const { projectId, faction, memberCharacterIds } = input
  return {
    id: createEntityId('faction', projectId, faction.id, faction.name),
    projectId,
    type: 'faction',
    name: faction.name.trim(),
    aliases: [],
    summary: faction.positioning.trim() || faction.coreDemand.trim(),
    tags: ['势力', faction.coreValues.trim()].filter(Boolean),
    factionType: toFactionType(faction.positioning),
    memberCharacterIds,
    provenance: createProvenance(faction.id)
  }
}


function createSeatSlotEntity(input: {
  projectId: string
  faction: FactionEntityDto
  seatKey: string
  label: string
  roleLayer: CharacterEntityDto['roleLayer']
  rankLevel: NonNullable<CharacterEntityDto['rankLevel']>
  stance: string
  currentFunction: string
  voiceStyle: string
}): CharacterEntityDto {
  const now = new Date().toISOString()
  const slotKey = `${input.faction.id}:${input.seatKey}`

  return {
    id: createEntityId('char', input.projectId, input.faction.id, slotKey),
    projectId: input.projectId,
    type: 'character',
    name: `${input.faction.name}·${input.label}`,
    aliases: [],
    summary: `${input.faction.name}里的${input.label}，${input.currentFunction}。`,
    tags: ['轻量人物卡', '势力人物位'],
    roleLayer: input.roleLayer,
    goals: [`先把${input.faction.name}这条线撑住`],
    pressures: [input.stance],
    linkedFactionIds: [input.faction.id],
    linkedLocationIds: [],
    linkedItemIds: [],
    factionRole: input.label,
    rankLevel: input.rankLevel,
    publicIdentity: `${input.faction.name}${input.label.replace(/位$/u, '')}`,
    stance: input.stance,
    currentFunction: input.currentFunction,
    voiceStyle: input.voiceStyle,
    identityMode: 'slot',
    slotKey,
    upgradeCandidate: false,
    provenance: {
      ...input.faction.provenance,
      sourceRef: slotKey,
      createdAt: now,
      updatedAt: now
    }
  }
}

function buildSeatBlueprints(faction: FactionEntityDto): Array<{
  key: string
  label: string
  roleLayer: CharacterEntityDto['roleLayer']
  rankLevel: NonNullable<CharacterEntityDto['rankLevel']>
  stance: string
  currentFunction: string
  voiceStyle: string
}> {
  switch (faction.factionType) {
    case 'sect':
      return [
        { key: 'leader', label: '掌门位', roleLayer: 'core', rankLevel: 'leader', stance: '先保宗门秩序', currentFunction: '拍板宗门大事并压住内斗', voiceStyle: '话少威重，开口就是规矩和底线' },
        { key: 'elder', label: '长老位', roleLayer: 'active', rankLevel: 'senior', stance: '维护本门既得利益', currentFunction: '裁决门内事务并持续施压', voiceStyle: '老辣压人，句句带门规' },
        { key: 'steward', label: '执事位', roleLayer: 'active', rankLevel: 'mid', stance: '先执行上令再谈人情', currentFunction: '执行宗门命令并盯具体人和事', voiceStyle: '命令式说话，口风硬' },
        { key: 'guardian', label: '护法位', roleLayer: 'functional', rankLevel: 'mid', stance: '山门安全优先', currentFunction: '负责武力压场和护住核心场面', voiceStyle: '短句压迫，先动手后说话' },
        { key: 'disciple', label: '门下弟子位', roleLayer: 'functional', rankLevel: 'junior', stance: '只能听命于上层', currentFunction: '跑腿传令、放风探路、补足人手', voiceStyle: '年轻急促，容易露情绪' }
      ]
    case 'clan':
      return [
        { key: 'leader', label: '家主位', roleLayer: 'core', rankLevel: 'leader', stance: '先保家族门面和利益', currentFunction: '拍板家族资源与站队', voiceStyle: '家法压人，话里都是权衡' },
        { key: 'heir', label: '继承人位', roleLayer: 'active', rankLevel: 'senior', stance: '要抢继承资格', currentFunction: '承接家族未来并在内斗里表态', voiceStyle: '压着火气说话，输不起' },
        { key: 'elder', label: '长老位', roleLayer: 'active', rankLevel: 'senior', stance: '守住老规矩和旧利益', currentFunction: '裁决族内事务并替旧势力说话', voiceStyle: '圆滑里带警告' },
        { key: 'steward', label: '管事位', roleLayer: 'functional', rankLevel: 'mid', stance: '先把差事办稳', currentFunction: '管账、跑腿、调配家族内务', voiceStyle: '利索务实，不爱废话' },
        { key: 'guard', label: '护卫位', roleLayer: 'functional', rankLevel: 'junior', stance: '只认主家命令', currentFunction: '护人、护物、护门面', voiceStyle: '直接粗硬，先表忠心' }
      ]
    case 'court':
      return [
        { key: 'leader', label: '掌权位', roleLayer: 'core', rankLevel: 'leader', stance: '先保官面秩序和自己的位置', currentFunction: '拍板官面方向和资源倾斜', voiceStyle: '官腔稳重，句句留余地' },
        { key: 'aide', label: '近臣位', roleLayer: 'active', rankLevel: 'senior', stance: '先保住靠山', currentFunction: '传达意志并替上位者挡刀', voiceStyle: '轻声但有压迫感' },
        { key: 'judge', label: '判事位', roleLayer: 'active', rankLevel: 'mid', stance: '先把案子压向自己想要的结果', currentFunction: '定性、定责、定程序', voiceStyle: '一板一眼，话里都是规矩' },
        { key: 'enforcer', label: '执法位', roleLayer: 'functional', rankLevel: 'mid', stance: '先把人和证据控住', currentFunction: '抓人、押人、盯现场', voiceStyle: '命令式，冷硬直接' },
        { key: 'spy', label: '耳目位', roleLayer: 'functional', rankLevel: 'support', stance: '风向不能丢', currentFunction: '听风、递话、补情报', voiceStyle: '谨慎绕弯，话里藏针' }
      ]
    default:
      return [
        { key: 'leader', label: '首领位', roleLayer: 'core', rankLevel: 'leader', stance: '先保这条线活下去', currentFunction: '拍板势力生意、站队和生死账', voiceStyle: '一句顶一句，压迫感强' },
        { key: 'lieutenant', label: '二把手位', roleLayer: 'active', rankLevel: 'senior', stance: '替首领压场也替自己留后路', currentFunction: '替老大盯人、压事、补刀', voiceStyle: '半命令半试探，口风狠' },
        { key: 'backbone', label: '骨干位', roleLayer: 'active', rankLevel: 'mid', stance: '先把自己这条线守住', currentFunction: '撑住这股势力的日常推进和执行', voiceStyle: '干脆直接，少废话' },
        { key: 'executor', label: '执行位', roleLayer: 'functional', rankLevel: 'mid', stance: '活先办成再说', currentFunction: '具体办事、追人、收尾、跑现场', voiceStyle: '短句、急、带冲劲' },
        { key: 'intel', label: '情报位', roleLayer: 'functional', rankLevel: 'support', stance: '消息不能断', currentFunction: '盯消息、暗线、耳目和风声', voiceStyle: '低声快语，信息密' }
      ]
  }
}

function topUpVisibleCharacterCards(input: {
  projectId: string
  characters: CharacterEntityDto[]
  factions: FactionEntityDto[]
}): CharacterEntityDto[] {
  if (input.characters.length >= MIN_VISIBLE_CHARACTER_COUNT) {
    return input.characters
  }

  const candidates: Array<{ memberCount: number; entity: CharacterEntityDto }> = []

  for (const faction of input.factions) {
    const members = input.characters.filter((character) => character.linkedFactionIds.includes(faction.id))
    const remainingByRole: Record<CharacterEntityDto['roleLayer'], number> = { core: 0, active: 0, functional: 0 }

    for (const member of members) {
      remainingByRole[member.roleLayer] += 1
    }

    for (const blueprint of buildSeatBlueprints(faction)) {
      if (remainingByRole[blueprint.roleLayer] > 0) {
        remainingByRole[blueprint.roleLayer] -= 1
        continue
      }

      candidates.push({
        memberCount: members.length,
        entity: createSeatSlotEntity({
          projectId: input.projectId,
          faction,
          seatKey: blueprint.key,
          label: blueprint.label,
          roleLayer: blueprint.roleLayer,
          rankLevel: blueprint.rankLevel,
          stance: blueprint.stance,
          currentFunction: blueprint.currentFunction,
          voiceStyle: blueprint.voiceStyle
        })
      })
    }
  }

  candidates.sort((left, right) => {
    const memberDelta = left.memberCount - right.memberCount
    if (memberDelta !== 0) return memberDelta
    const leftFactionId = left.entity.linkedFactionIds[0] || ''
    const rightFactionId = right.entity.linkedFactionIds[0] || ''
    const factionDelta = leftFactionId.localeCompare(rightFactionId, 'zh-Hans-CN')
    if (factionDelta !== 0) return factionDelta
    return (left.entity.slotKey || left.entity.id).localeCompare(right.entity.slotKey || right.entity.id, 'zh-Hans-CN')
  })

  const characters = [...input.characters]
  const seenIds = new Set(characters.map((character) => character.id))

  for (const candidate of candidates) {
    if (characters.length >= MIN_VISIBLE_CHARACTER_COUNT) {
      break
    }
    if (seenIds.has(candidate.entity.id)) {
      continue
    }
    characters.push(candidate.entity)
    seenIds.add(candidate.entity.id)
  }

  return characters
}

function createRelationEntities(input: {
  projectId: string
  factionMatrix?: FactionMatrixDto
  factionIdMap: Map<string, string>
}): RelationEntityDto[] {
  if (!input.factionMatrix) return []

  return input.factionMatrix.crossRelations.map((relation) => ({
    id: createEntityId('rel', input.projectId, relation.id, relation.fromFactionId, relation.toFactionId),
    projectId: input.projectId,
    type: 'relation',
    name: relation.description.trim() || relation.relationType,
    aliases: [],
    summary: relation.description.trim(),
    tags: [relation.relationType],
    relationType:
      relation.relationType === 'secret_ally'
        ? 'alliance'
        : relation.relationType === 'secret_enemy'
          ? 'hostility'
          : 'other',
    fromEntityId: input.factionIdMap.get(relation.fromFactionId) || relation.fromFactionId,
    toEntityId: input.factionIdMap.get(relation.toFactionId) || relation.toFactionId,
    provenance: createProvenance(relation.id)
  }))
}

function trimVisibleCharacterCards(input: {
  characters: CharacterEntityDto[]
  focusedCharacterDrafts?: CharacterDraftDto[]
}): CharacterEntityDto[] {
  if (input.characters.length <= MIN_VISIBLE_CHARACTER_COUNT) {
    return input.characters
  }

  const draftNameSet = new Set(
    (input.focusedCharacterDrafts || []).map((draft) => normalizeName(draft.name)).filter(Boolean)
  )

  return [...input.characters]
    .sort((left, right) => {
      const leftDraftMatched = draftNameSet.has(normalizeName(left.name)) ? 0 : 1
      const rightDraftMatched = draftNameSet.has(normalizeName(right.name)) ? 0 : 1
      if (leftDraftMatched !== rightDraftMatched) return leftDraftMatched - rightDraftMatched

      const leftSlot = left.identityMode === 'slot' ? 1 : 0
      const rightSlot = right.identityMode === 'slot' ? 1 : 0
      if (leftSlot !== rightSlot) return leftSlot - rightSlot

      const roleDelta = ROLE_LAYER_WEIGHT[left.roleLayer] - ROLE_LAYER_WEIGHT[right.roleLayer]
      if (roleDelta !== 0) return roleDelta

      const rankDelta =
        RANK_LEVEL_WEIGHT[left.rankLevel || 'support'] - RANK_LEVEL_WEIGHT[right.rankLevel || 'support']
      if (rankDelta !== 0) return rankDelta

      const factionDelta = (left.linkedFactionIds[0] || '').localeCompare(
        right.linkedFactionIds[0] || '',
        'zh-Hans-CN'
      )
      if (factionDelta !== 0) return factionDelta

      return left.name.localeCompare(right.name, 'zh-Hans-CN')
    })
    .slice(0, MIN_VISIBLE_CHARACTER_COUNT)
}

export function buildOutlineCharacterEntityStore(input: {
  projectId: string
  factionMatrix?: FactionMatrixDto
  characterProfilesV2?: CharacterProfileV2Dto[]
  focusedCharacterDrafts?: CharacterDraftDto[]
}): ProjectEntityStoreDto {
  if (!input.factionMatrix) {
    return EMPTY_ENTITY_STORE
  }

  const profileByPlaceholderId = new Map<string, CharacterProfileV2Dto>()
  const profileByName = new Map<string, CharacterProfileV2Dto>()
  const profileBySeatKey = new Map<string, CharacterProfileV2Dto>()
  const draftByName = new Map<string, CharacterDraftDto>()

  for (const profile of input.characterProfilesV2 || []) {
    profileByName.set(normalizeName(profile.name), profile)
    if (profile.id) profileByPlaceholderId.set(profile.id, profile)
    const seatKey = createSeatMatchKey({
      factionId: profile.factionId,
      branchId: profile.branchId,
      roleInFaction: profile.roleInFaction
    })
    if (seatKey !== '||' && !profileBySeatKey.has(seatKey)) {
      profileBySeatKey.set(seatKey, profile)
    }
  }

  for (const draft of input.focusedCharacterDrafts || []) {
    draftByName.set(normalizeName(draft.name), draft)
  }

  const characters: CharacterEntityDto[] = []
  const factions: FactionEntityDto[] = []
  const factionIdMap = new Map<string, string>()

  for (const faction of input.factionMatrix.factions) {
    const memberCharacterIds: string[] = []

    for (const branch of faction.branches) {
      for (const placeholder of branch.characters) {
        const seatKey = createSeatMatchKey({
          factionId: faction.id,
          branchId: branch.id,
          roleInFaction: placeholder.roleInFaction
        })
        const profile =
          profileByPlaceholderId.get(placeholder.id) ||
          profileBySeatKey.get(seatKey) ||
          profileByName.get(normalizeName(placeholder.name))
        const draft = draftByName.get(normalizeName(profile?.name || placeholder.name))
        const entity = createCharacterEntity({
          projectId: input.projectId,
          faction,
          placeholder,
          profile,
          draft
        })
        characters.push(entity)
        memberCharacterIds.push(entity.id)
      }
    }

    const factionEntity = createFactionEntity({
      projectId: input.projectId,
      faction,
      memberCharacterIds
    })
    factions.push(factionEntity)
    factionIdMap.set(faction.id, factionEntity.id)
  }

  const visibleCharacters = trimVisibleCharacterCards({
    characters: topUpVisibleCharacterCards({
      projectId: input.projectId,
      characters,
      factions
    }),
    focusedCharacterDrafts: input.focusedCharacterDrafts
  })

  return {
    characters: visibleCharacters,
    factions,
    locations: [],
    items: [],
    relations: createRelationEntities({
      projectId: input.projectId,
      factionMatrix: input.factionMatrix,
      factionIdMap
    })
  }
}

export function attachMasterEntityIdsToCharacterDrafts(input: {
  drafts: CharacterDraftDto[]
  entityStore: ProjectEntityStoreDto
}): CharacterDraftDto[] {
  const entityIdByName = new Map(
    input.entityStore.characters.map((character) => [normalizeName(character.name), character.id])
  )

  return input.drafts.map((draft) => ({
    ...draft,
    masterEntityId: draft.masterEntityId || entityIdByName.get(normalizeName(draft.name))
  }))
}
