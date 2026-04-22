export type OutlineFactPayload = {
  label?: string
  description?: string
  level?: 'core' | 'supporting'
  linkedToPlot?: boolean
  linkedToTheme?: boolean
}

export type OutlineEpisodePayload = {
  episodeNo?: number
  summary?: string
}

export type RoughOutlineActSummaryPayload = {
  act?: 'opening' | 'midpoint' | 'climax' | 'ending'
  summary?: string
}

export interface OutlineBundlePayload {
  outline?: {
    title?: string
    genre?: string
    theme?: string
    protagonist?: string
    mainConflict?: string
    summary?: string
    episodes?: OutlineEpisodePayload[]
    facts?: OutlineFactPayload[]
  }
}

export interface OutlineOverviewPayload {
  outline?: OutlineBundlePayload['outline'] & {
    actSummaries?: RoughOutlineActSummaryPayload[]
  }
}

export interface OutlineEpisodeBatchPayload {
  batchSummary?: string
  episodes?: OutlineEpisodePayload[]
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeFacts(value: unknown): OutlineFactPayload[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((item) => item && typeof item === 'object')
    .map((item) => {
      const fact = item as Record<string, unknown>
      const level: OutlineFactPayload['level'] = fact.level === 'supporting' ? 'supporting' : 'core'
      return {
        label: toStringOrEmpty(fact.label),
        description: toStringOrEmpty(fact.description),
        level,
        linkedToPlot: fact.linkedToPlot !== false,
        linkedToTheme: fact.linkedToTheme !== false
      }
    })
    .filter((item) => item.label && item.description)
}

export function assembleOutlineBundleFromStages(input: {
  overview: OutlineOverviewPayload | null
  batches: OutlineEpisodeBatchPayload[]
}): OutlineBundlePayload {
  const outline = input.overview?.outline
  const episodes = input.batches
    .flatMap((batch) => (Array.isArray(batch?.episodes) ? batch.episodes : []))
    .map((episode, index) => ({
      episodeNo: Number.isFinite(Number(episode?.episodeNo))
        ? Number(episode?.episodeNo)
        : index + 1,
      summary: toStringOrEmpty(episode?.summary)
    }))
    .sort((left, right) => left.episodeNo - right.episodeNo)

  return {
    outline: {
      title: toStringOrEmpty(outline?.title),
      genre: toStringOrEmpty(outline?.genre),
      theme: toStringOrEmpty(outline?.theme),
      protagonist: toStringOrEmpty(outline?.protagonist),
      mainConflict: toStringOrEmpty(outline?.mainConflict),
      summary: toStringOrEmpty(outline?.summary),
      episodes,
      facts: normalizeFacts(outline?.facts)
    }
  }
}
