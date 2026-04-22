/**
 * Detailed Outline View Model Builder
 *
 * Pure function builder for constructing the detailed outline view model.
 * Moves ALL heavy computation OUT of render cycle.
 *
 * Input: normalized outline + persisted detailed outline segments
 * Output: episode-first editor view model with filledCount + episodeEditors
 *
 * NO render-period computation allowed. Build once, reuse until inputs change.
 */

import type {
  OutlineDraftDto,
  DetailedOutlineSegmentDto,
  ScreenplaySceneBlockDto
} from '../../../../../shared/contracts/workflow.ts'
type DetailedOutlineActKey = DetailedOutlineSegmentDto['act']

export interface DetailedOutlineStageViewModel {
  totalEpisodes: number
  filledCount: number
  episodeEditors: Array<{
    episodeNo: number
    summary: string
    actKey: DetailedOutlineActKey
    actLabel: string
    actHint: string
    segmentContent: string
    sceneByScene: ScreenplaySceneBlockDto[]
  }>
}

interface ActEpisodeRange {
  actKey: DetailedOutlineActKey
  actLabel: string
  actHint: string
  segmentContent: string
  startEpisode: number
  endEpisode: number
  episodeSummaryByNo: Map<number, string>
  episodeScenesByNo: Map<number, ScreenplaySceneBlockDto[]>
}

const ORDERED_ACTS: DetailedOutlineActKey[] = ['opening', 'midpoint', 'climax', 'ending']

const ACT_LABELS: Record<DetailedOutlineActKey, string> = {
  opening: '开局',
  midpoint: '中段',
  climax: '高潮',
  ending: '收束'
}

function buildSegmentEpisodeRange(
  segment: Pick<DetailedOutlineSegmentDto, 'episodeBeats'>,
  fallbackIndex: number,
  totalEpisodes: number
): { startEpisode: number; endEpisode: number } {
  const beatEpisodes = (segment.episodeBeats ?? []).map((beat) => beat.episodeNo).filter(Boolean)
  const startEpisode = beatEpisodes[0] ?? Math.max(1, fallbackIndex + 1)
  const endEpisode =
    beatEpisodes[beatEpisodes.length - 1] ?? Math.max(startEpisode, totalEpisodes || startEpisode)
  return { startEpisode, endEpisode }
}

export function buildDetailedOutlineStageViewModel(
  outline: OutlineDraftDto,
  detailedOutlineBlocks: DetailedOutlineSegmentDto[]
): DetailedOutlineStageViewModel {
  const outlineEpisodes = outline.summaryEpisodes ?? []
  const totalEpisodes = outlineEpisodes.length
  const filledCount = detailedOutlineBlocks
    .flatMap((segment) => segment.episodeBeats ?? [])
    .filter((beat) => beat.summary.trim())
    .map((beat) => beat.episodeNo)
    .filter((episodeNo, index, arr) => arr.indexOf(episodeNo) === index).length

  const segmentMap = new Map<DetailedOutlineActKey, DetailedOutlineSegmentDto>()
  for (const segment of detailedOutlineBlocks) {
    if (ORDERED_ACTS.includes(segment.act)) {
      segmentMap.set(segment.act, segment)
    }
  }

  const actRanges: ActEpisodeRange[] = []
  ORDERED_ACTS.forEach((act, index) => {
    const segment =
      segmentMap.get(act) ??
      ({ act, content: '', hookType: '', episodeBeats: [] } satisfies DetailedOutlineSegmentDto)
    const { startEpisode, endEpisode } = buildSegmentEpisodeRange(segment, index, totalEpisodes)

    actRanges.push({
      actKey: act,
      actLabel: ACT_LABELS[act],
      actHint: segment.hookType || '把这一段的推进、压强升级和结尾钩子写清楚。',
      segmentContent: segment.content ?? '',
      startEpisode,
      endEpisode,
      episodeSummaryByNo: new Map(
        (segment.episodeBeats ?? []).map((beat) => [beat.episodeNo, beat.summary ?? ''])
      ),
      episodeScenesByNo: new Map(
        (segment.episodeBeats ?? []).map((beat) => [beat.episodeNo, beat.sceneByScene ?? []])
      )
    })
  })

  const normalizedActRanges = actRanges.map((range, index) => {
    const nextStartEpisode = actRanges[index + 1]?.startEpisode
    const maxEndEpisode = nextStartEpisode
      ? Math.max(range.startEpisode, nextStartEpisode - 1)
      : totalEpisodes
    return {
      ...range,
      endEpisode: Math.min(Math.max(range.endEpisode, range.startEpisode), maxEndEpisode)
    }
  })

  const episodeEditors: DetailedOutlineStageViewModel['episodeEditors'] = outlineEpisodes.map(
    (episode) => {
      const matchedRange =
        normalizedActRanges.find(
          (range) =>
            episode.episodeNo >= range.startEpisode && episode.episodeNo <= range.endEpisode
        ) ?? normalizedActRanges[normalizedActRanges.length - 1]

      return {
        episodeNo: episode.episodeNo,
        summary: matchedRange?.episodeSummaryByNo.get(episode.episodeNo) ?? '',
        actKey: matchedRange?.actKey ?? 'ending',
        actLabel: matchedRange?.actLabel ?? ACT_LABELS.ending,
        actHint: matchedRange?.actHint ?? '把这一段的推进、压强升级和结尾钩子写清楚。',
        segmentContent: matchedRange?.segmentContent ?? '',
        sceneByScene: matchedRange?.episodeScenesByNo.get(episode.episodeNo) ?? []
      }
    }
  )

  return {
    totalEpisodes,
    filledCount,
    episodeEditors
  }
}
