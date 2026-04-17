import type { StoryIntentPackageDto } from '../../contracts/intake'
import type { OutlineDraftDto } from '../../contracts/workflow'

export const DEFAULT_EPISODE_COUNT = 10
export const MAX_EPISODE_COUNT = 80

function clampEpisodeCount(value: number | undefined, fallback = DEFAULT_EPISODE_COUNT): number {
  if (!value || !Number.isFinite(value)) return fallback
  return Math.max(1, Math.min(MAX_EPISODE_COUNT, Math.floor(value)))
}

function parseEpisodeCountFromSummary(summary: string | undefined): number {
  const text = typeof summary === 'string' ? summary : ''
  const matches = Array.from(text.matchAll(/第?\s*(\d+)\s*[集话章节幕]/g))
  const maxEpisodeNo = matches.reduce(
    (current, match) => Math.max(current, Number(match[1]) || 0),
    0
  )
  return clampEpisodeCount(maxEpisodeNo, 0)
}

export function extractLatestEpisodeCountFromText(text: string | undefined): number {
  const normalized = typeof text === 'string' ? text : ''
  if (!normalized.trim()) return 0

  const matches = Array.from(normalized.matchAll(/(\d+)\s*集/g))
  if (matches.length === 0) return 0

  const latest = Number(matches[matches.length - 1]?.[1] || 0)
  return clampEpisodeCount(latest, 0)
}

function extractDeclaredEpisodeCountFromLine(line: string): number {
  const normalized = typeof line === 'string' ? line.trim() : ''
  if (!normalized) return 0

  const patterns = [
    /不做\s*\d+\s*集[^。！？!\n]*?(?:要|改成|改为|改做|做|写)[^\d]{0,6}(\d+)\s*集/g,
    /(?:改成|改为|改做|改写成|改到|现在要|现在做|现在写|这次要|这次做|这次写|要做|要写|想写|先按|按)[^\d]{0,6}(\d+)\s*集/g,
    /(?:做|写)[^\d]{0,6}(?:一个|一部|个)?\s*(\d+)\s*集/g
  ]

  for (const pattern of patterns) {
    const matches = Array.from(normalized.matchAll(pattern))
    if (matches.length > 0) {
      const latest = Number(matches[matches.length - 1]?.[1] || 0)
      return clampEpisodeCount(latest, 0)
    }
  }

  return 0
}

export function extractLatestDeclaredEpisodeCountFromText(text: string | undefined): number {
  const normalized = typeof text === 'string' ? text : ''
  if (!normalized.trim()) return 0

  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  let latest = 0
  for (const line of lines) {
    const declared = extractDeclaredEpisodeCountFromLine(line)
    if (declared > 0) {
      latest = declared
    }
  }

  return latest
}

function extractStructuredEpisodeCountFromLine(line: string): number {
  const normalized = typeof line === 'string' ? line.trim() : ''
  if (!normalized) return 0

  const headerMatch = normalized.match(/^【项目】[^\n]*?[｜|](\d+)\s*集/)
  return clampEpisodeCount(Number(headerMatch?.[1] || 0), 0)
}

export function extractLatestAuthoritativeEpisodeCountFromText(text: string | undefined): number {
  const normalized = typeof text === 'string' ? text : ''
  if (!normalized.trim()) return 0

  const lines = normalized
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  let latest = 0
  for (const line of lines) {
    const structured = extractStructuredEpisodeCountFromLine(line)
    if (structured > 0) {
      latest = structured
      continue
    }

    const declared = extractDeclaredEpisodeCountFromLine(line)
    if (declared > 0) {
      latest = declared
    }
  }

  return latest
}

export function extractEpisodeCountFromGenerationBrief(text: string | undefined): number {
  const normalized = typeof text === 'string' ? text : ''
  if (!normalized.trim()) return 0

  const headerMatch = normalized.match(/【项目】[^\n]*?[｜|](\d+)\s*集/)
  if (headerMatch) {
    return clampEpisodeCount(Number(headerMatch[1]), 0)
  }

  const genericMatch = normalized.match(/(\d+)\s*集/)
  if (genericMatch) {
    return clampEpisodeCount(Number(genericMatch[1]), 0)
  }

  return 0
}

export function deriveOutlineEpisodeCount(
  outline: Partial<OutlineDraftDto> | null | undefined,
  fallback = DEFAULT_EPISODE_COUNT
): number {
  const episodes = outline?.summaryEpisodes
  // When summaryEpisodes is non-empty, trust the array length directly.
  // Text-based parsing (parseEpisodeCountFromSummary) returns 0 for
  // non-episodic summaries and must not override the actual episode array.
  if (Array.isArray(episodes) && episodes.length > 0) {
    return clampEpisodeCount(episodes.length, fallback)
  }
  const fromSummary = parseEpisodeCountFromSummary(outline?.summary)
  return clampEpisodeCount(fromSummary || fallback, fallback)
}

export function resolveProjectEpisodeCount(input: {
  outline?: Partial<OutlineDraftDto> | null
  storyIntent?: StoryIntentPackageDto | null
  fallbackCount?: number
}): number {
  const fromBrief = extractEpisodeCountFromGenerationBrief(input.storyIntent?.generationBriefText)
  const fromOutline = deriveOutlineEpisodeCount(input.outline, 0)
  if (fromBrief > 0) return clampEpisodeCount(fromBrief)
  if (fromOutline > 0) return clampEpisodeCount(fromOutline)
  if ((input.fallbackCount || 0) > 0) return clampEpisodeCount(input.fallbackCount)
  return DEFAULT_EPISODE_COUNT
}

export function buildFourActEpisodeRanges(
  totalEpisodes: number
): Array<{ startEpisode: number; endEpisode: number }> {
  const normalizedTotalEpisodes = clampEpisodeCount(totalEpisodes)
  const ranges: Array<{ startEpisode: number; endEpisode: number }> = []
  let startEpisode = 1

  for (let index = 0; index < 4; index += 1) {
    const remainingActs = 4 - index
    const remainingEpisodes = normalizedTotalEpisodes - startEpisode + 1
    const width =
      index === 3 ? remainingEpisodes : Math.max(1, Math.floor(remainingEpisodes / remainingActs))
    const endEpisode = Math.min(normalizedTotalEpisodes, startEpisode + width - 1)
    ranges.push({ startEpisode, endEpisode })
    startEpisode = endEpisode + 1
  }

  return ranges
}
