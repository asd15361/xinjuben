import { buildFallbackEpisodeSummaries } from './outline-plot-fallback-episodes'
import {
  deriveEpisodeFallbackContext,
  deriveFallbackAssetText,
  deriveFallbackProtectTargetText,
  deriveFallbackSummary,
  deriveFallbackTitle
} from './outline-plot-fallback-metadata'

export { deriveFallbackSummary, deriveFallbackTitle }

export function deriveFallbackEpisodes(input: {
  protagonist: string
  antagonist: string
  conflict: string
  protectTarget: string
  keyAsset: string
  episodeCount?: number
  generationBriefText?: string
}): Array<{ episodeNo: number; summary: string }> {
  const context = deriveEpisodeFallbackContext(input)
  return buildFallbackEpisodeSummaries({
    ...context,
    episodeCount: input.episodeCount
  })
}

export { deriveFallbackProtectTargetText, deriveFallbackAssetText }
