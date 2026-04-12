/**
 * src/main/application/workspace/generate-outline-and-characters-from-confirmed-seven-questions.ts
 *
 * 基于确认版七问生成粗纲和人物。
 *
 * 职责：
 * - 检查项目是否已有确认版七问
 * - 如果没有，报错（不要偷偷再生成一版七问）
 * - 如果有，基于确认版七问生成粗纲和人物
 *
 * 【七问工作流】
 * storyIntent 已确认
 *   -> generateSevenQuestionsDraft（生成初稿）
 *   -> 前端展示七问（用户修改/确认）
 *   -> saveConfirmedSevenQuestions（写入 outlineBlocks）
 *   -> generateOutlineAndCharactersFromConfirmedSevenQuestions（生成粗纲）<- 这里
 */

import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type {
  OutlineDraftDto,
  CharacterDraftDto,
  SevenQuestionsResultDto
} from '../../../shared/contracts/workflow'
import {
  normalizeOutlineEpisodes,
  outlineEpisodesToSummary,
  parseSummaryToOutlineEpisodes
} from '../../../shared/domain/workflow/outline-episodes.ts'
import {
  DEFAULT_EPISODE_COUNT,
  extractEpisodeCountFromGenerationBrief
} from '../../../shared/domain/workflow/episode-count.ts'
import { normalizeCharacterDrafts } from '../../../shared/domain/workflow/character-draft-normalization.ts'
import {
  isCharacterBundleStructurallyComplete,
  resolveCharacterContractAnchors
} from '../../../shared/domain/workflow/character-contract.ts'
import { normalizeOutlineStoryIntent } from './outline-story-intent.ts'
import { validateStructuredOutline } from './rough-outline-validation.ts'
import { toDraftFacts, type OutlineFactCandidate } from './outline-facts.ts'
import { confirmFormalFact } from '../formal-fact/confirm-formal-fact.ts'
import {
  hasConfirmedSevenQuestions,
  extractConfirmedSevenQuestions
} from '../../../shared/domain/workflow/seven-questions-authority.ts'
import { parseStructuredGenerationBrief } from './summarize-chat-for-generation-support.ts'
import { enrichCharacterDrafts } from './enrich-character-drafts.ts'

interface ConfirmedSevenQuestionsGenerationDeps {
  appendDiagnosticLog?: (message: string) => Promise<void>
  generateCharacterProfiles?: (input: {
    storyIntent: StoryIntentPackageDto
    totalEpisodes: number
    runtimeConfig: RuntimeProviderConfig
    signal?: AbortSignal
  }) => Promise<{ characters: CharacterDraftDto[] }>
  generateOutlineBundle?: (input: {
    generationBriefText: string
    totalEpisodes: number
    runtimeConfig: RuntimeProviderConfig
    signal?: AbortSignal
    sevenQuestions: SevenQuestionsResultDto
    characterProfiles: { characters: CharacterDraftDto[] }
  }) => Promise<{
    outline?: {
      title?: string
      genre?: string
      theme?: string
      protagonist?: string
      mainConflict?: string
      summary?: string
      episodes?: Array<{ episodeNo?: number; summary?: string }>
      facts?: OutlineFactCandidate[]
    } | null
  }>
}

function resolveCharacterCardAuthorityNames(generationBriefText: string): string[] {
  const structured = parseStructuredGenerationBrief(generationBriefText)
  const cards = Array.isArray(structured?.characterCards)
    ? structured.characterCards
    : []

  const seen = new Set<string>()
  const names: string[] = []
  for (const card of cards) {
    const name = typeof card?.name === 'string' ? card.name.trim() : ''
    if (!name || seen.has(name)) continue
    seen.add(name)
    names.push(name)
  }

  return names
}

async function appendConfirmedSevenQuestionsDiagnosticLog(message: string): Promise<void> {
  const { appendRuntimeDiagnosticLog } = await import(
    '../../infrastructure/diagnostics/runtime-diagnostic-log.ts'
  )
  await appendRuntimeDiagnosticLog('rough_outline', message)
}

async function generateCharacterProfilesFromConfirmedSevenQuestionsDefault(input: {
  storyIntent: StoryIntentPackageDto
  totalEpisodes: number
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
}): Promise<{ characters: CharacterDraftDto[] }> {
  const { generateCharacterProfilesFromStoryIntent } = await import(
    './orchestrate-parallel-agents.ts'
  )
  return generateCharacterProfilesFromStoryIntent(input)
}

async function generateOutlineBundleFromConfirmedSevenQuestionsDefault(input: {
  generationBriefText: string
  totalEpisodes: number
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
  sevenQuestions: SevenQuestionsResultDto
  characterProfiles: { characters: CharacterDraftDto[] }
}) {
  const { generateOutlineBundle } = await import('./generate-outline-and-characters-support.ts')
  return generateOutlineBundle(input)
}

/**
 * 基于确认版七问生成粗纲和人物。
 *
 * @param input.storyIntent - 已确认的真源
 * @param input.outlineDraft - 当前 outlineDraft（必须已包含确认版七问）
 * @param input.runtimeConfig - 运行时配置
 * @param input.signal - 中断信号
 * @returns 粗纲、人物、七问
 */
