import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type { GenerationBriefPackage } from './generation-brief-template'
import { normalizeChatTranscriptForGeneration } from './normalize-chat-transcript'
import { buildFallbackGenerationBrief, buildFallbackStoryIntent } from './summarize-chat-for-generation-fallback-builders'
import { inferFallbackSummaryFacts } from './summarize-chat-for-generation-fallback-facts'

export type SummaryPayload = {
  generationBrief?: Partial<GenerationBriefPackage>
  storyIntent?: Partial<StoryIntentPackageDto>
}

export function buildFallbackSummary(chatTranscript: string): SummaryPayload {
  const normalized = normalizeChatTranscriptForGeneration(chatTranscript)
  const merged = normalized
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ')

  const facts = inferFallbackSummaryFacts(merged)

  return {
    generationBrief: buildFallbackGenerationBrief(facts),
    storyIntent: buildFallbackStoryIntent(facts)
  }
}
