import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type { OutlineDraftDto, CharacterDraftDto } from '../../../shared/contracts/workflow'
import {
  normalizeOutlineEpisodes,
  outlineEpisodesToSummary,
  parseSummaryToOutlineEpisodes
} from '../../../shared/domain/workflow/outline-episodes'
import { DEFAULT_EPISODE_COUNT, extractEpisodeCountFromGenerationBrief } from '../../../shared/domain/workflow/episode-count'
import {
  buildFallbackStoryIntent,
  generateCharacterBundle,
  generateOutlineBundle,
  type OutlineBundlePayload
} from './generate-outline-and-characters-support'
import { enrichCharacterDrafts } from './enrich-character-drafts'
import { summarizeChatForGeneration } from './summarize-chat-for-generation'
import { buildFallbackCharacters, normalizeFallbackCharacterDraft } from './outline-character-fallback'
import { deriveFallbackAssetText, deriveFallbackEpisodes, deriveFallbackProtectTargetText, deriveFallbackSummary, deriveFallbackTitle } from './outline-plot-fallback'
import { normalizeOutlineStoryIntent } from './outline-story-intent'
import { normalizeAnchorName } from './summarize-chat-for-generation-shared'

import { mergeOutlineFacts, prioritizeOutlineFacts, toDraftFacts } from './outline-facts'

export async function generateOutlineAndCharactersFromChat(input: {
  chatTranscript: string
  runtimeConfig: RuntimeProviderConfig
}): Promise<{
  storyIntent: StoryIntentPackageDto
  outlineDraft: OutlineDraftDto
  characterDrafts: CharacterDraftDto[]
}> {
  const summarized = await summarizeChatForGeneration({
    chatTranscript: input.chatTranscript,
    runtimeConfig: input.runtimeConfig
  })
  const generationBriefText = summarized.generationBriefText
  const targetEpisodeCount = extractEpisodeCountFromGenerationBrief(generationBriefText) || DEFAULT_EPISODE_COUNT
  const fallbackStoryIntent = normalizeOutlineStoryIntent(summarized.storyIntent, buildFallbackStoryIntent(generationBriefText))
  let outlineBundle: OutlineBundlePayload | null = null
  try {
    outlineBundle = await generateOutlineBundle({
      generationBriefText,
      runtimeConfig: input.runtimeConfig
    })
  } catch {
    outlineBundle = null
  }
  const storyIntent = normalizeOutlineStoryIntent(outlineBundle?.storyIntent, fallbackStoryIntent)
  storyIntent.generationBriefText = storyIntent.generationBriefText || generationBriefText
  const outlinePayload = outlineBundle?.outline ?? {
    title: '',
    genre: '',
    theme: '',
    protagonist: '',
    mainConflict: '',
    summary: '',
    episodes: [],
    facts: []
  }
  const mergedFacts = mergeOutlineFacts({
    generatedFacts: outlinePayload.facts || [],
    storyIntent,
    outline: outlinePayload,
    characters: []
  })
  const prioritizedFacts = prioritizeOutlineFacts({
    facts: mergedFacts,
    storyIntent
  })
  const outlineDraft: OutlineDraftDto = {
    title: outlinePayload.title?.trim() || storyIntent.titleHint || '',
    genre: outlinePayload.genre?.trim() || storyIntent.genre || '',
    theme: outlinePayload.theme?.trim() || storyIntent.themeAnchors?.[0] || '',
    protagonist: outlinePayload.protagonist?.trim() || storyIntent.protagonist || '',
    mainConflict: outlinePayload.mainConflict?.trim() || storyIntent.coreConflict || '',
    summary: outlinePayload.summary?.trim() || '',
    summaryEpisodes: [],
    facts: toDraftFacts(prioritizedFacts)
  }

  if (!outlineDraft.title.trim()) {
    outlineDraft.title = deriveFallbackTitle({
      genre: outlineDraft.genre,
      protagonist: outlineDraft.protagonist,
      mainConflict: outlineDraft.mainConflict
    })
  }
  if (!outlineDraft.summary.trim()) {
    outlineDraft.summary = deriveFallbackSummary({
      protagonist: outlineDraft.protagonist,
      mainConflict: outlineDraft.mainConflict,
      theme: outlineDraft.theme,
      facts: prioritizedFacts
        .filter((fact) => fact.label?.trim() && fact.description?.trim())
        .map((fact) => ({
          label: fact.label!.trim(),
          description: fact.description!.trim()
        }))
    })
  }
  const fallbackEpisodes = deriveFallbackEpisodes({
    protagonist: outlineDraft.protagonist || storyIntent.protagonist || '',
    antagonist: storyIntent.antagonist || '',
    conflict: outlineDraft.mainConflict || storyIntent.coreConflict || '',
    protectTarget: deriveFallbackProtectTargetText(`${outlineDraft.summary} ${storyIntent.freeChatFinalSummary || ''}`),
    keyAsset: deriveFallbackAssetText(`${outlineDraft.summary} ${storyIntent.freeChatFinalSummary || ''}`),
    episodeCount: targetEpisodeCount,
    generationBriefText
  })
  const summaryEpisodes = normalizeOutlineEpisodes(
    outlinePayload.episodes?.length
      ? outlinePayload.episodes
      : outlineDraft.summary.trim()
        ? fallbackEpisodes
        : parseSummaryToOutlineEpisodes(outlineDraft.summary, targetEpisodeCount),
    targetEpisodeCount
  )
  outlineDraft.summaryEpisodes = summaryEpisodes
  outlineDraft.summary = outlineEpisodesToSummary(summaryEpisodes)

  let characterBundle: { characters?: CharacterDraftDto[] } | null = null
  try {
    characterBundle = await generateCharacterBundle({
      generationBriefText,
      runtimeConfig: input.runtimeConfig,
      storyIntent,
      outlineSummary: outlineDraft.summary
    })
  } catch {
    characterBundle = null
  }
  const rawCharacters = (characterBundle?.characters || []).filter((c) => Boolean(c.name?.trim())).slice(0, 8)
  const fallbackCharacters = buildFallbackCharacters({
    protagonist: outlineDraft.protagonist,
    antagonist: storyIntent.antagonist || '',
    conflict: outlineDraft.mainConflict || storyIntent.coreConflict || '',
    outlineSummary: outlineDraft.summary,
    generationBriefText
  })
  const requiredCharacterNames = [storyIntent.protagonist, storyIntent.antagonist]
    .map((item) => normalizeAnchorName(item?.trim() || ''))
    .filter(Boolean)
  const requiredFallbackCharacters = fallbackCharacters.filter((character) =>
    requiredCharacterNames.includes(normalizeAnchorName(character.name.trim()))
  )
  const mergedCharacters = [...(rawCharacters.length ? rawCharacters : fallbackCharacters)]
  for (const requiredCharacter of requiredFallbackCharacters) {
    if (!mergedCharacters.some((character) => normalizeAnchorName(character.name.trim()) === normalizeAnchorName(requiredCharacter.name.trim()))) {
      mergedCharacters.push(requiredCharacter)
    }
  }
  const characterDrafts = enrichCharacterDrafts({
    characters: mergedCharacters.map((character) => normalizeFallbackCharacterDraft(character)),
    storyIntent,
    generationBriefText
  })

  return {
    storyIntent,
    outlineDraft,
    characterDrafts
  }
}




