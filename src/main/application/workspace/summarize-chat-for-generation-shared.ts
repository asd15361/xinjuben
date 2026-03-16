import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'

export const NAME_STOP_WORDS = new Set([
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
  '安仁'
])

export function cleanJsonLikeText(text: string): string {
  return text
    .replace(/```json|```/gi, '')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/：/g, ':')
    .replace(/，/g, ',')
    .replace(/\u00A0/g, ' ')
    .replace(/,\s*([}\]])/g, '$1')
    .trim()
}

export function tryParseObject(text: string): Record<string, unknown> | null {
  const normalized = cleanJsonLikeText(text)
  const firstBrace = normalized.indexOf('{')
  if (firstBrace < 0) return null
  for (let end = normalized.lastIndexOf('}'); end > firstBrace; end = normalized.lastIndexOf('}', end - 1)) {
    const slice = normalized.slice(firstBrace, end + 1)
    try {
      const parsed = JSON.parse(slice)
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>
      }
    } catch {
      continue
    }
  }
  return null
}

export function toText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function toTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => toText(item)).filter(Boolean)
}

export function uniqueList(values: string[], limit = 8): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values.map((item) => item.trim()).filter(Boolean)) {
    if (seen.has(value)) continue
    seen.add(value)
    result.push(value)
    if (result.length >= limit) break
  }
  return result
}

export function cleanPossibleName(value: string): string {
  const trimmed = value.trim().replace(/[：:]/g, '')
  if (!trimmed) return ''
  if (NAME_STOP_WORDS.has(trimmed)) return ''
  if (/[《》【】]/.test(trimmed)) return ''
  if (/[，,。；、\s]/.test(trimmed)) return ''
  if (
    [
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
      '反转'
    ].some((token) => trimmed.includes(token))
  ) {
    return ''
  }
  return trimmed
}

export function normalizeAnchorName(value: string): string {
  const direct = cleanPossibleName(value)
  if (direct) return direct

  const normalized = value.trim()
  const roleMatch = normalized.match(/(少年守钥人|小镇少女|恶霸|反派|仇家|族长|城主|掌柜|恶少|师父|师妹)/)
  if (roleMatch) return roleMatch[1]

  const tailMatch = normalized.match(/([一-龥]{2,8})(?:的|被|正|会|先|拿|逼|盯)/)
  return cleanPossibleName(tailMatch?.[1] || '')
}

export function normalizeNameList(values: string[], limit = 8): string[] {
  return uniqueList(values.map((value) => cleanPossibleName(value)).filter(Boolean), limit)
}

export function splitBulletLines(text: string): string[] {
  return text
    .split('\n')
    .map((line) => line.replace(/^- /, '').trim())
    .filter(Boolean)
}

export function splitNameList(text: string): string[] {
  return text
    .split(/[、,，/｜|]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function extractNamesFromText(text: string): string[] {
  const candidates = [...text.matchAll(/([一-龥]{2,4})/g)].map((match) => cleanPossibleName(match[1]))
  return uniqueList(
    candidates.filter((name) => name && !NAME_STOP_WORDS.has(name)),
    10
  )
}

export function extractRoleSummary(raw: unknown): Array<{ name: string; summary: string }> {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const record = item as Record<string, unknown>
      return {
        name: toText(record.name || record.role || record.character),
        summary: toText(record.summary || record.description || record.note)
      }
    })
    .filter((item): item is { name: string; summary: string } => Boolean(item?.name && item.summary))
}

export function extractCharacterLayers(raw: unknown): Array<{ name: string; layer: string; duty: string }> {
  if (!Array.isArray(raw)) return []
  return raw
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) return null
      const record = item as Record<string, unknown>
      return {
        name: toText(record.name || record.character),
        layer: toText(record.layer || record.tier),
        duty: toText(record.duty || record.function || record.job)
      }
    })
    .filter((item): item is { name: string; layer: string; duty: string } => Boolean(item?.name && item.layer && item.duty))
}

export function uniqueCharacterCards(
  values: Array<{ name: string; summary: string }>,
  limit = 8
): Array<{ name: string; summary: string }> {
  const seen = new Set<string>()
  const result: Array<{ name: string; summary: string }> = []
  for (const item of values) {
    const name = cleanPossibleName(item.name)
    const summary = toText(item.summary)
    if (!name || !summary || seen.has(name)) continue
    seen.add(name)
    result.push({ name, summary })
    if (result.length >= limit) break
  }
  return result
}

export function uniqueCharacterLayers(
  values: Array<{ name: string; layer: string; duty: string }>,
  limit = 8
): Array<{ name: string; layer: string; duty: string }> {
  const seen = new Set<string>()
  const result: Array<{ name: string; layer: string; duty: string }> = []
  for (const item of values) {
    const name = cleanPossibleName(item.name)
    const layer = toText(item.layer)
    const duty = toText(item.duty)
    if (!name || !layer || !duty || seen.has(name)) continue
    seen.add(name)
    result.push({ name, layer, duty })
    if (result.length >= limit) break
  }
  return result
}

export function normalizeStoryIntent(input: unknown): Partial<StoryIntentPackageDto> {
  const record = input && typeof input === 'object' && !Array.isArray(input) ? (input as Record<string, unknown>) : {}
  return {
    titleHint: toText(record.titleHint),
    genre: toText(record.genre),
    tone: toText(record.tone),
    audience: toText(record.audience),
    protagonist: normalizeAnchorName(toText(record.protagonist)),
    antagonist: normalizeAnchorName(toText(record.antagonist)),
    coreConflict: toText(record.coreConflict),
    endingDirection: toText(record.endingDirection),
    officialKeyCharacters: normalizeNameList(toTextArray(record.officialKeyCharacters)),
    lockedCharacterNames: normalizeNameList(toTextArray(record.lockedCharacterNames)),
    themeAnchors: toTextArray(record.themeAnchors),
    worldAnchors: toTextArray(record.worldAnchors),
    relationAnchors: toTextArray(record.relationAnchors),
    dramaticMovement: toTextArray(record.dramaticMovement),
    manualRequirementNotes: toText(record.manualRequirementNotes),
    freeChatFinalSummary: toText(record.freeChatFinalSummary)
  }
}
