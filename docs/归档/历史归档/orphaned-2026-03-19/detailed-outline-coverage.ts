import type { StoryIntentPackageDto } from '../../contracts/intake'
import type { DetailedOutlineSegmentDto, OutlineDraftDto } from '../../contracts/workflow'
import { buildFourActEpisodeRanges, resolveProjectEpisodeCount } from './episode-count'

type DetailedAct = 'opening' | 'midpoint' | 'climax' | 'ending'

const ORDERED_ACTS: DetailedAct[] = ['opening', 'midpoint', 'climax', 'ending']

function collectCoveredEpisodes(segments: DetailedOutlineSegmentDto[]): Set<number> {
  const covered = new Set<number>()
  for (const segment of segments) {
    for (const beat of segment.episodeBeats || []) {
      const episodeNo = Number(beat?.episodeNo)
      if (!Number.isFinite(episodeNo) || episodeNo <= 0) continue
      if (!beat?.summary?.trim()) continue
      covered.add(Math.floor(episodeNo))
    }
  }
  return covered
}

export interface DetailedOutlineCoverageResult {
  strictMode: boolean
  targetEpisodes: number
  missingActs: DetailedAct[]
  missingEpisodes: number[]
  outOfRangeEpisodes: number[]
  actCoverage: Array<{
    act: DetailedAct
    startEpisode: number
    endEpisode: number
    missingEpisodes: number[]
  }>
  ok: boolean
}

export function inspectDetailedOutlineCoverage(input: {
  outline?: OutlineDraftDto | null
  storyIntent?: StoryIntentPackageDto | null
  segments: DetailedOutlineSegmentDto[]
}): DetailedOutlineCoverageResult {
  const targetEpisodes = resolveProjectEpisodeCount({
    outline: input.outline,
    storyIntent: input.storyIntent
  })
  const strictMode = targetEpisodes >= 60
  const ranges = buildFourActEpisodeRanges(targetEpisodes)
  const segmentMap = new Map(input.segments.map((segment) => [segment.act, segment]))
  const missingActs = ORDERED_ACTS.filter((act) => !segmentMap.get(act)?.content?.trim())
  const coveredEpisodes = collectCoveredEpisodes(input.segments)
  const missingEpisodes = Array.from({ length: targetEpisodes }, (_, index) => index + 1).filter(
    (episodeNo) => !coveredEpisodes.has(episodeNo)
  )
  const outOfRangeEpisodes = Array.from(coveredEpisodes).filter((episodeNo) => episodeNo > targetEpisodes).sort((a, b) => a - b)
  const actCoverage = ORDERED_ACTS.map((act, index) => {
    const range = ranges[index]
    const segment = segmentMap.get(act)
    const coveredByAct = new Set(
      (segment?.episodeBeats || [])
        .filter((beat) => Number.isFinite(Number(beat?.episodeNo)) && beat?.summary?.trim())
        .map((beat) => Math.floor(Number(beat!.episodeNo)))
    )
    const missingByAct = Array.from(
      { length: range.endEpisode - range.startEpisode + 1 },
      (_, offset) => range.startEpisode + offset
    ).filter((episodeNo) => !coveredByAct.has(episodeNo))

    return {
      act,
      startEpisode: range.startEpisode,
      endEpisode: range.endEpisode,
      missingEpisodes: missingByAct
    }
  })

  return {
    strictMode,
    targetEpisodes,
    missingActs,
    missingEpisodes,
    outOfRangeEpisodes,
    actCoverage,
    ok: !strictMode || (missingActs.length === 0 && missingEpisodes.length === 0 && outOfRangeEpisodes.length === 0)
  }
}

export function assertDetailedOutlineCoverage(input: {
  outline?: OutlineDraftDto | null
  storyIntent?: StoryIntentPackageDto | null
  segments: DetailedOutlineSegmentDto[]
}): void {
  const result = inspectDetailedOutlineCoverage(input)
  if (result.ok) return

  const firstMissingEpisode = result.missingEpisodes[0]
  const firstMissingAct = result.missingActs[0]
  const message = [
    'detailed_outline_incomplete',
    `targetEpisodes=${result.targetEpisodes}`,
    firstMissingAct ? `missingAct=${firstMissingAct}` : '',
    Number.isFinite(firstMissingEpisode) ? `missingEpisode=${firstMissingEpisode}` : '',
    result.outOfRangeEpisodes.length ? `outOfRange=${result.outOfRangeEpisodes.join(',')}` : ''
  ]
    .filter(Boolean)
    .join(':')

  throw new Error(message)
}
