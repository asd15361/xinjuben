import type { StoryIntentPackageDto } from '../../contracts/intake'
import type { OutlineDraftDto, OutlineEpisodeDto } from '../../contracts/workflow'

export const DEFAULT_EPISODE_COUNT = 10
export const MAX_EPISODE_COUNT = 80

function clampEpisodeCount(value: number | undefined, fallback = DEFAULT_EPISODE_COUNT): number {
  if (!value || !Number.isFinite(value)) return fallback
  return Math.max(1, Math.min(MAX_EPISODE_COUNT, Math.floor(value)))
}

function parseEpisodeCountFromSummary(summary: string | undefined): number {
  const text = typeof summary === 'string' ? summary : ''
  const matches = Array.from(text.matchAll(/第?\s*(\d+)\s*[集话章节幕]/g))
  const maxEpisodeNo = matches.reduce((current, match) => Math.max(current, Number(match[1]) || 0), 0)
  return clampEpisodeCount(maxEpisodeNo, 0)
}

function parseEpisodeCountFromEpisodes(episodes: OutlineEpisodeDto[] | undefined): number {
  if (!Array.isArray(episodes) || episodes.length === 0) return 0
  const maxEpisodeNo = episodes.reduce((current, episode, index) => {
    const raw = Number(episode?.episodeNo)
    const episodeNo = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : index + 1
    return Math.max(current, episodeNo)
  }, 0)
  return clampEpisodeCount(maxEpisodeNo || episodes.length, 0)
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

export function deriveOutlineEpisodeCount(outline: Partial<OutlineDraftDto> | null | undefined, fallback = DEFAULT_EPISODE_COUNT): number {
  const episodeCount = Math.max(
    parseEpisodeCountFromEpisodes(outline?.summaryEpisodes),
    parseEpisodeCountFromSummary(outline?.summary)
  )
  return clampEpisodeCount(episodeCount || fallback, fallback)
}

export function resolveProjectEpisodeCount(input: {
  outline?: Partial<OutlineDraftDto> | null
  storyIntent?: StoryIntentPackageDto | null
  fallbackCount?: number
}): number {
  const fromBrief = extractEpisodeCountFromGenerationBrief(input.storyIntent?.generationBriefText)
  const fromOutline = deriveOutlineEpisodeCount(input.outline, 0)
  return clampEpisodeCount(Math.max(fromBrief, fromOutline, input.fallbackCount || 0) || DEFAULT_EPISODE_COUNT)
}

export function buildFourActEpisodeRanges(totalEpisodes: number): Array<{ startEpisode: number; endEpisode: number }> {
  const normalizedTotalEpisodes = clampEpisodeCount(totalEpisodes)
  const ranges: Array<{ startEpisode: number; endEpisode: number }> = []
  let startEpisode = 1

  for (let index = 0; index < 4; index += 1) {
    const remainingActs = 4 - index
    const remainingEpisodes = normalizedTotalEpisodes - startEpisode + 1
    const width = index === 3 ? remainingEpisodes : Math.max(1, Math.floor(remainingEpisodes / remainingActs))
    const endEpisode = Math.min(normalizedTotalEpisodes, startEpisode + width - 1)
    ranges.push({ startEpisode, endEpisode })
    startEpisode = endEpisode + 1
  }

  return ranges
}
