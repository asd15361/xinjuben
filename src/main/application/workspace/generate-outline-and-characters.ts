/**
 * LEGACY WORKSPACE FLOW
 *
 * This file is NOT the current production rough-outline entry.
 *
 * Current production path is:
 * confirm-story-intent -> generate-seven-questions-draft -> save-confirmed-seven-questions
 * -> generate-outline-and-characters-from-confirmed-seven-questions
 *
 * This legacy file documents the earlier "confirmed storyIntent -> parallel seven questions +
 * character profiles -> rough outline" flow. Keep it only as historical implementation evidence
 * until the surrounding boundary cleanup is complete.
 */
import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { appendRuntimeDiagnosticLog } from '../../infrastructure/diagnostics/runtime-diagnostic-log.ts'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type { OutlineDraftDto, CharacterDraftDto, OutlineBlockDto } from '../../../shared/contracts/workflow'
import {
  normalizeOutlineEpisodes,
  outlineEpisodesToSummary,
  parseSummaryToOutlineEpisodes
} from '../../../shared/domain/workflow/outline-episodes'
import {
  DEFAULT_EPISODE_COUNT,
  extractEpisodeCountFromGenerationBrief
} from '../../../shared/domain/workflow/episode-count'
import { normalizeCharacterDrafts } from '../../../shared/domain/workflow/character-draft-normalization.ts'
import {
  isCharacterBundleStructurallyComplete,
  resolveCharacterContractAnchors
} from '../../../shared/domain/workflow/character-contract.ts'
import {
  generateOutlineBundle
} from './generate-outline-and-characters-support'
import { normalizeOutlineStoryIntent } from './outline-story-intent'
import { validateStructuredOutline } from './rough-outline-validation.ts'
import { toDraftFacts } from './outline-facts'
import { orchestrateParallelAgentsWithContext } from './orchestrate-parallel-agents.ts'
import type { SevenQuestionsResult } from './generate-seven-questions-prompt.ts'
import type { CharacterProfileResult } from './generate-character-profile-prompt.ts'

/**
 * 基于真源生成粗纲和人物（重构后：七问和人物小传并行执行）
 *
 * 【重构说明】
 *
 * 重构前：
 *   storyIntent → 粗纲 → 人物小传（串行）
 *
 * 重构后：
 *   storyIntent
 *       ├──→ 七问 Agent ──────────────┐
 *       │                             ↓
 *       └──→ 人物小传 Agent ─→ 粗纲 Agent
 *                   │                    │
 *                   ↓                    ↓
 *             RAG/图谱/背景         落盘
 *
 * 七问和人物小传并行执行后，一起输入给粗纲 Agent。
 */
