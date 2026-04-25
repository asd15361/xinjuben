/**
 * src/main/application/workspace/generate-outline-and-characters-from-confirmed-seven-questions.ts
 *
 * 生成人物小传和粗纲骨架。
 *
 * 职责：
 * - 优先基于 StoryIntent 生成人物小传
 * - 再基于 StoryIntent + 人物小传生成统一粗纲骨架
 * - 兼容旧项目：如果 outlineBlocks 里已有确认版七问，把它作为叙事约束注入，不再把七问作为前置阶段
 *
 * 【当前工作流】
 * storyIntent 已确认
 *   -> 生成人物小传/势力底账
 *   -> 生成粗纲骨架
 *   -> outlineBlocks 只作为技术规划块，不再承担第二套七问账本
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
  resolveCharacterContractAnchors
} from '@shared/domain/workflow/character-contract'
import { mapV2ToLegacyCharacterDraft } from '@shared/contracts/character-profile-v2'
import { normalizeOutlineStoryIntent } from './outline-story-intent'
import { validateStructuredOutline } from './rough-outline-validation'
import { toDraftFacts, type OutlineFactCandidate } from './outline-facts'
import { confirmFormalFact } from '../formal-fact/confirm-formal-fact'
import { extractConfirmedSevenQuestions } from '@shared/domain/workflow/seven-questions-authority'
import { parseStructuredGenerationBrief } from './summarize-chat-for-generation-support'
import { enrichCharacterDrafts } from './enrich-character-drafts'
import {
  attachMasterEntityIdsToCharacterDrafts,
  buildOutlineCharacterEntityStore
} from './build-outline-character-entity-store'
import { getGovernanceOutlineBlockSize } from '@shared/domain/workflow/batching-contract'
import { buildOutlineBlocks } from '@shared/domain/workflow/planning-blocks'

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
    sevenQuestions?: SevenQuestionsResultDto
    characterProfiles: { characters: CharacterDraftDto[] }
    characterProfilesV2?: CharacterProfileV2Dto[]
    factionMatrix?: FactionMatrixDto
    marketProfile?: import('@shared/contracts/project').MarketProfileDto | null
    storyIntent?: StoryIntentPackageDto
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
  const cards = Array.isArray(structured?.characterCards) ? structured.characterCards : []

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

function isGenericRoleAnchor(value: string): boolean {
  return /^(主角|男主|女主|反派|对手|敌人)$/u.test(value.trim())
}

function isCharacterNameCovered(characters: CharacterDraftDto[], anchorName: string): boolean {
  const normalizedAnchor = normalizeCharacterName(anchorName)
  if (!normalizedAnchor) return true
  return characters.some((character) => {
    const normalizedName = normalizeCharacterName(character.name)
    return (
      normalizedName === normalizedAnchor ||
      normalizedName.includes(normalizedAnchor) ||
      normalizedAnchor.includes(normalizedName)
    )
  })
}

function buildMandatoryProtagonistDraft(input: {
  name: string
  storyIntent: StoryIntentPackageDto
  outlineDraft: OutlineDraftDto
  generationBriefText: string
}): CharacterDraftDto {
  const sourceText = [
    input.storyIntent.genre,
    input.storyIntent.coreConflict,
    input.storyIntent.sellingPremise,
    input.storyIntent.creativeSummary,
    input.storyIntent.freeChatFinalSummary,
    input.generationBriefText,
    input.outlineDraft.summary
  ]
    .filter(Boolean)
    .join('\n')
  const isHiddenBloodlineXianxia = /修仙|玄幻|仙盟|宗门|魔尊|血脉|吊坠/u.test(sourceText)
  const coreItem = /吊坠|遗物|玉佩/u.test(sourceText) ? '母亲吊坠碎片' : '核心线索'

  if (isHiddenBloodlineXianxia) {
    return {
      name: input.name,
      biography: `${input.name}是被宗门长期当成废柴的男主，体内封着足以引发正道争夺的魔尊血脉。他因${coreItem}被毁开始觉醒，在误信名门大小姐和忽视真女主守护之间不断受挫，最终查清父母旧案并学会掌控血脉。`,
      publicMask: '表面是修炼迟滞、处处被嘲笑的宗门底层弟子。',
      hiddenPressure: '他不知道自己为何被压成废柴，也不知道体内魔尊血脉一旦暴露会牵动整个仙盟。',
      fear: `失去${coreItem}、身世真相和暗中守护自己的人。`,
      protectTarget: `${coreItem}、自己的身世真相和真正守护他的人。`,
      conflictTrigger: `有人踩碎、抢夺或利用${coreItem}，或拿真女主逼他交出血脉秘密。`,
      advantage: '魔尊血脉一旦被逼醒，能在绝境中爆发出压倒性力量。',
      weakness: '前期自卑又缺真相，容易被伪善的反派大小姐骗取信任。',
      goal: '查清父母被害真相，弄清魔尊血脉来源，完成逆袭复仇并守住世界。',
      arc: '从被蒙蔽的废柴，到识破利用、掌控血脉、愿意承担守护责任的强者。',
      roleLayer: 'core'
    }
  }

  return {
    name: input.name,
    biography: `${input.name}是故事主角，围绕"${input.outlineDraft.mainConflict || input.storyIntent.coreConflict}"持续受压、查明真相并完成反击。`,
    publicMask: '表面被局势压住，只能先忍住寻找破局点。',
    hiddenPressure: '真正的底牌和身世真相还不能提前暴露。',
    fear: '失去身边仅有的支持和关键证据。',
    protectTarget: '关键证据、身边人和自己的选择权。',
    conflictTrigger: '对手拿身边人或核心证据逼他低头。',
    advantage: '能在压力场里藏锋、观察和反设局。',
    weakness: '前期信息不足，容易误判真正敌友。',
    goal: '查清真相并完成反击。',
    arc: '从被动受压到主动掌控局面。',
    roleLayer: 'core'
  }
}

function buildFallbackOutlinePayloadFromStoryIntent(input: {
  storyIntent: StoryIntentPackageDto
}): NonNullable<
  NonNullable<Awaited<ReturnType<NonNullable<ConfirmedSevenQuestionsGenerationDeps['generateOutlineBundle']>>>>['outline']
> {
  const storyIntent = input.storyIntent
  const protagonist = storyIntent.protagonist?.trim() || '主角'
  const antagonist = storyIntent.antagonist?.trim() || '对手'
  const conflict = storyIntent.coreConflict?.trim() || `${protagonist}与${antagonist}的核心冲突`

  return {
    title: storyIntent.titleHint?.trim() || protagonist,
    genre: storyIntent.genre?.trim() || '',
    theme: storyIntent.themeAnchors?.[0]?.trim() || storyIntent.emotionalPayoff?.trim() || '',
    protagonist,
    mainConflict: conflict,
    summary: '',
    episodes: [],
    facts: []
  }
}

function clampCharacterDraftsToVisibleRoster(input: {
  characterDrafts: CharacterDraftDto[]
  entityStore: ProjectEntityStoreDto
}): CharacterDraftDto[] {
  if (input.characterDrafts.length <= 22) {
    return input.characterDrafts
  }

  const visibleNameSet = new Set(
    input.entityStore.characters
      .map((character) => normalizeCharacterName(character.name))
      .filter(Boolean)
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
  const { appendRuntimeDiagnosticLog } =
    await import('../../infrastructure/diagnostics/runtime-diagnostic-log.js')
  await appendRuntimeDiagnosticLog('rough_outline', message)
}

function buildConfirmedSevenQuestionsHandshakeSummary(
  confirmedSevenQuestions: SevenQuestionsResultDto
): string {
  return confirmedSevenQuestions.sections
    .map((section, index) => {
      const questions = section.sevenQuestions
      const hasValue = (value: unknown): boolean =>
        typeof value === 'string' && value.trim().length > 0
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
  sevenQuestions?: SevenQuestionsResultDto
  characterProfiles: { characters: CharacterDraftDto[] }
  characterProfilesV2?: CharacterProfileV2Dto[]
  factionMatrix?: FactionMatrixDto
  marketProfile?: import('@shared/contracts/project').MarketProfileDto | null
  storyIntent?: StoryIntentPackageDto
}): Promise<{ outline?: {
  title?: string
  genre?: string
  theme?: string
  protagonist?: string
  mainConflict?: string
  summary?: string
  episodes?: Array<{ episodeNo?: number; summary?: string }>
  facts?: OutlineFactCandidate[]
} | null }> {
  const { generateOutlineBundle } = await import('./generate-outline-and-characters-support.js')
  const result = await generateOutlineBundle(input)
  if (!result) {
    throw new Error('generate_outline_bundle_failed:null_result')
  }
  return result
}

/**
 * 基于确认信息生成人物小传和粗纲。
 *
 * @param input.storyIntent - 已确认的真源
 * @param input.outlineDraft - 当前 outlineDraft（旧项目可能包含确认版七问，可选）
 * @param input.runtimeConfig - 运行时配置
 * @param input.signal - 中断信号
 * @returns 粗纲、人物、旧七问约束（如存在）
 */
