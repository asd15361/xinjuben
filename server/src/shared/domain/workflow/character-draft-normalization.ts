import type { CharacterDraftDto } from '../../contracts/workflow'

const CHARACTER_NAME_STOP_WORDS = new Set([
  '主角',
  '对手',
  '关键角色',
  '角色卡',
  '人物关系',
  '人物分层',
  '世界观',
  '项目',
  '玄幻',
  '修仙',
  '权谋',
  '热血',
  '升级',
  '开放',
  '结局',
  '大道',
  '地名',
  '短剧',
  '妖兽',
  '秘宝',
  '钥匙',
  '王母宫',
  '安仁',
  '天地',
  '点击修饰',
  '最想守',
  '最怕失去',
  '碰就炸',
  '目标',
  '表面',
  '暗里卡着'
])

const CHARACTER_NAME_FRAGMENT_TOKENS = [
  '盯上',
  '被当',
  '异动',
  '越来越',
  '逼出',
  '后果',
  '选择',
  '守约',
  '救人',
  '主线',
  '反转',
  '表面',
  '暗里',
  '最想守',
  '最怕',
  '被迫',
  '卷进',
  '缠身',
  '施压',
  '亮底',
  '站位',
  '继续',
  '改写',
  '拖进',
  '推上台面',
  '一起进',
  '进更深',
  '值得靠近',
  '体面',
  '那口气',
  '长大',
  '另有目',
  '另有目的'
]

const CHARACTER_NAME_MARKERS = [
  '表面',
  '暗里',
  '被迫',
  '会因为',
  '想守',
  '最想守',
  '最怕',
  '一边',
  '继续',
  '开始',
  '只会',
  '拿',
  '压',
  '盯',
  '实则',
  '和',
  '与',
  '因',
  '要',
  '会',
  '再次',
  '又',
  '被'
]

function trimName(value: string): string {
  return value.trim().replace(/[：:]/g, '')
}

