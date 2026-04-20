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
import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { CharacterProfileV2Dto } from '@shared/contracts/character-profile-v2'
import type { FactionMatrixDto } from '@shared/contracts/faction-matrix'
import type { ProjectEntityStoreDto } from '@shared/contracts/entities'
import type {
  OutlineDraftDto,
  CharacterDraftDto,
  SevenQuestionsResultDto
} from '@shared/contracts/workflow'
import {
  normalizeOutlineEpisodes,
  outlineEpisodesToSummary,
  parseSummaryToOutlineEpisodes
} from '@shared/domain/workflow/outline-episodes'
import {
  DEFAULT_EPISODE_COUNT,
  extractEpisodeCountFromGenerationBrief
} from '@shared/domain/workflow/episode-count'
import { normalizeCharacterDrafts } from '@shared/domain/workflow/character-draft-normalization'
import {
  getCharacterBundleContractIssues,
  isCharacterBundleStructurallyComplete,
  isCharacterDraftStructurallyComplete,
  resolveCharacterContractAnchors
} from '@shared/domain/workflow/character-contract'
import { mapV2ToLegacyCharacterDraft } from '@shared/contracts/character-profile-v2'
import { normalizeOutlineStoryIntent } from './outline-story-intent'
import { validateStructuredOutline } from './rough-outline-validation'
import { toDraftFacts, type OutlineFactCandidate } from './outline-facts'
import { confirmFormalFact } from '../formal-fact/confirm-formal-fact'
import {
  hasConfirmedSevenQuestions,
  extractConfirmedSevenQuestions
} from '@shared/domain/workflow/seven-questions-authority'
import { parseStructuredGenerationBrief } from './summarize-chat-for-generation-support'
import { enrichCharacterDrafts } from './enrich-character-drafts'
import {
  attachMasterEntityIdsToCharacterDrafts,
  buildOutlineCharacterEntityStore
} from './build-outline-character-entity-store'

