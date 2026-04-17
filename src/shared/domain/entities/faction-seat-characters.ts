import type {
  CharacterEntityDto,
  FactionEntityDto,
  ProjectEntityStoreDto
} from '../../contracts/entities.ts'

export interface FactionSeatBlueprint {
  key: string
  label: string
  roleLayer: CharacterEntityDto['roleLayer']
  rankLevel: NonNullable<CharacterEntityDto['rankLevel']>
  stance: string
  currentFunction: string
  voiceStyle: string
  upgradeCandidate: boolean
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

function createSlotCharacterId(projectId: string, factionId: string, slotKey: string): string {
  return `char_${projectId}_${hashText(`${normalizeName(factionId)}|${normalizeName(slotKey)}`)}`
}

export function isSlotCharacterEntity(entity: CharacterEntityDto): boolean {
  return entity.identityMode === 'slot'
}

function resolveSectLeaderSeatLabel(factionName: string): string {
  if (factionName.includes('宫')) return '宫主位'
  if (factionName.includes('宗')) return '宗主位'
  if (factionName.includes('门') || factionName.includes('派')) return '掌门位'
  if (factionName.includes('阁')) return '阁主位'
  if (factionName.includes('殿')) return '殿主位'
  return '掌门位'
}

function resolveOrganizationLeaderSeatLabel(factionName: string): string {
  if (factionName.includes('会')) return '会主位'
  if (factionName.includes('帮')) return '帮主位'
  if (factionName.includes('盟')) return '盟主位'
  if (factionName.includes('堂')) return '堂主位'
  if (factionName.includes('阁')) return '阁主位'
  return '首领位'
}

function toPublicIdentity(faction: FactionEntityDto, label: string): string {
  return `${faction.name}${label.replace(/位$/u, '')}`
}

function createBlueprint(
  key: string,
  label: string,
  roleLayer: CharacterEntityDto['roleLayer'],
  rankLevel: NonNullable<CharacterEntityDto['rankLevel']>,
  stance: string,
  currentFunction: string,
  voiceStyle: string
): FactionSeatBlueprint {
  return {
    key,
    label,
    roleLayer,
    rankLevel,
    stance,
    currentFunction,
    voiceStyle,
    upgradeCandidate: roleLayer !== 'functional'
  }
}

export function buildFactionSeatBlueprints(faction: FactionEntityDto): FactionSeatBlueprint[] {
  switch (faction.factionType) {
    case 'sect':
      return [
        createBlueprint(
          'leader',
          resolveSectLeaderSeatLabel(faction.name),
          'core',
          'leader',
          '先保宗门秩序',
          '拍板宗门大事并压住内斗',
          '话少威重，开口就是规矩和底线'
        ),
        createBlueprint(
          'elder',
          '长老位',
          'active',
          'senior',
          '维护本门既得利益',
          '裁决门内事务并持续施压',
          '老辣压人，句句带门规'
        ),
        createBlueprint(
          'steward',
          '执事位',
          'active',
          'mid',
          '先执行上令再谈人情',
          '执行宗门命令并盯具体人和事',
          '命令式说话，口风硬'
        ),
        createBlueprint(
          'guardian',
          '护法位',
          'functional',
          'mid',
          '山门安全优先',
          '负责武力压场和护住核心场面',
          '短句压迫，先动手后说话'
        ),
        createBlueprint(
          'disciple',
          '门下弟子位',
          'functional',
          'junior',
          '只能听命于上层',
          '跑腿传令、放风探路、补足人手',
          '年轻急促，容易露情绪'
        )
      ]
    case 'clan':
      return [
        createBlueprint(
          'leader',
          '家主位',
          'core',
          'leader',
          '先保家族门面和利益',
          '拍板家族资源与站队',
          '家法压人，话里都是权衡'
        ),
        createBlueprint(
          'heir',
          '继承人位',
          'active',
          'senior',
          '要抢继承资格',
          '承接家族未来并在内斗里表态',
          '压着火气说话，输不起'
        ),
        createBlueprint(
          'elder',
          '长老位',
          'active',
          'senior',
          '守住老规矩和旧利益',
          '裁决族内事务并替旧势力说话',
          '圆滑里带警告'
        ),
        createBlueprint(
          'steward',
          '管事位',
          'functional',
          'mid',
          '先把差事办稳',
          '管账、跑腿、调配家族内务',
          '利索务实，不爱废话'
        ),
        createBlueprint(
          'guard',
          '护卫位',
          'functional',
          'junior',
          '只认主家命令',
          '护人、护物、护门面',
          '直接粗硬，先表忠心'
        )
      ]
    case 'organization':
      return [
        createBlueprint(
          'leader',
          resolveOrganizationLeaderSeatLabel(faction.name),
          'core',
          'leader',
          '先保这条线活下去',
          '拍板势力生意、站队和生死账',
          '一句顶一句，压迫感强'
        ),
        createBlueprint(
          'lieutenant',
          '二把手位',
          'active',
          'senior',
          '替首领压场也替自己留后路',
          '替老大盯人、压事、补刀',
          '半命令半试探，口风狠'
        ),
        createBlueprint(
          'backbone',
          '骨干位',
          'active',
          'mid',
          '先把自己这条线守住',
          '撑住这股势力的日常推进和执行',
          '干脆直接，少废话'
        ),
        createBlueprint(
          'executor',
          '执行位',
          'functional',
          'mid',
          '活先办成再说',
          '具体办事、追人、收尾、跑现场',
          '短句、急、带冲劲'
        ),
        createBlueprint(
          'intel',
          '情报位',
          'functional',
          'support',
          '消息不能断',
          '盯消息、暗线、耳目和风声',
          '低声快语，信息密'
        )
      ]
    case 'court':
      return [
        createBlueprint(
          'leader',
          '掌权位',
          'core',
          'leader',
          '先保官面秩序和自己的位置',
          '拍板官面方向和资源倾斜',
          '官腔稳重，句句留余地'
        ),
        createBlueprint(
          'aide',
          '近臣位',
          'active',
          'senior',
          '先保住靠山',
          '传达意志并替上位者挡刀',
          '轻声但有压迫感'
        ),
        createBlueprint(
          'judge',
          '判事位',
          'active',
          'mid',
          '先把案子压向自己想要的结果',
          '定性、定责、定程序',
          '一板一眼，话里都是规矩'
        ),
        createBlueprint(
          'enforcer',
          '执法位',
          'functional',
          'mid',
          '先把人和证据控住',
          '抓人、押人、盯现场',
          '命令式，冷硬直接'
        ),
        createBlueprint(
          'spy',
          '耳目位',
          'functional',
          'support',
          '风向不能丢',
          '听风、递话、补情报',
          '谨慎绕弯，话里藏针'
        )
      ]
    default:
      return [
        createBlueprint(
          'leader',
          '领头位',
          'core',
          'leader',
          '先保住这伙人的方向',
          '决定这股势力怎么压人和怎么站队',
          '定调式说话，压得住场'
        ),
        createBlueprint(
          'backbone',
          '骨干位',
          'active',
          'senior',
          '先撑住局面',
          '具体接住主要推进任务',
          '话少事多，执行感强'
        ),
        createBlueprint(
          'deputy',
          '副手位',
          'active',
          'mid',
          '得把老大的意思办明白',
          '承上启下、对人施压、补缺口',
          '反应快，嘴上不饶人'
        ),
        createBlueprint(
          'executor',
          '执行位',
          'functional',
          'mid',
          '先办事，再谈别的',
          '跑腿、跟线、落地执行',
          '直接、短促'
        ),
        createBlueprint(
          'outer',
          '外围位',
          'functional',
          'junior',
          '先别被踢出局',
          '补位、传话、看风向',
          '谨慎、试探'
        )
      ]
  }
}

function buildRoleCounts(characters: CharacterEntityDto[]): Record<CharacterEntityDto['roleLayer'], number> {
  const counts: Record<CharacterEntityDto['roleLayer'], number> = {
    core: 0,
    active: 0,
    functional: 0
  }

  for (const character of characters) {
    counts[character.roleLayer] += 1
  }

  return counts
}

function mergeFactionIds(left: string[], right: string[]): string[] {
  return [...new Set([...left, ...right].filter(Boolean))]
}

function linkNamedCharactersToMemberFactions(
  characters: CharacterEntityDto[],
  factions: FactionEntityDto[]
): CharacterEntityDto[] {
  const factionIdsByCharacterId = new Map<string, Set<string>>()

  for (const faction of factions) {
    for (const characterId of faction.memberCharacterIds) {
      if (!factionIdsByCharacterId.has(characterId)) {
        factionIdsByCharacterId.set(characterId, new Set<string>())
      }
      factionIdsByCharacterId.get(characterId)?.add(faction.id)
    }
  }

  return characters.map((character) => ({
    ...character,
    linkedFactionIds: mergeFactionIds(
      character.linkedFactionIds,
      [...(factionIdsByCharacterId.get(character.id) || [])]
    )
  }))
}

function createSlotCharacter(input: {
  faction: FactionEntityDto
  blueprint: FactionSeatBlueprint
  existing?: CharacterEntityDto
}): CharacterEntityDto {
  const { faction, blueprint, existing } = input
  const now = new Date().toISOString()
  const slotKey = `${faction.id}:${blueprint.key}`

  return {
    id: existing?.id || createSlotCharacterId(faction.projectId, faction.id, slotKey),
    projectId: faction.projectId,
    type: 'character',
    name: `${faction.name}·${blueprint.label}`,
    aliases: [],
    summary: `${faction.name}里的${blueprint.label}，${blueprint.currentFunction}。`,
    tags: ['轻量人物卡', '势力人物位'],
    roleLayer: blueprint.roleLayer,
    goals: [`先把${faction.name}这条线撑住`],
    pressures: [blueprint.stance],
    linkedFactionIds: [faction.id],
    linkedLocationIds: [],
    linkedItemIds: [],
    identityMode: 'slot',
    slotKey,
    factionRole: blueprint.label,
    rankLevel: blueprint.rankLevel,
    publicIdentity: toPublicIdentity(faction, blueprint.label),
    stance: blueprint.stance,
    currentFunction: blueprint.currentFunction,
    voiceStyle: blueprint.voiceStyle,
    upgradeCandidate: blueprint.upgradeCandidate,
    firstSeenEpisode: existing?.firstSeenEpisode,
    activeEpisodeRange: existing?.activeEpisodeRange,
    provenance: existing?.provenance
      ? {
          ...existing.provenance,
          updatedAt: now
        }
      : {
          ...faction.provenance,
          sourceRef: slotKey,
          createdAt: now,
          updatedAt: now
        }
  }
}

export function syncFactionSeatCharacters(entityStore: ProjectEntityStoreDto): ProjectEntityStoreDto {
  const namedCharacters = linkNamedCharactersToMemberFactions(
    entityStore.characters.filter((character) => !isSlotCharacterEntity(character)),
    entityStore.factions
  )
  const slotCharacterByKey = new Map(
    entityStore.characters
      .filter((character) => isSlotCharacterEntity(character) && character.slotKey)
      .map((character) => [character.slotKey as string, character])
  )
  const namedCharacterById = new Map(namedCharacters.map((character) => [character.id, character]))
  const slotCharacters: CharacterEntityDto[] = []

  for (const faction of entityStore.factions) {
    const factionMemberIds = new Set<string>([
      ...faction.memberCharacterIds,
      ...namedCharacters
        .filter((character) => character.linkedFactionIds.includes(faction.id))
        .map((character) => character.id)
    ])
    const namedFactionMembers = [...factionMemberIds]
      .map((characterId) => namedCharacterById.get(characterId))
      .filter((character): character is CharacterEntityDto => Boolean(character))
    const remainingByRole = buildRoleCounts(namedFactionMembers)

    for (const blueprint of buildFactionSeatBlueprints(faction)) {
      if (remainingByRole[blueprint.roleLayer] > 0) {
        remainingByRole[blueprint.roleLayer] -= 1
        continue
      }

      const slotKey = `${faction.id}:${blueprint.key}`
      slotCharacters.push(
        createSlotCharacter({
          faction,
          blueprint,
          existing: slotCharacterByKey.get(slotKey)
        })
      )
    }
  }

  return {
    ...entityStore,
    characters: [...namedCharacters, ...slotCharacters]
  }
}
