import type { OutlineDraftDto, OutlineEpisodeDto } from '../../contracts/workflow'
import { DEFAULT_EPISODE_COUNT, deriveOutlineEpisodeCount } from './episode-count'

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function clampEpisodeNo(value: unknown, fallback: number): number {
  const next = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(next) || next <= 0) return fallback
  return Math.floor(next)
}

function normalizeEpisodeSummary(value: unknown): string {
  return normalizeWhitespace(typeof value === 'string' ? value : '')
}

export function normalizeOutlineEpisodes(
  value: unknown,
  count = DEFAULT_EPISODE_COUNT
): OutlineEpisodeDto[] {
  const source = Array.isArray(value) ? value : []
  const inferredCount = source.reduce((current, item, index) => {
    const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
    return Math.max(current, clampEpisodeNo(record.episodeNo, index + 1))
  }, 0)
  const normalized = source
    .map((item, index) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
      return {
        episodeNo: clampEpisodeNo(record.episodeNo, index + 1),
        summary: normalizeEpisodeSummary(record.summary)
      }
    })
    .filter((item) => item.summary)
    .sort((left, right) => left.episodeNo - right.episodeNo)

  const seen = new Set<number>()
  const deduped = normalized.filter((item) => {
    if (seen.has(item.episodeNo)) return false
    seen.add(item.episodeNo)
    return true
  })

  const resolvedCount = count > 0 ? count : inferredCount || DEFAULT_EPISODE_COUNT

  return Array.from({ length: resolvedCount }, (_, index) => {
    const episodeNo = index + 1
    const matched = deduped.find((item) => item.episodeNo === episodeNo)
    return {
      episodeNo,
      summary: matched?.summary || ''
    }
  })
}

export function outlineEpisodesToSummary(episodes: OutlineEpisodeDto[]): string {
  return episodes
    .map(
      (episode) =>
        `第${episode.episodeNo}集：${normalizeEpisodeSummary(episode.summary) || '待补这一集的核心推进、冲突和钩子。'}`
    )
    .join('\n')
}

export function parseSummaryToOutlineEpisodes(
  summary: string,
  count = DEFAULT_EPISODE_COUNT
): OutlineEpisodeDto[] {
  const normalized = normalizeWhitespace(summary)
  if (!normalized) {
    return normalizeOutlineEpisodes([], count)
  }

  const lines = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const parsed = lines.map((line, index) => {
    const match = line.match(/^第?\s*(\d+)\s*[集话章节幕]?\s*[:：-]?\s*(.*)$/)
    if (match) {
      return {
        episodeNo: clampEpisodeNo(match[1], index + 1),
        summary: normalizeEpisodeSummary(match[2])
      }
    }

    return {
      episodeNo: index + 1,
      summary: normalizeEpisodeSummary(line)
    }
  })

  const withContent = parsed.filter((episode) => episode.summary)
  if (withContent.length >= 2) {
    return normalizeOutlineEpisodes(withContent, count)
  }

  const sentences = normalized
    .split(/(?<=[。！？!?；;])/)
    .map((part) => part.trim())
    .filter(Boolean)

  const buckets = Array.from({ length: count }, () => [] as string[])
  for (let index = 0; index < sentences.length; index += 1) {
    buckets[index % count].push(sentences[index])
  }

  return normalizeOutlineEpisodes(
    buckets.map((bucket, index) => ({
      episodeNo: index + 1,
      summary: bucket.join('')
    })),
    count
  )
}

export function ensureOutlineEpisodeShape(
  outline: OutlineDraftDto,
  count?: number
): OutlineDraftDto {
  const resolvedCount =
    typeof count === 'number' && count > 0
      ? count
      : deriveOutlineEpisodeCount(outline, 0) || DEFAULT_EPISODE_COUNT
  const summaryEpisodes = normalizeOutlineEpisodes(
    outline.summaryEpisodes?.length
      ? outline.summaryEpisodes
      : parseSummaryToOutlineEpisodes(outline.summary, resolvedCount),
    resolvedCount
  )

  return {
    ...outline,
    summaryEpisodes,
    summary: outlineEpisodesToSummary(summaryEpisodes)
  }
}