interface ConfirmedSevenQuestionsGenerationDeps {
  appendDiagnosticLog?: (message: string) => Promise<void>
  generateCharacterProfiles?: (input: {
    storyIntent: StoryIntentPackageDto
    totalEpisodes: number
    runtimeConfig: RuntimeProviderConfig
    signal?: AbortSignal
  }) => Promise<{
    characters: CharacterDraftDto[]
    characterProfilesV2?: CharacterProfileV2Dto[]
    factionMatrix?: FactionMatrixDto
  }>
  generateOutlineBundle?: (input: {
    generationBriefText: string
    totalEpisodes: number
    runtimeConfig: RuntimeProviderConfig
    signal?: AbortSignal
    sevenQuestions: SevenQuestionsResultDto
    characterProfiles: { characters: CharacterDraftDto[] }
    characterProfilesV2?: CharacterProfileV2Dto[]
    factionMatrix?: FactionMatrixDto
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

function normalizeCharacterName(value: string): string {
  return value.trim().toLowerCase()
}

function clampCharacterDraftsToVisibleRoster(input: {
  characterDrafts: CharacterDraftDto[]
  entityStore: ProjectEntityStoreDto
}): CharacterDraftDto[] {
  if (input.characterDrafts.length <= 22) {
    return input.characterDrafts
  }

  const visibleNameSet = new Set(
    input.entityStore.characters.map((character) => normalizeCharacterName(character.name)).filter(Boolean)
  )

  return [...input.characterDrafts]
    .sort((left, right) => {
      const leftVisible = visibleNameSet.has(normalizeCharacterName(left.name)) ? 0 : 1
      const rightVisible = visibleNameSet.has(normalizeCharacterName(right.name)) ? 0 : 1
      if (leftVisible !== rightVisible) return leftVisible - rightVisible

      const leftRole = left.roleLayer === 'core' ? 0 : left.roleLayer === 'active' ? 1 : 2
      const rightRole = right.roleLayer === 'core' ? 0 : right.roleLayer === 'active' ? 1 : 2
      if (leftRole !== rightRole) return leftRole - rightRole

      return left.name.localeCompare(right.name, 'zh-Hans-CN')
    })
    .slice(0, 22)
}

async function appendConfirmedSevenQuestionsDiagnosticLog(message: string): Promise<void> {
  const { appendRuntimeDiagnosticLog } = await import(
    '../../infrastructure/diagnostics/runtime-diagnostic-log.js'
  )
  await appendRuntimeDiagnosticLog('rough_outline', message)
}

function buildConfirmedSevenQuestionsHandshakeSummary(
  confirmedSevenQuestions: SevenQuestionsResultDto
): string {
  return confirmedSevenQuestions.sections
    .map((section, index) => {
      const questions = section.sevenQuestions
      const hasValue = (value: unknown) => typeof value === 'string' && value.trim().length > 0
      return [
        `section=${index + 1}`,
        `episodes=${section.startEpisode}-${section.endEpisode}`,
        `goal=${hasValue(questions.goal) ? '1' : '0'}`,
        `obstacle=${hasValue(questions.obstacle) ? '1' : '0'}`,
        `effort=${hasValue(questions.effort) ? '1' : '0'}`,
        `result=${hasValue(questions.result) ? '1' : '0'}`,
        `twist=${hasValue(questions.twist) ? '1' : '0'}`,
        `turnaround=${hasValue(questions.turnaround) ? '1' : '0'}`,
        `ending=${hasValue(questions.ending) ? '1' : '0'}`
      ].join(' ')
    })
    .join(' | ')
}

async function generateCharacterProfilesFromConfirmedSevenQuestionsDefault(input: {
  storyIntent: StoryIntentPackageDto
  totalEpisodes: number
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
}): Promise<{
  characters: CharacterDraftDto[]
  characterProfilesV2?: CharacterProfileV2Dto[]
  factionMatrix?: FactionMatrixDto
}> {
  const { generateFactionMatrix } = await import('./faction-matrix-agent.js')
  const { generateCharacterProfileV2 } = await import('./character-profile-v2-agent.js')
  let factionMatrix: FactionMatrixDto
  try {
    factionMatrix = await generateFactionMatrix({
      storyIntent: input.storyIntent,
      totalEpisodes: input.totalEpisodes,
      runtimeConfig: input.runtimeConfig,
      signal: input.signal
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'unknown')
    if (
      /^faction_matrix_timeout:/i.test(message) ||
      /^faction_matrix_parse_failed:/i.test(message) ||
      /^faction_matrix_generation_failed:/i.test(message)
    ) {
      throw error
    }
    throw new Error(`faction_matrix_generation_failed:${message}`)
  }

  const v2Result = await generateCharacterProfileV2({
    storyIntent: input.storyIntent,
    factionMatrix,
    runtimeConfig: input.runtimeConfig,
    signal: input.signal
  })

  return {
    characters: v2Result.characters.map((item) => mapV2ToLegacyCharacterDraft(item)),
    characterProfilesV2: v2Result.characters,
    factionMatrix
  }
}

async function generateOutlineBundleFromConfirmedSevenQuestionsDefault(input: {
  generationBriefText: string
  totalEpisodes: number
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
  sevenQuestions: SevenQuestionsResultDto
  characterProfiles: { characters: CharacterDraftDto[] }
  characterProfilesV2?: CharacterProfileV2Dto[]
  factionMatrix?: FactionMatrixDto
}) {
  const { generateOutlineBundle } = await import('./generate-outline-and-characters-support.js')
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
  projectId: string
  storyIntent: StoryIntentPackageDto
  outlineDraft: OutlineDraftDto | null
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
}, deps: ConfirmedSevenQuestionsGenerationDeps = {}): Promise<{
  storyIntent: StoryIntentPackageDto
  outlineDraft: OutlineDraftDto
  characterDrafts: CharacterDraftDto[]
  entityStore: ProjectEntityStoreDto
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
  await appendDiagnosticLog(
    `rough_outline_confirmed_seven_questions_handshake ${buildConfirmedSevenQuestionsHandshakeSummary(confirmedSevenQuestions)}`
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
    characterProfiles: { characters: characterProfilesResult.characters },
    characterProfilesV2: characterProfilesResult.characterProfilesV2,
    factionMatrix: characterProfilesResult.factionMatrix
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

  const normalizedCharacters = normalizeCharacterDrafts(rawCharacters)
  const characterCardAuthorityNames = resolveCharacterCardAuthorityNames(generationBriefText)

  // 【第一刀】主角与反派免死金牌：无论 characterCards 是否列出，都必须强制保留
  const protagonistName = baseStoryIntent.protagonist?.trim() || ''
  const antagonistName = baseStoryIntent.antagonist?.trim() || ''
  const anchorNames = [protagonistName, antagonistName].filter(Boolean)

  const preEnrichedCharacters =
    characterCardAuthorityNames.length > 0
      ? normalizedCharacters.filter((character) => {
          // 如果在卡片名单里，保留
          if (characterCardAuthorityNames.includes(character.name)) return true
          // 如果名字模糊匹配主角或反派，强制保留（免死金牌）
          for (const anchorName of anchorNames) {
            if (character.name.includes(anchorName) || anchorName.includes(character.name)) {
              return true
            }
          }
          return false
        })
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
    const normalizedNames = filteredCharacters.map((item) => item.name.trim()).filter(Boolean)
    const bundleIssues = getCharacterBundleContractIssues({
      characters: filteredCharacters,
      protagonist: anchors.protagonist,
      antagonist: anchors.antagonist
    })
    const incompleteSummary = bundleIssues.incompleteCharacters
      .map((item) => `${item.name}{legacy:${item.missingLegacyFields.join('|') || '-'};v2:${item.missingV2Fields.join('|') || '-'}}`)
      .join(',')
    await appendDiagnosticLog(
      `character_bundle_incomplete_after_enrichment protagonist=${anchors.protagonist || 'missing'} antagonist=${anchors.antagonist || 'missing'} protagonistCovered=${bundleIssues.protagonistCovered ? 1 : 0} antagonistCovered=${bundleIssues.antagonistCovered ? 1 : 0} characters=${filteredCharacters.length} incomplete=[${incompleteSummary}] names=[${normalizedNames.join(',')}]`
    )
  }

  if (characterCardAuthorityNames.length > 0 && filteredCharacters.length !== normalizedCharacters.length) {
    await appendDiagnosticLog(
      `character_bundle_filtered_to_role_cards cards=${characterCardAuthorityNames.length} before=${normalizedCharacters.length} after=${filteredCharacters.length}`
    )
  }

  const entityStore = buildOutlineCharacterEntityStore({
    projectId: input.projectId,
    factionMatrix: characterProfilesResult.factionMatrix,
    characterProfilesV2: characterProfilesResult.characterProfilesV2,
    focusedCharacterDrafts: filteredCharacters
  })
  const attachedCharacterDrafts = attachMasterEntityIdsToCharacterDrafts({
    drafts: filteredCharacters,
    entityStore
  })
  const characterDrafts = clampCharacterDraftsToVisibleRoster({
    characterDrafts: attachedCharacterDrafts,
    entityStore
  })

  if (characterDrafts.length !== attachedCharacterDrafts.length) {
    await appendDiagnosticLog(
      `character_bundle_trimmed_to_visible_roster before=${attachedCharacterDrafts.length} after=${characterDrafts.length} entityCharacters=${entityStore.characters.length}`
    )
  }

  await appendDiagnosticLog(
    `rough_outline_finish outlineBlocks=${outlineDraft.outlineBlocks?.length || 0} characters=${characterDrafts.length} entityCharacters=${entityStore.characters.length} factions=${entityStore.factions.length}`
  )

  return {
    storyIntent,
    outlineDraft,
    characterDrafts,
    entityStore,
    sevenQuestions: confirmedSevenQuestions
  }
}