export async function generateOutlineAndCharactersFromConfirmedSevenQuestions(input: {
  storyIntent: StoryIntentPackageDto
  outlineDraft: OutlineDraftDto | null
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
}, deps: ConfirmedSevenQuestionsGenerationDeps = {}): Promise<{
  storyIntent: StoryIntentPackageDto
  outlineDraft: OutlineDraftDto
  characterDrafts: CharacterDraftDto[]
  sevenQuestions: SevenQuestionsResultDto
}> {
  const generationBriefText = input.storyIntent.generationBriefText?.trim()
  const appendDiagnosticLog =
    deps.appendDiagnosticLog ?? appendConfirmedSevenQuestionsDiagnosticLog
  if (!generationBriefText) {
    throw new Error('confirmed_story_intent_missing')
  }

  // 关键检查：如果没有确认版七问，直接报错
  if (!hasConfirmedSevenQuestions(input.outlineDraft)) {
    await appendDiagnosticLog(
      'rough_outline_requires_confirmed_seven_questions: no confirmed seven questions found in outlineDraft'
    )
    throw new Error('rough_outline_requires_confirmed_seven_questions')
  }

  const targetEpisodeCount =
    extractEpisodeCountFromGenerationBrief(generationBriefText) || DEFAULT_EPISODE_COUNT

  // 从 outlineDraft 提取确认版七问
  const confirmedSevenQuestions = extractConfirmedSevenQuestions(input.outlineDraft)

  if (!confirmedSevenQuestions) {
    throw new Error('rough_outline_requires_confirmed_seven_questions')
  }

  await appendDiagnosticLog(
    `rough_outline_start from_confirmed_seven_questions sectionCount=${confirmedSevenQuestions.sectionCount} totalEpisodes=${targetEpisodeCount}`
  )

  const baseStoryIntent = normalizeOutlineStoryIntent(input.storyIntent)
  const generateCharacterProfiles =
    deps.generateCharacterProfiles ?? generateCharacterProfilesFromConfirmedSevenQuestionsDefault
  const buildOutlineBundle =
    deps.generateOutlineBundle ?? generateOutlineBundleFromConfirmedSevenQuestionsDefault

  // 七问已经确认，后续只允许生成人物小传，禁止重跑七问 Agent。
  const characterProfilesResult = await generateCharacterProfiles({
    storyIntent: baseStoryIntent,
    totalEpisodes: targetEpisodeCount,
    runtimeConfig: input.runtimeConfig,
    signal: input.signal
  })

  // 将确认版七问传递给粗纲生成
  const outlineBundle = await buildOutlineBundle({
    generationBriefText,
    totalEpisodes: targetEpisodeCount,
    runtimeConfig: input.runtimeConfig,
    signal: input.signal,
    sevenQuestions: confirmedSevenQuestions,
    characterProfiles: characterProfilesResult
  })

  const outlinePayload = outlineBundle?.outline
  const outlineValidation = validateStructuredOutline({
    outline: outlinePayload,
    targetEpisodeCount
  })

  if (!outlinePayload || !outlineValidation.ok) {
    await appendDiagnosticLog(
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
    // User has already confirmed the chapter-level direction through seven questions.
    // Facts produced inside this same outline confirmation flow must land as confirmed,
    // otherwise detailed_outline is guaranteed to block on the very next step.
    facts: toDraftFacts(validatedOutline.facts || []).map((fact) =>
      confirmFormalFact({
        actor: 'user',
        stage: 'outline',
        fact
      })
    )
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

  // 将确认版七问映射到 outlineBlocks
  if (confirmedSevenQuestions.sections.length > 0) {
    outlineDraft.outlineBlocks = confirmedSevenQuestions.sections.map((section, index) => {
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
      }
    })
  }

  const rawCharacters = (characterProfilesResult.characters || [])
    .filter((c) => Boolean(c.name?.trim()))
    .slice(0, 8)

  const normalizedCharacters = normalizeCharacterDrafts(rawCharacters)
  const characterCardAuthorityNames = resolveCharacterCardAuthorityNames(generationBriefText)
  const preEnrichedCharacters =
    characterCardAuthorityNames.length > 0
      ? normalizedCharacters.filter((character) => characterCardAuthorityNames.includes(character.name))
      : normalizedCharacters

  // 兜底补全：AI 生成的人物字段可能为空字符串或模板化套话，
  // Guardian 会在保存时检查所有必填字段（name/biography/goal/advantage/weakness/arc），
  // 这里用题材原型库 + generationBrief 中的角色卡信息自动补全缺失字段。
  const filteredCharacters = enrichCharacterDrafts({
    characters: preEnrichedCharacters,
    storyIntent: baseStoryIntent,
    generationBriefText
  })

  const anchors = resolveCharacterContractAnchors({
    storyIntent,
    outline: outlineDraft
  })

  if (
    !isCharacterBundleStructurallyComplete({
      characters: filteredCharacters,
      protagonist: anchors.protagonist,
      antagonist: anchors.antagonist
    })
  ) {
    await appendDiagnosticLog(
      `character_bundle_incomplete_after_enrichment protagonist=${anchors.protagonist || 'missing'} antagonist=${anchors.antagonist || 'missing'} characters=${filteredCharacters.length}`
    )
  }

  if (characterCardAuthorityNames.length > 0 && filteredCharacters.length !== normalizedCharacters.length) {
    await appendDiagnosticLog(
      `character_bundle_filtered_to_role_cards cards=${characterCardAuthorityNames.length} before=${normalizedCharacters.length} after=${filteredCharacters.length}`
    )
  }

  await appendDiagnosticLog(
    `rough_outline_finish outlineBlocks=${outlineDraft.outlineBlocks?.length || 0} characters=${filteredCharacters.length}`
  )

  return {
    storyIntent,
    outlineDraft,
    characterDrafts: filteredCharacters,
    sevenQuestions: confirmedSevenQuestions
  }
}