function normalizeLatinLikeName(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

function isLatinLikeName(value: string): boolean {
  return /^[A-Za-z][A-Za-z\s'.-]{1,40}$/.test(normalizeLatinLikeName(value))
}

function isLikelyEntityAnchor(value: string): boolean {
  const text = trimName(value)
  if (isLatinLikeName(text)) return true
  if (!text || text.length < 2 || text.length > 8) return false
  if (CHARACTER_NAME_STOP_WORDS.has(text)) return false
  if (/[《》【】A-Za-z0-9，,。；、\s]/.test(text)) return false
  if (/^(被|把|将|让)/.test(text)) return false
  return !CHARACTER_NAME_FRAGMENT_TOKENS.some((token) => text.includes(token))
}

export function cleanCharacterLikeName(value: string): string {
  let text = trimName(value)
  if (!text) return ''
  if (isLatinLikeName(text)) return normalizeLatinLikeName(text)
  if (CHARACTER_NAME_STOP_WORDS.has(text)) return ''
  if (/[《》【】]/.test(text)) return ''
  if (/[，,。；、\s]/.test(text)) return ''

  const markerPattern = CHARACTER_NAME_MARKERS.map((marker) =>
    marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  ).join('|')
  const leadingMatch = text.match(new RegExp(`^([一-龥]{2,6})(?=(${markerPattern}))`))
  if (leadingMatch?.[1]) {
    text = leadingMatch[1]
  }

  if (text.startsWith('被') && text.length > 2) {
    const passiveCandidate = text.slice(1)
    if (isLikelyEntityAnchor(passiveCandidate)) {
      text = passiveCandidate
    }
  }

  if (!isLikelyEntityAnchor(text)) return ''
  return text
}

export function normalizeCharacterLikeName(value: string): string {
  return cleanCharacterLikeName(value)
}

function preferText(primary: string | undefined, secondary: string | undefined): string {
  return primary?.trim() || secondary?.trim() || ''
}

function mergeActiveBlockNos(left?: number[], right?: number[]): number[] | undefined {
  const merged = [...(left || []), ...(right || [])].filter(
    (item) => Number.isInteger(item) && item > 0
  )
  if (merged.length === 0) return undefined
  return [...new Set(merged)].sort((a, b) => a - b)
}

function mergeCharacterDraft(
  primary: CharacterDraftDto,
  secondary: CharacterDraftDto
): CharacterDraftDto {
  return {
    ...primary,
    name: primary.name,
    biography: preferText(primary.biography, secondary.biography),
    publicMask: preferText(primary.publicMask, secondary.publicMask),
    hiddenPressure: preferText(primary.hiddenPressure, secondary.hiddenPressure),
    fear: preferText(primary.fear, secondary.fear),
    protectTarget: preferText(primary.protectTarget, secondary.protectTarget),
    conflictTrigger: preferText(primary.conflictTrigger, secondary.conflictTrigger),
    advantage: preferText(primary.advantage, secondary.advantage),
    weakness: preferText(primary.weakness, secondary.weakness),
    goal: preferText(primary.goal, secondary.goal),
    arc: preferText(primary.arc, secondary.arc),
    appearance: preferText(primary.appearance, secondary.appearance),
    personality: preferText(primary.personality, secondary.personality),
    identity: preferText(primary.identity, secondary.identity),
    values: preferText(primary.values, secondary.values),
    plotFunction: preferText(primary.plotFunction, secondary.plotFunction),
    depthLevel: primary.depthLevel || secondary.depthLevel,
    masterEntityId: primary.masterEntityId || secondary.masterEntityId,
    roleLayer: primary.roleLayer || secondary.roleLayer,
    activeBlockNos: mergeActiveBlockNos(primary.activeBlockNos, secondary.activeBlockNos)
  }
}

const LEGACY_EXTERNAL_PRESSURE_TOKENS = [
  '表面像一股越来越近的外压',
  '不是站队角色',
  '不会替任何人守体面',
  '把外压推上台面',
  '实质灾难'
] as const

function looksLikeExternalPressureEntityName(name: string): boolean {
  return /(妖|蛇|兽|鬼|邪祟|系统|异动|外压|灾难)/.test(trimName(name))
}

function isSyntheticExternalPressureDraft(character: CharacterDraftDto): boolean {
  if (!looksLikeExternalPressureEntityName(character.name || '')) return false

  const text = [
    character.name,
    character.biography,
    character.publicMask,
    character.hiddenPressure,
    character.fear,
    character.protectTarget,
    character.conflictTrigger,
    character.goal,
    character.arc
  ]
    .join(' ')
    .trim()

  const matchedTokenCount = LEGACY_EXTERNAL_PRESSURE_TOKENS.reduce(
    (count, token) => count + (text.includes(token) ? 1 : 0),
    0
  )

  return matchedTokenCount >= 2
}

export function normalizeCharacterDrafts(characters: CharacterDraftDto[]): CharacterDraftDto[] {
  const deduped = new Map<string, { draft: CharacterDraftDto; clean: boolean }>()

  for (const character of characters) {
    const normalizedName = normalizeCharacterLikeName(character.name || '')
    if (!normalizedName) continue

    const normalizedDraft: CharacterDraftDto = {
      ...character,
      name: normalizedName
    }
    if (isSyntheticExternalPressureDraft(normalizedDraft)) continue
    const isCleanName = trimName(character.name || '') === normalizedName
    const existing = deduped.get(normalizedName)

    if (!existing) {
      deduped.set(normalizedName, { draft: normalizedDraft, clean: isCleanName })
      continue
    }

    if (!existing.clean && isCleanName) {
      deduped.set(normalizedName, {
        draft: mergeCharacterDraft(normalizedDraft, existing.draft),
        clean: true
      })
      continue
    }

    existing.draft = mergeCharacterDraft(existing.draft, normalizedDraft)
  }

  return [...deduped.values()].map((entry) => entry.draft)
}
