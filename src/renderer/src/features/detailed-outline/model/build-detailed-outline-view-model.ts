/**
 * Detailed Outline View Model Builder
 *
 * Pure function builder for constructing the detailed outline view model.
 * Moves ALL heavy computation OUT of render cycle.
 *
 * Input: outline + detailedOutlineBlocks + outlineEpisodes
 * Output: Read-only view model with filledCount, outlineBlocks, sectionInputs
 *
 * NO render-period computation allowed. Build once, reuse until inputs change.
 */

import type {
  OutlineDraftDto,
  DetailedOutlineBlockDto,
  OutlineBlockDto,
  SceneBeatDto
} from '../../../../../shared/contracts/workflow'
import { buildOutlineBlocks } from '../../../../../shared/domain/workflow/planning-blocks'

export interface DetailedOutlineSectionInput {
  key: string
  blockNo: number
  sectionNo: number
  label: string
  hint: string
  startEpisode: number
  endEpisode: number
  summary: string
  episodes: Array<{
    episodeNo: number
    summary: string
    sceneByScene: SceneBeatDto[]
  }>
}

export interface DetailedOutlineViewModel {
  filledCount: number
  totalEpisodes: number
  outlineBlocks: OutlineBlockDto[]
  sectionInputs: DetailedOutlineSectionInput[]
  // Pre-computed block labels to avoid render-period .find() calls
  blockLabels: Record<number, string>
}

function formatEpisodeRange(startEpisode: number, endEpisode: number): string {
  return startEpisode === endEpisode ? `${startEpisode}集` : `${startEpisode}-${endEpisode}集`
}

function buildSegmentHint(label: string): string {
  if (/(起|开局|入局)/.test(label)) return '先把人拖进局里，第一下压强和第一下代价要立住。'
  if (/(尾|收束|终局|合)/.test(label)) return '先把这一轮决定和代价钉死，再留下一下更狠的承接。'
  return '把局面继续推窄，写清谁在施压、怎么升级、为什么非点下一集不可。'
}

/**
 * Build complete detailed outline view model.
 * This is the ONLY place where sectionInputs, filledCount, and outlineBlocks are computed.
 */
export function buildDetailedOutlineViewModel(
  outline: OutlineDraftDto,
  detailedOutlineBlocks: DetailedOutlineBlockDto[]
): DetailedOutlineViewModel {
  const outlineEpisodes = outline.summaryEpisodes ?? []
  const totalEpisodes = outlineEpisodes.length

  // Compute filledCount: how many episodes have sceneByScene content
  const filledCount = detailedOutlineBlocks
    .flatMap((block) => block.sections || [])
    .flatMap((section) => section.episodeBeats || [])
    .filter((beat) => (beat.sceneByScene ?? []).length > 0)
    .map((beat) => beat.episodeNo)
    .filter((episodeNo, index, arr) => arr.indexOf(episodeNo) === index).length

  // Compute outlineBlocks: use existing or build from episodes
  const outlineBlocks =
    outline.outlineBlocks && outline.outlineBlocks.length > 0
      ? outline.outlineBlocks
      : buildOutlineBlocks(outline.summaryEpisodes ?? [], outline.planningUnitEpisodes || 10)

  // Compute sectionInputs: flatten all sections with their episode data
  const sectionInputs = detailedOutlineBlocks.flatMap((block) =>
    (block.sections || []).map((section) => {
      const startEpisode =
        section.startEpisode || section.episodeBeats?.[0]?.episodeNo || block.startEpisode
      const endEpisode =
        section.endEpisode ||
        section.episodeBeats?.[section.episodeBeats.length - 1]?.episodeNo ||
        block.endEpisode
      const blockLabel =
        outlineBlocks.find((item) => item.blockNo === block.blockNo)?.label ||
        `第${formatEpisodeRange(startEpisode, endEpisode)}规划块`
      const sectionLabel =
        section.title?.trim() || `第${formatEpisodeRange(startEpisode, endEpisode)}段`

      return {
        key: `${block.blockNo}-${section.sectionNo}`,
        blockNo: block.blockNo,
        sectionNo: section.sectionNo,
        label: `第${section.sectionNo}段：${blockLabel} / ${sectionLabel}`,
        hint: block.summary?.trim() || buildSegmentHint(sectionLabel),
        startEpisode,
        endEpisode,
        summary: section.summary ?? '',
        episodes: outlineEpisodes
          .filter((episode) => episode.episodeNo >= startEpisode && episode.episodeNo <= endEpisode)
          .map((episode) => {
            const beat = section.episodeBeats?.find((b) => b.episodeNo === episode.episodeNo)
            return {
              episodeNo: episode.episodeNo,
              summary: beat?.summary ?? '',
              sceneByScene: (beat?.sceneByScene as SceneBeatDto[]) ?? []
            }
          })
      }
    })
  )

  // Pre-compute block labels: blockNo -> label mapping to avoid render-period .find() calls
  const blockLabels: Record<number, string> = {}
  for (const block of outlineBlocks) {
    blockLabels[block.blockNo] =
      block.label || `第${formatEpisodeRange(block.startEpisode, block.endEpisode)}规划块`
  }

  return {
    filledCount,
    totalEpisodes,
    outlineBlocks,
    sectionInputs,
    blockLabels
  }
}
