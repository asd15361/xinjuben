export type RoughOutlineFailureCode =
  | 'missing_title'
  | 'missing_genre'
  | 'missing_theme'
  | 'missing_protagonist'
  | 'missing_main_conflict'
  | 'missing_summary'
  | 'episode_count_short'
  | 'episode_count_overflow'
  | 'episode_numbers_invalid'
  | 'episode_summary_missing'

export interface RoughOutlineValidationResult {
  ok: boolean
  code?: RoughOutlineFailureCode
  actualEpisodeCount: number
  missingEpisodeNos: number[]
  duplicateEpisodeNos: number[]
  emptyEpisodeNos: number[]
}

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeEpisodeNo(value: unknown, fallback: number): number {
  const next = Number(value)
  if (!Number.isFinite(next) || next <= 0) return fallback
  return Math.floor(next)
}

export function validateOutlineEpisodeBatch(input: {
  episodes: Array<{ episodeNo?: unknown; summary?: unknown }>
  startEpisode: number
  endEpisode: number
}): RoughOutlineValidationResult {
  const normalized = input.episodes.map((episode, index) => ({
    episodeNo: normalizeEpisodeNo(episode?.episodeNo, input.startEpisode + index),
    summary: normalizeText(episode?.summary)
  }))
  const expectedEpisodeNos = Array.from(
    { length: input.endEpisode - input.startEpisode + 1 },
    (_, index) => input.startEpisode + index
  )
  const actualEpisodeCount = normalized.length
  const emptyEpisodeNos = normalized
    .filter((episode) => !episode.summary)
    .map((episode) => episode.episodeNo)
  const episodeNoCounts = new Map<number, number>()
  for (const episode of normalized) {
    episodeNoCounts.set(episode.episodeNo, (episodeNoCounts.get(episode.episodeNo) || 0) + 1)
  }
  const duplicateEpisodeNos = Array.from(episodeNoCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([episodeNo]) => episodeNo)
    .sort((a, b) => a - b)
  const actualEpisodeNos = new Set(normalized.map((episode) => episode.episodeNo))
  const missingEpisodeNos = expectedEpisodeNos.filter(
    (episodeNo) => !actualEpisodeNos.has(episodeNo)
  )
  const overflowEpisodeNos = normalized
    .map((episode) => episode.episodeNo)
    .filter((episodeNo) => episodeNo < input.startEpisode || episodeNo > input.endEpisode)

  if (actualEpisodeCount < expectedEpisodeNos.length) {
    return {
      ok: false,
      code: 'episode_count_short',
      actualEpisodeCount,
      missingEpisodeNos,
      duplicateEpisodeNos,
      emptyEpisodeNos
    }
  }

  if (actualEpisodeCount > expectedEpisodeNos.length) {
    return {
      ok: false,
      code: 'episode_count_overflow',
      actualEpisodeCount,
      missingEpisodeNos,
      duplicateEpisodeNos,
      emptyEpisodeNos
    }
  }

  if (
    missingEpisodeNos.length > 0 ||
    duplicateEpisodeNos.length > 0 ||
    overflowEpisodeNos.length > 0
  ) {
    return {
      ok: false,
      code: 'episode_numbers_invalid',
      actualEpisodeCount,
      missingEpisodeNos,
      duplicateEpisodeNos,
      emptyEpisodeNos
    }
  }

  if (emptyEpisodeNos.length > 0) {
    return {
      ok: false,
      code: 'episode_summary_missing',
      actualEpisodeCount,
      missingEpisodeNos,
      duplicateEpisodeNos,
      emptyEpisodeNos
    }
  }

  return {
    ok: true,
    actualEpisodeCount,
    missingEpisodeNos: [],
    duplicateEpisodeNos: [],
    emptyEpisodeNos: []
  }
}

export function validateStructuredOutline(input: {
  outline:
    | {
        title?: unknown
        genre?: unknown
        theme?: unknown
        protagonist?: unknown
        mainConflict?: unknown
        summary?: unknown
        episodes?: Array<{ episodeNo?: unknown; summary?: unknown }>
      }
    | null
    | undefined
  targetEpisodeCount: number
}): RoughOutlineValidationResult {
  const outline = input.outline
  if (!outline || typeof outline !== 'object') {
    return {
      ok: false,
      code: 'missing_title',
      actualEpisodeCount: 0,
      missingEpisodeNos: Array.from({ length: input.targetEpisodeCount }, (_, index) => index + 1),
      duplicateEpisodeNos: [],
      emptyEpisodeNos: []
    }
  }

  if (!normalizeText(outline.title)) {
    return {
      ok: false,
      code: 'missing_title',
      actualEpisodeCount: 0,
      missingEpisodeNos: [],
      duplicateEpisodeNos: [],
      emptyEpisodeNos: []
    }
  }
  if (!normalizeText(outline.genre)) {
    return {
      ok: false,
      code: 'missing_genre',
      actualEpisodeCount: 0,
      missingEpisodeNos: [],
      duplicateEpisodeNos: [],
      emptyEpisodeNos: []
    }
  }
  if (!normalizeText(outline.theme)) {
    return {
      ok: false,
      code: 'missing_theme',
      actualEpisodeCount: 0,
      missingEpisodeNos: [],
      duplicateEpisodeNos: [],
      emptyEpisodeNos: []
    }
  }
  if (!normalizeText(outline.protagonist)) {
    return {
      ok: false,
      code: 'missing_protagonist',
      actualEpisodeCount: 0,
      missingEpisodeNos: [],
      duplicateEpisodeNos: [],
      emptyEpisodeNos: []
    }
  }
  if (!normalizeText(outline.mainConflict)) {
    return {
      ok: false,
      code: 'missing_main_conflict',
      actualEpisodeCount: 0,
      missingEpisodeNos: [],
      duplicateEpisodeNos: [],
      emptyEpisodeNos: []
    }
  }
  if (!normalizeText(outline.summary)) {
    return {
      ok: false,
      code: 'missing_summary',
      actualEpisodeCount: 0,
      missingEpisodeNos: [],
      duplicateEpisodeNos: [],
      emptyEpisodeNos: []
    }
  }

  return validateOutlineEpisodeBatch({
    episodes: Array.isArray(outline.episodes) ? outline.episodes : [],
    startEpisode: 1,
    endEpisode: input.targetEpisodeCount
  })
}