export async function generateOutlineAndCharactersFromConfirmedSevenQuestions(
  input: {
    projectId: string
    storyIntent: StoryIntentPackageDto
    outlineDraft: OutlineDraftDto | null
    runtimeConfig: RuntimeProviderConfig
    signal?: AbortSignal
  },
  deps: ConfirmedSevenQuestionsGenerationDeps = {}
): Promise<{
  storyIntent: StoryIntentPackageDto
  outlineDraft: OutlineDraftDto
  characterDrafts: CharacterDraftDto[]
  entityStore: ProjectEntityStoreDto
  sevenQuestions: SevenQuestionsResultDto | null
  outlineGenerationError?: string
}> {
  const generationBriefText = input.storyIntent.generationBriefText?.trim()
  const appendDiagnosticLog = deps.appendDiagnosticLog ?? appendConfirmedSevenQuestionsDiagnosticLog
  if (!generationBriefText) {
    throw new Error('confirmed_story_intent_missing')
  }

  const targetEpisodeCount =
    extractEpisodeCountFromGenerationBrief(generationBriefText) || DEFAULT_EPISODE_COUNT

  const confirmedSevenQuestions = extractConfirmedSevenQuestions(input.outlineDraft)

  if (confirmedSevenQuestions) {
    await appendDiagnosticLog(
      `rough_outline_start from_confirmed_seven_questions sectionCount=${confirmedSevenQuestions.sectionCount} totalEpisodes=${targetEpisodeCount}`
    )
    await appendDiagnosticLog(
      `rough_outline_confirmed_seven_questions_handshake ${buildConfirmedSevenQuestionsHandshakeSummary(confirmedSevenQuestions)}`
    )
  } else {
    await appendDiagnosticLog(
      `rough_outline_start direct_story_intent totalEpisodes=${targetEpisodeCount}`
    )
  }

  const baseStoryIntent = normalizeOutlineStoryIntent(input.storyIntent)
  const generateCharacterProfiles =
    deps.generateCharacterProfiles ?? generateCharacterProfilesFromConfirmedSevenQuestionsDefault
  const buildOutlineBundle =
    deps.generateOutlineBundle ?? generateOutlineBundleFromConfirmedSevenQuestionsDefault

  // 先生成人物小传，再让粗纲消费人物关系和势力底账，避免七问/骨架两套账本漂移。
  const characterProfilesResult = await generateCharacterProfiles({
    storyIntent: baseStoryIntent,
    totalEpisodes: targetEpisodeCount,
    runtimeConfig: input.runtimeConfig,
    signal: input.signal
  })

  const storyIntent = normalizeOutlineStoryIntent(baseStoryIntent)
  storyIntent.generationBriefText = storyIntent.generationBriefText || generationBriefText
  let outlineGenerationError: string | undefined
  let validatedOutline: NonNullable<
    NonNullable<
      Awaited<ReturnType<NonNullable<ConfirmedSevenQuestionsGenerationDeps['generateOutlineBundle']>>>
    >['outline']
  >

  try {
    const outlineBundle = await buildOutlineBundle({
      generationBriefText,
      totalEpisodes: targetEpisodeCount,
      runtimeConfig: input.runtimeConfig,
      signal: input.signal,
      sevenQuestions: confirmedSevenQuestions ?? undefined,
      characterProfiles: { characters: characterProfilesResult.characters },
      characterProfilesV2: characterProfilesResult.characterProfilesV2,
      factionMatrix: characterProfilesResult.factionMatrix,
      marketProfile: input.storyIntent.marketProfile,
      storyIntent
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
      throw new Error(
        `rough_outline_incomplete:${outlineValidation.code || 'episode_numbers_invalid'}`
      )
    }

    validatedOutline = outlinePayload
  } catch (error) {
    outlineGenerationError = error instanceof Error ? error.message : String(error || 'unknown')
    await appendDiagnosticLog(
      `rough_outline_failed_without_temporary_skeleton error=${outlineGenerationError}`
    )
    validatedOutline = buildFallbackOutlinePayloadFromStoryIntent({
      storyIntent
    })
  }

  const outlineDraft: OutlineDraftDto = {
    title: validatedOutline.title?.trim() || storyIntent.titleHint || '',
    genre: validatedOutline.genre?.trim() || storyIntent.genre || '',
    theme: validatedOutline.theme?.trim() || storyIntent.themeAnchors?.[0] || '',
    protagonist: validatedOutline.protagonist?.trim() || storyIntent.protagonist || '',
    mainConflict: validatedOutline.mainConflict?.trim() || storyIntent.coreConflict || '',
    summary: validatedOutline.summary?.trim() || '',
    planningUnitEpisodes: getGovernanceOutlineBlockSize(),
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

  const summaryEpisodes = outlineGenerationError
    ? []
    : normalizeOutlineEpisodes(
        validatedOutline.episodes?.length
          ? validatedOutline.episodes
          : parseSummaryToOutlineEpisodes(outlineDraft.summary, targetEpisodeCount),
        targetEpisodeCount
      )
  outlineDraft.summaryEpisodes = summaryEpisodes

  if (!outlineGenerationError && !outlineDraft.summary) {
    outlineDraft.summary = outlineEpisodesToSummary(outlineDraft.summaryEpisodes)
  }

  // 旧项目如果已经锁过七问，把它折叠进 outlineBlocks；新流程只生成技术规划块。
  if (outlineGenerationError) {
    outlineDraft.outlineBlocks = []
  } else if (confirmedSevenQuestions?.sections.length) {
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
  } else {
    outlineDraft.outlineBlocks = buildOutlineBlocks(
      summaryEpisodes,
      outlineDraft.planningUnitEpisodes
    )
  }

  const rawCharacters = (characterProfilesResult.characters || []).filter((c) =>
    Boolean(c.name?.trim())
  )

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
  let filteredCharacters = enrichCharacterDrafts({
    characters: preEnrichedCharacters,
    storyIntent: baseStoryIntent,
    generationBriefText
  })

  const anchors = resolveCharacterContractAnchors({
    storyIntent,
    outline: outlineDraft
  })

  if (
    anchors.protagonist &&
    !isGenericRoleAnchor(anchors.protagonist) &&
    !isCharacterNameCovered(filteredCharacters, anchors.protagonist)
  ) {
    filteredCharacters = [
      buildMandatoryProtagonistDraft({
        name: anchors.protagonist,
        storyIntent,
        outlineDraft,
        generationBriefText
      }),
      ...filteredCharacters
    ]
    await appendDiagnosticLog(
      `character_bundle_added_missing_protagonist name=${anchors.protagonist}`
    )
  }

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
      .map(
        (item) =>
          `${item.name}{legacy:${item.missingLegacyFields.join('|') || '-'};v2:${item.missingV2Fields.join('|') || '-'}}`
      )
      .join(',')
    await appendDiagnosticLog(
      `character_bundle_incomplete_after_enrichment protagonist=${anchors.protagonist || 'missing'} antagonist=${anchors.antagonist || 'missing'} protagonistCovered=${bundleIssues.protagonistCovered ? 1 : 0} antagonistCovered=${bundleIssues.antagonistCovered ? 1 : 0} characters=${filteredCharacters.length} incomplete=[${incompleteSummary}] names=[${normalizedNames.join(',')}]`
    )
  }

  if (
    characterCardAuthorityNames.length > 0 &&
    filteredCharacters.length !== normalizedCharacters.length
  ) {
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
    sevenQuestions: confirmedSevenQuestions ?? null,
    outlineGenerationError
  }
}
