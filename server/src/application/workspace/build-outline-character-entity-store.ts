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

const COMPOUND_FAMILY_NAMES = [
  '慕容',
  '欧阳',
  '上官',
  '司徒',
  '诸葛',
  '东方',
  '南宫',
  '夏侯',
  '皇甫',
  '尉迟',
  '公孙'
]

function inferFamilyPrefix(profile: CharacterProfileV2Dto): string {
  const text = [
    profile.name,
    profile.identity,
    profile.biography,
    profile.plotFunction,
    profile.values
  ]
    .join('\n')
    .trim()

  for (const prefix of COMPOUND_FAMILY_NAMES) {
    if (
      profile.name.startsWith(prefix) ||
      text.includes(`${prefix}家`) ||
      text.includes(`${prefix}世家`) ||
      text.includes(`${prefix}家族`)
    ) {
      return prefix
    }
  }

  const explicitFamily = text.match(/([\p{Script=Han}]{1,4})(?:家族|世家)/u)?.[1]
  return explicitFamily || ''
}

function isFamilyAttachedProfile(profile: CharacterProfileV2Dto): boolean {
  const text = [
    profile.name,
    profile.identity,
    profile.biography,
    profile.plotFunction,
    profile.publicMask
  ]
    .join('\n')
    .trim()

  return /(管家|家臣|族人|暗卫|护卫|下属|密令|大小姐|嫡女|圣女|家主|家族)/u.test(text)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildProfileFactionText(profile: CharacterProfileV2Dto): string {
  return [
    profile.name,
    profile.identity,
    profile.biography,
    profile.plotFunction,
    profile.publicMask,
    profile.values,
    profile.goal
  ]
    .join('\n')
    .trim()
}

function hasExplicitFactionAuthority(text: string, faction: FactionDto): boolean {
  const factionName = faction.name.trim()
  if (!factionName) return false
  const escapedFactionName = escapeRegExp(factionName)

  if (
    new RegExp(
      `${escapedFactionName}(?:盟主|长老|特使|护法|圣女|嫡女|大小姐|掌门|宗主|外门|内门|弟子|亲传|管家|家臣|暗卫|骨干|执行|情报)?`,
      'u'
    ).test(text)
  ) {
    return true
  }

  if (/(仙盟|联盟|盟)/u.test(factionName)) {
    return /(?:正道|天衍|玄天)?仙盟(?:盟主|长老|特使|护法|圣女|嫡系|大小姐|爪牙|亲信|暗线)?|盟主直属|盟主亲信/u.test(text)
  }

  if (/(宗|门|派)/u.test(factionName)) {
    const shortName = factionName.replace(/(?:宗|门|派)$/u, '')
    return new RegExp(
      `${escapeRegExp(shortName)}(?:宗|门|派)(?:掌门|宗主|长老|护法|执法堂|外门|内门|弟子|亲传|大弟子)?`,
      'u'
    ).test(text)
  }

  if (/(家族|世家|氏|家)/u.test(factionName)) {
    const shortName = factionName.replace(/(?:家族|世家|氏|家)$/u, '')
    return new RegExp(
      `${escapeRegExp(shortName)}(?:家族|世家|氏|家)(?:家主|嫡女|大小姐|管家|家臣|暗卫|护卫)?`,
      'u'
    ).test(text)
  }

  return false
}

function inferProfileFactionAuthority(
  profile: CharacterProfileV2Dto,
  factions: FactionDto[]
): { factionId: string; branchId?: string } | undefined {
  const text = buildProfileFactionText(profile)
  if (!text) return undefined

  const matches = factions.filter((faction) => hasExplicitFactionAuthority(text, faction))
  if (matches.length !== 1) return undefined

  const faction = matches[0]
  const branch =
    faction.branches.find((candidate) =>
      candidate.characters.some(
        (placeholder) => normalizeName(placeholder.name) === normalizeName(profile.name)
      )
    ) || faction.branches[0]
  return {
    factionId: faction.id,
    branchId: branch?.id || profile.branchId
  }
}

function normalizeProfileFactionAssignments(
  profiles: CharacterProfileV2Dto[],
  factions: FactionDto[] = []
): CharacterProfileV2Dto[] {
  const familyAuthorityByPrefix = new Map<
    string,
    { factionId: string; branchId?: string }
  >()

  for (const profile of profiles) {
    if (!profile.factionId) continue
    if (profile.depthLevel !== 'core' && profile.roleInFaction !== 'leader') continue

    const prefix = inferFamilyPrefix(profile)
    if (!prefix || familyAuthorityByPrefix.has(prefix)) continue
    familyAuthorityByPrefix.set(prefix, {
      factionId: profile.factionId,
      branchId: profile.branchId
    })
  }

  return profiles.map((profile) => {
    const factionAuthority = inferProfileFactionAuthority(profile, factions)
    if (
      factionAuthority &&
      normalizeName(profile.factionId) !== normalizeName(factionAuthority.factionId)
    ) {
      return {
        ...profile,
        factionId: factionAuthority.factionId,
        branchId: factionAuthority.branchId || profile.branchId
      }
    }

    const prefix = inferFamilyPrefix(profile)
    const authority = prefix ? familyAuthorityByPrefix.get(prefix) : undefined
    if (
      !authority ||
      !isFamilyAttachedProfile(profile) ||
      normalizeName(profile.factionId) === normalizeName(authority.factionId)
    ) {
      return profile
    }

    return {
      ...profile,
      factionId: authority.factionId,
      branchId: authority.branchId || profile.branchId
    }
  })
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

function resolveMinVisibleCharacterCount(totalEpisodes: number | undefined): number {
  return MIN_VISIBLE_CHARACTER_COUNT
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

function createPlaceholderMatchKey(input: {
  factionId?: string | null
  branchId?: string | null
  placeholderId?: string | null
}): string {
  return [input.factionId, input.branchId, input.placeholderId]
    .map((value) => normalizeName(value || ''))
    .join('|')
}

function createProvenance(sourceRef: string): {
  provenanceTier: 'ai_suggested'
  originAuthorityType: 'ai_suggested'
  originDeclaredBy: 'system'
  sourceStage: 'outline'
  sourceRef: string
  createdAt: string
  updatedAt: string
} {
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

function toFactionType(positioning: string, name = ''): FactionEntityDto['factionType'] {
  const text = `${name}\n${positioning}`.trim()
  if (/(盟|联盟|仙盟|组织|会)/.test(text)) return 'organization'
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

function toRankLevel(input: {
  roleInFaction?: string | null
  depthLevel?: 'core' | 'mid' | 'extra'
}): NonNullable<CharacterEntityDto['rankLevel']> {
  if (input.roleInFaction === 'leader') return 'leader'
  if (input.depthLevel === 'core') return 'senior'
  if (input.depthLevel === 'mid') return 'mid'
  return 'support'
}

function buildCharacterSummary(
  profile: CharacterProfileV2Dto | undefined,
  draft: CharacterDraftDto | undefined,
  fallbackIdentity: string
): string {
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
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const text = value?.trim() || ''
    if (!text || seen.has(text)) continue
    seen.add(text)
    result.push(text)
  }
  return result
}

function mergeStringArrayValues(...lists: Array<string[] | undefined>): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const list of lists) {
    for (const value of list || []) {
      const text = value.trim()
      if (!text || seen.has(text)) continue
      seen.add(text)
      result.push(text)
    }
  }

  return result
}

function isProfileFactionCompatible(input: {
  profile?: CharacterProfileV2Dto
  faction: FactionDto
}): boolean {
  const profileFactionId = normalizeName(input.profile?.factionId)
  if (!profileFactionId) return true
  return profileFactionId === normalizeName(input.faction.id)
}

function isProfileSeatCompatible(input: {
  profile?: CharacterProfileV2Dto
  faction: FactionDto
  branch: FactionDto['branches'][number]
}): boolean {
  const profile = input.profile
  if (!profile) return true
  if (!isProfileFactionCompatible({ profile, faction: input.faction })) return false

  const profileBranchId = normalizeName(profile.branchId)
  if (!profileBranchId) return true
  return profileBranchId === normalizeName(input.branch.id)
}

function hasCrossFactionCoverCue(input: {
  faction: FactionDto
  branch: FactionDto['branches'][number]
  placeholder: FactionDto['branches'][number]['characters'][number]
}): boolean {
  const text = [
    input.faction.name,
    input.faction.positioning,
    input.branch.name,
    input.branch.positioning,
    input.placeholder.identity,
    input.placeholder.plotFunction,
    input.placeholder.coreMotivation
  ]
    .join('\n')
    .trim()

  return /(卧底|潜伏|内应|安插|渗透|监视|接近|假意|冒充|伪装)/u.test(text)
}

function shouldSkipPlaceholderForProfileAuthority(input: {
  faction: FactionDto
  branch: FactionDto['branches'][number]
  placeholder: FactionDto['branches'][number]['characters'][number]
  nameProfile?: CharacterProfileV2Dto
}): boolean {
  const profileFactionId = normalizeName(input.nameProfile?.factionId)
  if (!profileFactionId) return false
  if (profileFactionId === normalizeName(input.faction.id)) return false
  return !hasCrossFactionCoverCue(input)
}

function createCharacterEntity(input: {
  projectId: string
  faction: FactionDto
  placeholder: FactionDto['branches'][number]['characters'][number]
  profile?: CharacterProfileV2Dto
  draft?: CharacterDraftDto
}): CharacterEntityDto {
  const { projectId, faction, placeholder, profile, draft } = input
  const entityId = createEntityId(
    'char',
    projectId,
    faction.id,
    placeholder.id,
    profile?.name || placeholder.name
  )
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
    rankLevel: toRankLevel({
      roleInFaction: placeholder.roleInFaction,
      depthLevel: placeholder.depthLevel
    }),
    publicIdentity,
    stance: profile?.values?.trim() || '',
    currentFunction: profile?.plotFunction?.trim() || placeholder.plotFunction.trim(),
    voiceStyle: profile?.personality?.trim() || '',
    identityMode: 'named',
    upgradeCandidate: !draft?.name?.trim(),
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
    factionType: toFactionType(faction.positioning, faction.name),
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
  const goals = buildSeatSlotGoals({
    factionName: input.faction.name,
    label: input.label,
    stance: input.stance,
    currentFunction: input.currentFunction
  })

  return {
    id: createEntityId('char', input.projectId, input.faction.id, slotKey),
    projectId: input.projectId,
    type: 'character',
    name: `${input.faction.name}·${input.label}`,
    aliases: [],
    summary: `${input.faction.name}里的${input.label}，${input.currentFunction}。`,
    tags: ['轻量人物卡', '势力人物位'],
    roleLayer: input.roleLayer,
    goals,
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

function createCharacterEntityFromProfile(input: {
  projectId: string
  faction: FactionEntityDto
  profile: CharacterProfileV2Dto
  draft?: CharacterDraftDto
}): CharacterEntityDto {
  const { projectId, faction, profile, draft } = input
  const summary = buildCharacterSummary(profile, draft, profile.identity)
  const roleLayer = draft?.roleLayer || toRoleLayer(profile.depthLevel)

  return {
    id: createEntityId('char', projectId, faction.id, 'profile', profile.id || profile.name, profile.name),
    projectId,
    type: 'character',
    name: profile.name.trim(),
    aliases: [],
    summary,
    tags: [faction.name.trim(), profile.roleInFaction || '', profile.depthLevel].filter(Boolean),
    roleLayer,
    goals: mergeStringList(draft?.goal, profile.goal, profile.values),
    pressures: mergeStringList(draft?.hiddenPressure, profile.hiddenPressure, profile.fear),
    linkedFactionIds: [faction.id],
    linkedLocationIds: [],
    linkedItemIds: [],
    factionRole: profile.roleInFaction,
    rankLevel: toRankLevel({
      roleInFaction: profile.roleInFaction,
      depthLevel: profile.depthLevel
    }),
    publicIdentity: profile.identity?.trim() || draft?.identity?.trim() || '',
    stance: profile.values?.trim() || draft?.values?.trim() || '',
    currentFunction: profile.plotFunction?.trim() || draft?.plotFunction?.trim() || '',
    voiceStyle: profile.personality?.trim() || draft?.personality?.trim() || '',
    identityMode: 'named',
    upgradeCandidate: !draft?.name?.trim(),
    provenance: createProvenance(profile.id || profile.name)
  }
}

function buildSeatSlotGoals(input: {
  factionName: string
  label: string
  stance: string
  currentFunction: string
}): string[] {
  const label = input.label
  if (/护法/u.test(label)) return ['守住山门安全，关键冲突里负责武力压场']
  if (/门下弟子/u.test(label)) return ['递话探路，把上层命令和现场风声带到台前']
  if (/情报|耳目/u.test(label)) return ['抢先拿到消息，掌控对手下一步动作']
  if (/执行|执法/u.test(label)) return ['把追人、控场、收尾这些脏活办成']
  if (/执事|管事/u.test(label)) return ['盯住具体差事，让资源和命令落到人身上']
  if (/长老|判事/u.test(label)) return ['借规则定责施压，让局面按本方利益走']
  if (/掌门|首领|掌权|家主/u.test(label)) return [`拍板${input.factionName}的站队和代价`]
  if (/护卫/u.test(label)) return ['护住主家人和关键物件，必要时先动手']
  if (/继承/u.test(label)) return ['抢住继承资格，在家族内斗里表态']
  if (/近臣|二把手/u.test(label)) return ['替上位者挡刀压事，同时给自己留后路']
  if (/骨干/u.test(label)) return ['承接日常推进，把松散命令变成具体行动']
  return [input.currentFunction || input.stance].filter(Boolean)
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
        {
          key: 'leader',
          label: '掌门位',
          roleLayer: 'core',
          rankLevel: 'leader',
          stance: '先保宗门秩序',
          currentFunction: '拍板宗门大事并压住内斗',
          voiceStyle: '话少威重，开口就是规矩和底线'
        },
        {
          key: 'elder',
          label: '长老位',
          roleLayer: 'active',
          rankLevel: 'senior',
          stance: '维护本门既得利益',
          currentFunction: '裁决门内事务并持续施压',
          voiceStyle: '老辣压人，句句带门规'
        },
        {
          key: 'steward',
          label: '执事位',
          roleLayer: 'active',
          rankLevel: 'mid',
          stance: '先执行上令再谈人情',
          currentFunction: '执行宗门命令并盯具体人和事',
          voiceStyle: '命令式说话，口风硬'
        },
        {
          key: 'guardian',
          label: '护法位',
          roleLayer: 'functional',
          rankLevel: 'mid',
          stance: '山门安全优先',
          currentFunction: '负责武力压场和护住核心场面',
          voiceStyle: '短句压迫，先动手后说话'
        },
        {
          key: 'disciple',
          label: '门下弟子位',
          roleLayer: 'functional',
          rankLevel: 'junior',
          stance: '只能听命于上层',
          currentFunction: '跑腿传令、放风探路、补足人手',
          voiceStyle: '年轻急促，容易露情绪'
        }
      ]
    case 'clan':
      return [
        {
          key: 'leader',
          label: '家主位',
          roleLayer: 'core',
          rankLevel: 'leader',
          stance: '先保家族门面和利益',
          currentFunction: '拍板家族资源与站队',
          voiceStyle: '家法压人，话里都是权衡'
        },
        {
          key: 'heir',
          label: '继承人位',
          roleLayer: 'active',
          rankLevel: 'senior',
          stance: '要抢继承资格',
          currentFunction: '承接家族未来并在内斗里表态',
          voiceStyle: '压着火气说话，输不起'
        },
        {
          key: 'elder',
          label: '长老位',
          roleLayer: 'active',
          rankLevel: 'senior',
          stance: '守住老规矩和旧利益',
          currentFunction: '裁决族内事务并替旧势力说话',
          voiceStyle: '圆滑里带警告'
        },
        {
          key: 'steward',
          label: '管事位',
          roleLayer: 'functional',
          rankLevel: 'mid',
          stance: '先把差事办稳',
          currentFunction: '管账、跑腿、调配家族内务',
          voiceStyle: '利索务实，不爱废话'
        },
        {
          key: 'guard',
          label: '护卫位',
          roleLayer: 'functional',
          rankLevel: 'junior',
          stance: '只认主家命令',
          currentFunction: '护人、护物、护门面',
          voiceStyle: '直接粗硬，先表忠心'
        }
      ]
    case 'court':
      return [
        {
          key: 'leader',
          label: '掌权位',
          roleLayer: 'core',
          rankLevel: 'leader',
          stance: '先保官面秩序和自己的位置',
          currentFunction: '拍板官面方向和资源倾斜',
          voiceStyle: '官腔稳重，句句留余地'
        },
        {
          key: 'aide',
          label: '近臣位',
          roleLayer: 'active',
          rankLevel: 'senior',
          stance: '先保住靠山',
          currentFunction: '传达意志并替上位者挡刀',
          voiceStyle: '轻声但有压迫感'
        },
        {
          key: 'judge',
          label: '判事位',
          roleLayer: 'active',
          rankLevel: 'mid',
          stance: '先把案子压向自己想要的结果',
          currentFunction: '定性、定责、定程序',
          voiceStyle: '一板一眼，话里都是规矩'
        },
        {
          key: 'enforcer',
          label: '执法位',
          roleLayer: 'functional',
          rankLevel: 'mid',
          stance: '先把人和证据控住',
          currentFunction: '抓人、押人、盯现场',
          voiceStyle: '命令式，冷硬直接'
        },
        {
          key: 'spy',
          label: '耳目位',
          roleLayer: 'functional',
          rankLevel: 'support',
          stance: '风向不能丢',
          currentFunction: '听风、递话、补情报',
          voiceStyle: '谨慎绕弯，话里藏针'
        }
      ]
    default:
      return [
        {
          key: 'leader',
          label: '首领位',
          roleLayer: 'core',
          rankLevel: 'leader',
          stance: '先保这条线活下去',
          currentFunction: '拍板势力生意、站队和生死账',
          voiceStyle: '一句顶一句，压迫感强'
        },
        {
          key: 'lieutenant',
          label: '二把手位',
          roleLayer: 'active',
          rankLevel: 'senior',
          stance: '替首领压场也替自己留后路',
          currentFunction: '替老大盯人、压事、补刀',
          voiceStyle: '半命令半试探，口风狠'
        },
        {
          key: 'backbone',
          label: '骨干位',
          roleLayer: 'active',
          rankLevel: 'mid',
          stance: '先把日常执行线压稳',
          currentFunction: '承接这股势力的日常推进和执行',
          voiceStyle: '干脆直接，少废话'
        },
        {
          key: 'executor',
          label: '执行位',
          roleLayer: 'functional',
          rankLevel: 'mid',
          stance: '活先办成再说',
          currentFunction: '具体办事、追人、收尾、跑现场',
          voiceStyle: '短句、急、带冲劲'
        },
        {
          key: 'intel',
          label: '情报位',
          roleLayer: 'functional',
          rankLevel: 'support',
          stance: '消息不能断',
          currentFunction: '盯消息、暗线、耳目和风声',
          voiceStyle: '低声快语，信息密'
        }
      ]
  }
}

function topUpVisibleCharacterCards(input: {
  projectId: string
  characters: CharacterEntityDto[]
  factions: FactionEntityDto[]
  minVisibleCharacterCount?: number
}): CharacterEntityDto[] {
  const minVisibleCharacterCount = Math.max(0, input.minVisibleCharacterCount ?? MIN_VISIBLE_CHARACTER_COUNT)
  if (input.characters.length >= minVisibleCharacterCount) {
    return input.characters
  }

  const candidates: Array<{ memberCount: number; entity: CharacterEntityDto }> = []

  for (const faction of input.factions) {
    const members = input.characters.filter((character) =>
      character.linkedFactionIds.includes(faction.id)
    )
    const remainingByRole: Record<CharacterEntityDto['roleLayer'], number> = {
      core: 0,
      active: 0,
      functional: 0
    }

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
    return (left.entity.slotKey || left.entity.id).localeCompare(
      right.entity.slotKey || right.entity.id,
      'zh-Hans-CN'
    )
  })

  const characters = [...input.characters]
  const seenIds = new Set(characters.map((character) => character.id))

  for (const candidate of candidates) {
    if (characters.length >= minVisibleCharacterCount) {
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
    id: createEntityId(
      'rel',
      input.projectId,
      relation.id,
      relation.fromFactionId,
      relation.toFactionId
    ),
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
        RANK_LEVEL_WEIGHT[left.rankLevel || 'support'] -
        RANK_LEVEL_WEIGHT[right.rankLevel || 'support']
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

function resolveProfileFactionEntity(input: {
  profile: CharacterProfileV2Dto
  draft?: CharacterDraftDto
  factions: FactionEntityDto[]
  factionIdMap: Map<string, string>
}): FactionEntityDto | null {
  const mappedFactionId = input.profile.factionId
    ? input.factionIdMap.get(input.profile.factionId)
    : undefined
  if (mappedFactionId) {
    return input.factions.find((faction) => faction.id === mappedFactionId) || null
  }

  const text = [
    input.profile.identity,
    input.profile.biography,
    input.profile.plotFunction,
    input.draft?.identity,
    input.draft?.biography,
    input.draft?.plotFunction
  ]
    .join('\n')
    .trim()

  return input.factions.find((faction) => text.includes(faction.name)) || null
}

function addMissingProfileCharacters(input: {
  projectId: string
  characters: CharacterEntityDto[]
  factions: FactionEntityDto[]
  profiles: CharacterProfileV2Dto[]
  draftByName: Map<string, CharacterDraftDto>
  factionIdMap: Map<string, string>
}): CharacterEntityDto[] {
  const characters = [...input.characters]
  const existingNames = new Set(characters.map((character) => normalizeName(character.name)))

  for (const profile of input.profiles) {
    const normalizedProfileName = normalizeName(profile.name)
    if (!normalizedProfileName || existingNames.has(normalizedProfileName)) continue

    const draft = input.draftByName.get(normalizedProfileName)
    const faction = resolveProfileFactionEntity({
      profile,
      draft,
      factions: input.factions,
      factionIdMap: input.factionIdMap
    })
    if (!faction) continue

    const entity = createCharacterEntityFromProfile({
      projectId: input.projectId,
      faction,
      profile,
      draft
    })
    characters.push(entity)
    existingNames.add(normalizedProfileName)
    if (!faction.memberCharacterIds.includes(entity.id)) {
      faction.memberCharacterIds.push(entity.id)
    }
  }

  return characters
}

function deduplicateNamedCharactersByName(input: {
  characters: CharacterEntityDto[]
  factions: FactionEntityDto[]
  profileByName: Map<string, CharacterProfileV2Dto>
  factionIdMap: Map<string, string>
}): CharacterEntityDto[] {
  const canonicalByName = new Map<string, CharacterEntityDto>()
  const idReplacement = new Map<string, string>()

  const getScore = (character: CharacterEntityDto): number => {
    const profile = input.profileByName.get(normalizeName(character.name))
    const declaredFactionId = profile?.factionId ? input.factionIdMap.get(profile.factionId) : ''
    const declaredFactionPenalty =
      declaredFactionId && !character.linkedFactionIds.includes(declaredFactionId) ? 1000 : 0
    const upgradePenalty = character.upgradeCandidate ? 100 : 0
    return declaredFactionPenalty + upgradePenalty + ROLE_LAYER_WEIGHT[character.roleLayer]
  }

  const mergeCharacter = (
    primary: CharacterEntityDto,
    secondary: CharacterEntityDto
  ): CharacterEntityDto => {
    const profile = input.profileByName.get(normalizeName(primary.name))
    const declaredFactionId = profile?.factionId ? input.factionIdMap.get(profile.factionId) : ''
    const linkedFactionIds = declaredFactionId
      ? [declaredFactionId]
      : mergeStringArrayValues(primary.linkedFactionIds, secondary.linkedFactionIds)

    return {
      ...primary,
      aliases: mergeStringArrayValues(primary.aliases, secondary.aliases),
      tags: mergeStringArrayValues(primary.tags, secondary.tags),
      goals: mergeStringArrayValues(primary.goals, secondary.goals),
      pressures: mergeStringArrayValues(primary.pressures, secondary.pressures),
      linkedFactionIds,
      linkedLocationIds: mergeStringArrayValues(
        primary.linkedLocationIds,
        secondary.linkedLocationIds
      ),
      linkedItemIds: mergeStringArrayValues(primary.linkedItemIds, secondary.linkedItemIds),
      summary: primary.summary || secondary.summary,
      publicIdentity: primary.publicIdentity || secondary.publicIdentity,
      stance: primary.stance || secondary.stance,
      currentFunction: primary.currentFunction || secondary.currentFunction,
      voiceStyle: primary.voiceStyle || secondary.voiceStyle,
      upgradeCandidate: Boolean(primary.upgradeCandidate && secondary.upgradeCandidate)
    }
  }

  for (const character of input.characters) {
    if (character.identityMode === 'slot') continue

    const normalizedName = normalizeName(character.name)
    if (!normalizedName) continue

    const existing = canonicalByName.get(normalizedName)
    if (!existing) {
      canonicalByName.set(normalizedName, character)
      idReplacement.set(character.id, character.id)
      continue
    }

    const primary = getScore(character) < getScore(existing) ? character : existing
    const secondary = primary.id === character.id ? existing : character
    const merged = mergeCharacter(primary, secondary)
    canonicalByName.set(normalizedName, merged)
    idReplacement.set(primary.id, merged.id)
    idReplacement.set(secondary.id, merged.id)
  }

  for (const faction of input.factions) {
    const nextMemberIds = new Set<string>()
    for (const memberId of faction.memberCharacterIds) {
      const replacementId = idReplacement.get(memberId) || memberId
      const replacementCharacter = [...canonicalByName.values()].find(
        (character) => character.id === replacementId
      )
      if (
        replacementCharacter &&
        !replacementCharacter.linkedFactionIds.includes(faction.id)
      ) {
        continue
      }
      nextMemberIds.add(replacementId)
    }
    faction.memberCharacterIds = [...nextMemberIds]
  }

  const slotCharacters = input.characters.filter((character) => character.identityMode === 'slot')
  return [...canonicalByName.values(), ...slotCharacters]
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

  const characterProfilesV2 = normalizeProfileFactionAssignments(
    input.characterProfilesV2 || [],
    input.factionMatrix.factions
  )

  const profileByPlaceholderId = new Map<string, CharacterProfileV2Dto>()
  const profileByCompositePlaceholderId = new Map<string, CharacterProfileV2Dto>()
  const profileByName = new Map<string, CharacterProfileV2Dto>()
  const profileBySeatKey = new Map<string, CharacterProfileV2Dto>()
  const draftByName = new Map<string, CharacterDraftDto>()
  const placeholderIdCounts = new Map<string, number>()

  for (const profile of characterProfilesV2) {
    const profileId = normalizeName(profile.id)
    if (!profileId) continue
    placeholderIdCounts.set(profileId, (placeholderIdCounts.get(profileId) || 0) + 1)
  }

  for (const profile of characterProfilesV2) {
    profileByName.set(normalizeName(profile.name), profile)
    if (profile.id && placeholderIdCounts.get(normalizeName(profile.id)) === 1) {
      profileByPlaceholderId.set(profile.id, profile)
    }
    if (profile.id) {
      const compositePlaceholderKey = createPlaceholderMatchKey({
        factionId: profile.factionId,
        branchId: profile.branchId,
        placeholderId: profile.id
      })
      if (compositePlaceholderKey !== '||' && !profileByCompositePlaceholderId.has(compositePlaceholderKey)) {
        profileByCompositePlaceholderId.set(compositePlaceholderKey, profile)
      }
    }
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
        const nameProfile = profileByName.get(normalizeName(placeholder.name))
        if (
          shouldSkipPlaceholderForProfileAuthority({
            faction,
            branch,
            placeholder,
            nameProfile
          })
        ) {
          continue
        }

        const seatKey = createSeatMatchKey({
          factionId: faction.id,
          branchId: branch.id,
          roleInFaction: placeholder.roleInFaction
        })
        const compositePlaceholderKey = createPlaceholderMatchKey({
          factionId: faction.id,
          branchId: branch.id,
          placeholderId: placeholder.id
        })
        const profileCandidates = [
          profileByCompositePlaceholderId.get(compositePlaceholderKey),
          profileByPlaceholderId.get(placeholder.id),
          profileBySeatKey.get(seatKey),
          nameProfile
        ]
        const profile = profileCandidates.find((candidate) =>
          isProfileSeatCompatible({
            profile: candidate,
            faction,
            branch
          })
        )
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

  const completeCharacters = deduplicateNamedCharactersByName({
    characters: addMissingProfileCharacters({
      projectId: input.projectId,
      characters,
      factions,
      profiles: characterProfilesV2,
      draftByName,
      factionIdMap
    }),
    factions,
    profileByName,
    factionIdMap
  })

  const visibleCharacters = trimVisibleCharacterCards({
    characters: topUpVisibleCharacterCards({
      projectId: input.projectId,
      characters: completeCharacters,
      factions,
      minVisibleCharacterCount: resolveMinVisibleCharacterCount(input.factionMatrix.totalEpisodes)
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