export async function generateOutlineAndCharactersFromChat(input: {
  runtimeConfig: RuntimeProviderConfig
  confirmedStoryIntent: StoryIntentPackageDto
  signal?: AbortSignal
}): Promise<{
  storyIntent: StoryIntentPackageDto
  outlineDraft: OutlineDraftDto
  characterDrafts: CharacterDraftDto[]
  sevenQuestions?: SevenQuestionsResult
  characterProfiles?: CharacterProfileResult
}> {
  const generationBriefText = input.confirmedStoryIntent.generationBriefText?.trim()
  if (!generationBriefText) {
    throw new Error('confirmed_story_intent_missing')
  }

  const targetEpisodeCount =
    extractEpisodeCountFromGenerationBrief(generationBriefText) || DEFAULT_EPISODE_COUNT

  const baseStoryIntent = normalizeOutlineStoryIntent(input.confirmedStoryIntent)

  // 【重构核心】并行调用七问 Agent 和人物小传 Agent
  const parallelContext = await orchestrateParallelAgentsWithContext({
    storyIntent: baseStoryIntent,
    totalEpisodes: targetEpisodeCount,
    runtimeConfig: input.runtimeConfig,
    signal: input.signal
  })

  const { sevenQuestions } = parallelContext

  // 将七问和人物小传传递给粗纲生成
  const outlineBundle = await generateOutlineBundle({
    generationBriefText,
    totalEpisodes: targetEpisodeCount,
    runtimeConfig: input.runtimeConfig,
    signal: input.signal,
    sevenQuestions,
    characterProfiles: parallelContext.characterProfilesResult
  })
  const outlinePayload = outlineBundle?.outline
  const outlineValidation = validateStructuredOutline({
    outline: outlinePayload,
    targetEpisodeCount
  })
  if (!outlinePayload || !outlineValidation.ok) {
    await appendRuntimeDiagnosticLog(
      'rough_outline',
      `rough_outline_final_validation_failed code=${outlineValidation.code || 'unknown'} actualEpisodeCount=${outlineValidation.actualEpisodeCount} missing=[${outlineValidation.missingEpisodeNos.join(',')}] duplicate=[${outlineValidation.duplicateEpisodeNos.join(',')}] empty=[${outlineValidation.emptyEpisodeNos.join(',')}]`
    )
    throw new Error(`rough_outline_incomplete:${outlineValidation.code || 'episode_numbers_invalid'}`)
  }
  const validatedOutline = outlinePayload
  const storyIntent = normalizeOutlineStoryIntent(baseStoryIntent)
  storyIntent.generationBriefText = storyIntent.generationBriefText || generationBriefText
  const outlineDraft: OutlineDraftDto = {
    title: validatedOutline.title?.trim() || storyIntent.titleHint || '',
    genre: validatedOutline.genre?.trim() || storyIntent.genre || '',
    theme: validatedOutline.theme?.trim() || storyIntent.themeAnchors?.[0] || '',
    protagonist: validatedOutline.protagonist?.trim() || storyIntent.protagonist || '',
    mainConflict: validatedOutline.mainConflict?.trim() || storyIntent.coreConflict || '',
    summary: validatedOutline.summary?.trim() || '',
    summaryEpisodes: [],
    facts: toDraftFacts(validatedOutline.facts || [])
  }

  const summaryEpisodes = normalizeOutlineEpisodes(
    validatedOutline.episodes?.length
      ? validatedOutline.episodes
      : parseSummaryToOutlineEpisodes(outlineDraft.summary, targetEpisodeCount),
    targetEpisodeCount
  )
  outlineDraft.summaryEpisodes = summaryEpisodes
  if (!outlineDraft.summary) {
    outlineDraft.summary = outlineEpisodesToSummary(outlineDraft.summaryEpisodes)
  }

  // 将七问结果映射到 outlineBlocks（篇章级叙事骨架）
  if (sevenQuestions && sevenQuestions.sections.length > 0) {
    outlineDraft.outlineBlocks = sevenQuestions.sections.map((section, index) => {
      // 找出属于该篇章的集
      const blockEpisodes = summaryEpisodes.filter(
        (ep) => ep.episodeNo >= section.startEpisode && ep.episodeNo <= section.endEpisode
      )

      return {
        blockNo: index + 1,
        label: section.sectionTitle || `篇章${index + 1}`,
        startEpisode: section.startEpisode,
        endEpisode: section.endEpisode,
        summary: '',
        episodes: blockEpisodes,
        sectionTitle: section.sectionTitle,
        sevenQuestions: section.sevenQuestions
      } satisfies OutlineBlockDto
    })
  }

  // 【重构说明】人物小传已经在并行阶段生成，不需要再单独调用 generateCharacterBundle
  // 直接使用并行阶段生成的角色
  const rawCharacters = (parallelContext.characterProfilesResult?.characters || [])
    .filter((c) => Boolean(c.name?.trim()))
    .slice(0, 8)

  const normalizedCharacters = normalizeCharacterDrafts(rawCharacters)
  const anchors = resolveCharacterContractAnchors({
    storyIntent,
    outline: outlineDraft
  })
  if (
    !isCharacterBundleStructurallyComplete({
      characters: normalizedCharacters,
      protagonist: anchors.protagonist,
      antagonist: anchors.antagonist
    })
  ) {
    throw new Error('character_bundle_incomplete')
  }

  return {
    storyIntent,
    outlineDraft,
    characterDrafts: normalizedCharacters,
    sevenQuestions,
    characterProfiles: parallelContext.characterProfilesResult
  }
}
