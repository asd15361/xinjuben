/**
 * server/src/application/workspace/generate-outline-and-characters-from-confirmed-seven-questions.ts
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
import type {
  GenerationDiagnosticDto,
  GenerationWarningDto,
  OutlineCharacterGenerationBundleDto
} from '@shared/contracts/outline-character-generation-bundle'
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
import {
  buildStrategyProtagonistFallback,
  detectStrategyContamination,
  repairStrategyContaminationValue,
  resolveGenerationStrategy,
  summarizeStrategyContaminationReplacements
} from '@shared/domain/generation-strategy/generation-strategy'
import type {
  GenerationStrategy,
  GenerationStrategyContaminationReplacement
} from '@shared/domain/generation-strategy/generation-strategy'
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
import { attachStoryFoundationToIntent } from '@shared/domain/world-building/world-foundation'

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

interface CharacterProfilesGenerationResult {
  characters: CharacterDraftDto[]
  characterProfilesV2?: CharacterProfileV2Dto[]
  factionMatrix?: FactionMatrixDto
}

export interface OutlineAndCharactersGenerationResult {
  storyIntent: StoryIntentPackageDto
  outlineDraft: OutlineDraftDto
  characterDrafts: CharacterDraftDto[]
  entityStore: ProjectEntityStoreDto
  sevenQuestions: SevenQuestionsResultDto | null
  outlineGenerationError?: string
}

type OutlineCharacterGenerationMode = 'bundle' | 'characters_only' | 'outline_only'

const SHORT_SERIES_FULL_PROFILE_LIMIT = 8
const MID_SERIES_FULL_PROFILE_LIMIT = 12
const LONG_SERIES_FULL_PROFILE_LIMIT = 22

const CHARACTER_DRAFT_TEXT_FIELDS: Array<keyof CharacterDraftDto> = [
  'name',
  'biography',
  'publicMask',
  'hiddenPressure',
  'fear',
  'protectTarget',
  'conflictTrigger',
  'advantage',
  'weakness',
  'goal',
  'arc',
  'appearance',
  'personality',
  'identity',
  'values',
  'plotFunction'
]

export function resolveReusableFactionMatrix(
  storyIntent: StoryIntentPackageDto
): FactionMatrixDto | undefined {
  return storyIntent.storyFoundation?.factionMatrix ?? storyIntent.factionMatrix ?? undefined
}

function buildStrategyRepairWarning(input: {
  stage: GenerationWarningDto['stage']
  label: string
  strategyLabel: string
  replacements: GenerationStrategyContaminationReplacement[]
}): GenerationWarningDto | null {
  if (input.replacements.length === 0) return null

  return {
    stage: input.stage,
    code: 'generation_strategy_contamination_repaired',
    message: `${input.label}已按题材策略「${input.strategyLabel}」清理串题材词：${summarizeStrategyContaminationReplacements(input.replacements)}`
  }
}

function repairOutlineCharacterBundleStrategyContamination(input: {
  storyIntent: StoryIntentPackageDto
  outlineDraft: OutlineDraftDto
  factionMatrix?: FactionMatrixDto
  characterProfilesV2?: CharacterProfileV2Dto[]
  normalizedDrafts: CharacterDraftDto[]
  fullProfileDrafts: CharacterDraftDto[]
  visibleCharacterDrafts: CharacterDraftDto[]
  entityStore: ProjectEntityStoreDto
}): {
  outlineDraft: OutlineDraftDto
  factionMatrix?: FactionMatrixDto
  characterProfilesV2?: CharacterProfileV2Dto[]
  normalizedDrafts: CharacterDraftDto[]
  fullProfileDrafts: CharacterDraftDto[]
  visibleCharacterDrafts: CharacterDraftDto[]
  entityStore: ProjectEntityStoreDto
  warnings: GenerationWarningDto[]
} {
  const strategy = resolveGenerationStrategy({
    marketProfile: input.storyIntent.marketProfile,
    genre: input.outlineDraft.genre || input.storyIntent.genre,
    storyIntentGenre: input.storyIntent.genre,
    title: input.outlineDraft.title || input.storyIntent.titleHint
  }).strategy

  const outlineRepair = repairStrategyContaminationValue(strategy, input.outlineDraft)
  const factionMatrixRepair = repairStrategyContaminationValue(strategy, input.factionMatrix)
  const profilesRepair = repairStrategyContaminationValue(strategy, input.characterProfilesV2)
  const normalizedDraftsRepair = repairStrategyContaminationValue(strategy, input.normalizedDrafts)
  const fullProfileDraftsRepair = repairStrategyContaminationValue(
    strategy,
    input.fullProfileDrafts
  )
  const visibleDraftsRepair = repairStrategyContaminationValue(
    strategy,
    input.visibleCharacterDrafts
  )
  const entityStoreRepair = repairStrategyContaminationValue(strategy, input.entityStore)

  const outlineWarning = buildStrategyRepairWarning({
    stage: 'rough_outline',
    label: '剧本骨架',
    strategyLabel: strategy.label,
    replacements: outlineRepair.replacements
  })
  const characterWarning = buildStrategyRepairWarning({
    stage: 'character_ledger',
    label: '人物底账',
    strategyLabel: strategy.label,
    replacements: [
      ...factionMatrixRepair.replacements,
      ...profilesRepair.replacements,
      ...normalizedDraftsRepair.replacements,
      ...fullProfileDraftsRepair.replacements,
      ...visibleDraftsRepair.replacements,
      ...entityStoreRepair.replacements
    ]
  })

  return {
    outlineDraft: outlineRepair.value,
    factionMatrix: factionMatrixRepair.value,
    characterProfilesV2: profilesRepair.value,
    normalizedDrafts: normalizedDraftsRepair.value,
    fullProfileDrafts: fullProfileDraftsRepair.value,
    visibleCharacterDrafts: visibleDraftsRepair.value,
    entityStore: entityStoreRepair.value,
    warnings: [characterWarning, outlineWarning].filter(
      (warning): warning is GenerationWarningDto => Boolean(warning)
    )
  }
}

function buildStrategyContaminationWarnings(input: {
  storyIntent: StoryIntentPackageDto
  outlineDraft: OutlineDraftDto
  characterDrafts: CharacterDraftDto[]
  characterProfilesV2?: CharacterProfileV2Dto[]
  entityStore: ProjectEntityStoreDto
}): GenerationWarningDto[] {
  const strategy = resolveGenerationStrategy({
    marketProfile: input.storyIntent.marketProfile,
    genre: input.outlineDraft.genre || input.storyIntent.genre,
    storyIntentGenre: input.storyIntent.genre,
    title: input.outlineDraft.title || input.storyIntent.titleHint
  }).strategy

  const blocks: Array<{
    stage: GenerationWarningDto['stage']
    label: string
    text: string
  }> = [
    {
      stage: 'character_ledger',
      label: '人物底账',
      text: JSON.stringify({
        characterDrafts: input.characterDrafts,
        characterProfilesV2: input.characterProfilesV2 || [],
        entityStore: input.entityStore
      })
    },
    {
      stage: 'rough_outline',
      label: '剧本骨架',
      text: JSON.stringify({
        title: input.outlineDraft.title,
        genre: input.outlineDraft.genre,
        theme: input.outlineDraft.theme,
        summary: input.outlineDraft.summary,
        mainConflict: input.outlineDraft.mainConflict,
        episodes: input.outlineDraft.summaryEpisodes,
        facts: input.outlineDraft.facts
      })
    }
  ]

  const warnings: GenerationWarningDto[] = []
  const seen = new Set<string>()
  for (const block of blocks) {
    const issues = detectStrategyContamination(strategy, block.text)
    for (const issue of issues) {
      const key = `${block.stage}:${issue.term}`
      if (seen.has(key)) continue
      seen.add(key)
      warnings.push({
        stage: block.stage,
        code: 'generation_strategy_contamination',
        message: `${block.label}疑似串题材：${issue.message}`
      })
    }
  }

  return warnings
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

function isConcreteCharacterName(value: string): boolean {
  const text = value.trim()
  if (!text || isGenericRoleAnchor(text)) return false
  if (text.length > 8) return false
  if (/[《》【】，,。；、\s]/u.test(text)) return false
  if (/(主角|男主|女主|反派|对手|敌人|大小姐|少年|废柴|废材|魔尊|血脉|身负|隐藏)/u.test(text)) {
    return false
  }
  return /^[\p{Script=Han}A-Za-z][\p{Script=Han}A-Za-z0-9'.-]*$/u.test(text)
}

function replaceLiteralName(value: string | undefined, from: string, to: string): string {
  if (!value || !from || from === to) return value || ''
  return value.split(from).join(to)
}

function replaceNameInAnyValue<T>(value: T, from: string, to: string): T {
  if (typeof value === 'string') {
    return replaceLiteralName(value, from, to) as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceNameInAnyValue(item, from, to)) as T
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      replaceNameInAnyValue(item, from, to)
    ])
    return Object.fromEntries(entries) as T
  }

  return value
}

function replaceNameInCharacterDraft(
  character: CharacterDraftDto,
  from: string,
  to: string
): CharacterDraftDto {
  const next: CharacterDraftDto = { ...character }
  for (const field of CHARACTER_DRAFT_TEXT_FIELDS) {
    const value = next[field]
    if (typeof value === 'string') {
      ;(next as unknown as Record<string, unknown>)[field] = replaceLiteralName(value, from, to)
    }
  }
  return next
}

function sanitizeGeneratedTextValue(value: string, protagonistName: string): string {
  const protagonist = protagonistName.trim()
  let text = value
    .replace(/([\p{Script=Han}]{2,8}(?:掌门|宗主|盟主|长老|执事|护法|堂主))\1/gu, '$1')
    .replace(/([\p{Script=Han}]{2,8})\1（/gu, '$1（')
    .replace(/([\p{Script=Han}]{2,8})\1/gu, '$1')
    .replace(/青云宗掌门掌门/gu, '青云宗掌门')

  if (protagonist) {
    const escaped = protagonist.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    text = text
      .replace(new RegExp(`父亲${escaped}`, 'gu'), '父亲沈观澜')
      .replace(new RegExp(`父亲\\s+${escaped}`, 'gu'), '父亲沈观澜')
      .replace(new RegExp(`左护法${escaped}`, 'gu'), '左护法影枭')
      .replace(new RegExp(`${escaped}暗中提供魔渊`, 'gu'), '魔渊旧部暗中提供')
      .replace(new RegExp(`${escaped}在${escaped}指点下`, 'gu'), `${protagonist}在沈观澜暗中指点下`)
      .replace(new RegExp(`在${escaped}指点下`, 'gu'), '在沈观澜暗中指点下')
      .replace(new RegExp(`逼${escaped}让出掌门位`, 'gu'), '逼沈观澜让出掌门位')
      .replace(new RegExp(`${escaped}一直用掌门权`, 'gu'), '沈观澜一直用掌门权')
      .replace(new RegExp(`收集${escaped}黑料`, 'gu'), '收集沈观澜黑料')
      .replace(new RegExp(`但被${escaped}压下`, 'gu'), '但被沈观澜压下')
      .replace(new RegExp(`${escaped}再次包庇`, 'gu'), '沈观澜再次包庇')
      .replace(new RegExp(`${escaped}${escaped}`, 'gu'), protagonist)
  }

  return text.replace(/\s+/g, ' ').trim()
}

function sanitizeGeneratedTextInAnyValue<T>(value: T, protagonistName: string): T {
  if (typeof value === 'string') {
    return sanitizeGeneratedTextValue(value, protagonistName) as T
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeGeneratedTextInAnyValue(item, protagonistName)) as T
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      sanitizeGeneratedTextInAnyValue(item, protagonistName)
    ])
    return Object.fromEntries(entries) as T
  }

  return value
}

function sanitizeCharacterDraftText(
  character: CharacterDraftDto,
  protagonistName: string
): CharacterDraftDto {
  const next: CharacterDraftDto = { ...character }
  for (const field of CHARACTER_DRAFT_TEXT_FIELDS) {
    const value = next[field]
    if (typeof value === 'string') {
      ;(next as unknown as Record<string, unknown>)[field] = sanitizeGeneratedTextValue(
        value,
        protagonistName
      )
    }
  }
  return next
}

function scoreLikelyAlternateProtagonist(character: CharacterDraftDto): number {
  const identityText = [character.name, character.identity, character.publicMask].join('\n').trim()
  const ownText = [
    character.name,
    character.biography,
    character.identity,
    character.publicMask,
    character.goal,
    character.arc,
    character.values,
    character.plotFunction
  ]
    .join('\n')
    .trim()

  if (/(女主|掌门之女|盟主|长老|特使|执事|亲信|女儿|大小姐)/u.test(identityText)) {
    return 0
  }

  let score = 0
  if (character.roleLayer === 'core') score += 1
  if (character.depthLevel === 'core') score += 1
  if (/(男主|主角)/u.test(ownText)) score += 3
  if (/(废柴|废材|废物|外门|杂役|底层弟子|人尽可欺|备受欺凌)/u.test(ownText)) {
    score += 2
  }
  if (/(魔尊血脉|血脉封印|体内封|吊坠|母亲遗物|身世|父母)/u.test(ownText)) {
    score += 2
  }

  return score
}

function findAlternateProtagonistAlias(input: {
  characters: CharacterDraftDto[]
  protagonistName: string
}): string | null {
  if (!isConcreteCharacterName(input.protagonistName)) return null

  const normalizedProtagonist = normalizeCharacterName(input.protagonistName)
  const candidates = input.characters
    .filter((character) => normalizeCharacterName(character.name) !== normalizedProtagonist)
    .map((character, index) => ({
      character,
      index,
      score: scoreLikelyAlternateProtagonist(character)
    }))
    .filter((item) => item.score >= 4)
    .sort((left, right) => right.score - left.score || left.index - right.index)

  return candidates[0]?.character.name.trim() || null
}

function lockConcreteProtagonistName(input: {
  result: CharacterProfilesGenerationResult
  protagonistName: string
}): { result: CharacterProfilesGenerationResult; alias: string | null } {
  const protagonistName = input.protagonistName.trim()
  const alias = findAlternateProtagonistAlias({
    characters: input.result.characters || [],
    protagonistName
  })

  if (!alias || alias === protagonistName) {
    return { result: input.result, alias: null }
  }

  return {
    alias,
    result: {
      characters: (input.result.characters || []).map((character) =>
        replaceNameInCharacterDraft(character, alias, protagonistName)
      ),
      characterProfilesV2: input.result.characterProfilesV2
        ? replaceNameInAnyValue(input.result.characterProfilesV2, alias, protagonistName)
        : input.result.characterProfilesV2,
      factionMatrix: input.result.factionMatrix
        ? replaceNameInAnyValue(input.result.factionMatrix, alias, protagonistName)
        : input.result.factionMatrix
    }
  }
}

function resolveFullProfileLimit(totalEpisodes: number): number {
  if (totalEpisodes <= 24) return SHORT_SERIES_FULL_PROFILE_LIMIT
  if (totalEpisodes <= 40) return MID_SERIES_FULL_PROFILE_LIMIT
  return LONG_SERIES_FULL_PROFILE_LIMIT
}

function characterFullProfilePriority(input: {
  character: CharacterDraftDto
  protagonist?: string
  antagonist?: string
  index: number
}): number {
  const characterName = normalizeCharacterName(input.character.name)
  if (input.protagonist && characterName === normalizeCharacterName(input.protagonist)) return -1000
  if (input.antagonist && characterName === normalizeCharacterName(input.antagonist)) return -900

  const roleWeight =
    input.character.roleLayer === 'core' ? 0 : input.character.roleLayer === 'active' ? 100 : 200
  const depthWeight =
    input.character.depthLevel === 'core' ? 0 : input.character.depthLevel === 'mid' ? 20 : 60
  const functionPenalty = /(特使|执事|弟子|门人|护卫|跑腿|传令)/u.test(input.character.name)
    ? 50
    : 0

  return roleWeight + depthWeight + functionPenalty + input.index
}

function limitFullProfileDrafts(input: {
  characterDrafts: CharacterDraftDto[]
  totalEpisodes: number
  protagonist?: string
  antagonist?: string
}): CharacterDraftDto[] {
  const limit = resolveFullProfileLimit(input.totalEpisodes)
  if (input.characterDrafts.length <= limit) return input.characterDrafts

  return [...input.characterDrafts]
    .map((character, index) => ({
      character,
      priority: characterFullProfilePriority({
        character,
        protagonist: input.protagonist,
        antagonist: input.antagonist,
        index
      })
    }))
    .sort((left, right) => left.priority - right.priority)
    .slice(0, limit)
    .sort(
      (left, right) =>
        input.characterDrafts.indexOf(left.character) -
        input.characterDrafts.indexOf(right.character)
    )
    .map((item) => item.character)
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

function containsProtagonistOriginMarkers(value: string): boolean {
  return /(?:男主|主角|废柴|废材|废物|外门|杂役|底层弟子|人尽可欺|备受欺凌|魔尊血脉|血脉封印|体内封|吊坠|母亲遗物|身世|父母旧仇|查清真相)/u.test(
    value
  )
}

function containsAuthorityRoleMarkers(value: string): boolean {
  return /(?:掌门|宗主|宗门老大|盟主|长老|堂主|执法长老|暗部首领|首领|使者|执事|父亲|爹|父女|权力地位|维持宗门现状|牺牲[^，。；]*主角|牺牲[^，。；]*林)/u.test(
    value
  )
}

function isLikelyProtagonistRoleCollision(input: {
  character: CharacterDraftDto
  protagonistName: string
}): boolean {
  const protagonistName = input.protagonistName.trim()
  if (!protagonistName) return false
  if (normalizeCharacterName(input.character.name) !== normalizeCharacterName(protagonistName)) {
    return false
  }

  const text = CHARACTER_DRAFT_TEXT_FIELDS.map((field) => input.character[field] || '')
    .join('\n')
    .trim()
  if (!text) return false

  const hasAuthorityRole = containsAuthorityRoleMarkers(text)
  if (!hasAuthorityRole) return false

  const ownRoleText = [
    input.character.identity,
    input.character.publicMask,
    input.character.goal,
    input.character.plotFunction,
    input.character.biography
  ]
    .filter(Boolean)
    .join('\n')
  const hasOriginMarker = containsProtagonistOriginMarkers(ownRoleText)
  const isActingAgainstSelf = new RegExp(
    `(?:阻止|牺牲|打压|压制|监视|暗算|利用|夺取|扼杀).{0,12}${protagonistName}|${protagonistName}.{0,12}(?:觉醒后|查清真相|揭露|反抗)`,
    'u'
  ).test(text)

  return !hasOriginMarker || isActingAgainstSelf
}

function buildGuardianLeaderDraft(input: {
  source: CharacterDraftDto
  protagonistName: string
  storyIntent: StoryIntentPackageDto
}): CharacterDraftDto {
  const guardianName = '沈观澜'
  const sourceIdentity = input.source.identity || ''
  const sectName =
    sourceIdentity.match(/([\p{Script=Han}A-Za-z]{1,6}宗)(?:掌门|宗主|长老|弟子)?/u)?.[1] ||
    sourceIdentity.match(/([\p{Script=Han}A-Za-z]{1,6}(?:门|派))(?:掌门|宗主|长老|弟子)?/u)?.[1] ||
    input.storyIntent.worldAnchors?.find((item) => /宗|门|派/u.test(item)) ||
    '青云宗'

  return {
    ...input.source,
    name: guardianName,
    biography: `${guardianName}是${sectName}掌门，知道${input.protagonistName}身负魔尊血脉，也知道这条血脉一旦被仙盟夺走会引发世界大乱。他前期用冷酷和废柴假象遮住真相，既保护${input.protagonistName}，也承受被误解的代价。`,
    publicMask: `人前以严苛掌门身份压着${input.protagonistName}，把保护伪装成磨砺和疏远。`,
    hiddenPressure: `当年旧案、${input.protagonistName}父母之死和魔尊血脉封印都压在他身上，他不能过早说破。`,
    fear: `最怕${input.protagonistName}在真相未明前被仙盟夺走血脉，也怕自己被他当成真正仇人。`,
    protectTarget: `${input.protagonistName}的性命、${sectName}存续和魔尊血脉不落入陆昭仪一方。`,
    conflictTrigger: `只要仙盟逼近血脉封印，或${input.protagonistName}被逼到必死之局，${guardianName}就会撕开冷酷伪装亲自出手。`,
    advantage: '掌握宗门秘档、封印旧法和掌门资源，能在关键时刻压住局面。',
    weakness: `太习惯独自扛事，越隐瞒越容易让${input.protagonistName}误会他才是仇人。`,
    goal: `拖到${input.protagonistName}足够强，再把血脉真相、父母旧案和仙盟阴谋交给他。`,
    arc: `起点：${guardianName}以冷酷掌门身份制造废柴假象；触发：${input.protagonistName}吊坠破碎后血脉初醒；摇摆：继续隐瞒会伤透${input.protagonistName}，提前说破又会引来仙盟围杀；代价选择：押上掌门名声和性命保护真相；终局变化：从被误解的压迫者变成以死赎罪的守护者。`,
    appearance: `${guardianName}常穿素色掌门道袍，神情克制，压场时像一把收在鞘里的冷剑。`,
    personality: '隐忍、克制、背负感重，习惯把真心藏在严苛命令后面。',
    identity: `${sectName}掌门，主角血脉秘密的守护者。`,
    values: '守世界大局，也守旧人托付；宁可被误解，也不能让血脉落进贪婪者手里。',
    plotFunction: `${guardianName}负责制造前期误会、压住血脉秘密，并在中后段引爆真相揭露和赎罪牺牲。`,
    roleLayer: 'core',
    depthLevel: 'core'
  }
}

function enforceProtagonistRoleIntegrity(input: {
  characters: CharacterDraftDto[]
  protagonistName: string
  storyIntent: StoryIntentPackageDto
  outlineDraft: OutlineDraftDto
  generationBriefText: string
}): { characters: CharacterDraftDto[]; repaired: boolean } {
  const protagonistName = input.protagonistName.trim()
  if (!protagonistName || isGenericRoleAnchor(protagonistName)) {
    return { characters: input.characters, repaired: false }
  }

  const suspicious = input.characters.filter((character) =>
    isLikelyProtagonistRoleCollision({ character, protagonistName })
  )
  if (suspicious.length === 0) {
    return { characters: input.characters, repaired: false }
  }

  const remaining = input.characters.filter(
    (character) =>
      !isLikelyProtagonistRoleCollision({
        character,
        protagonistName
      })
  )
  const mandatoryLead = buildMandatoryProtagonistDraft({
    name: protagonistName,
    storyIntent: input.storyIntent,
    outlineDraft: input.outlineDraft,
    generationBriefText: input.generationBriefText
  })
  const guardian = buildGuardianLeaderDraft({
    source: suspicious[0]!,
    protagonistName,
    storyIntent: input.storyIntent
  })
  const names = new Set(remaining.map((character) => normalizeCharacterName(character.name)))
  const repairedCharacters = [
    mandatoryLead,
    ...(names.has(normalizeCharacterName(guardian.name)) ? [] : [guardian]),
    ...remaining.filter(
      (character) =>
        normalizeCharacterName(character.name) !== normalizeCharacterName(protagonistName)
    )
  ]

  return { characters: repairedCharacters, repaired: true }
}

function resolveProtagonistHomeFaction(input: {
  factionMatrix?: FactionMatrixDto
  protagonistName: string
}): { factionId: string; factionName: string; branchId?: string } | null {
  const factionMatrix = input.factionMatrix
  if (!factionMatrix || !input.protagonistName.trim()) return null

  const candidates = factionMatrix.factions
    .map((faction, index) => {
      const text = [faction.name, faction.positioning, faction.coreDemand, faction.coreValues]
        .join('\n')
        .trim()
      let score = 0
      if (/主角所在|主角归属|所在宗门|归属宗门|保护.*主角|压制.*主角|青云宗/u.test(text)) {
        score += 10
      }
      if (/(宗|门|派)/u.test(faction.name)) score += 3
      if (/魔渊|魔道|旧部|残余|复辟/u.test(text)) score -= 8
      if (/仙盟|盟|联盟|反派|夺取|觊觎/u.test(text)) score -= 6
      return { faction, index, score }
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.index - right.index)

  const homeFaction = candidates[0]?.faction
  if (!homeFaction) return null
  const branch =
    homeFaction.branches.find((item) => /守护|掌门|主角|外门|执法|宗门/u.test(item.name)) ||
    homeFaction.branches[0]

  return {
    factionId: homeFaction.id,
    factionName: homeFaction.name,
    branchId: branch?.id
  }
}

function buildProtagonistProfileFromDraft(input: {
  draft: CharacterDraftDto
  factionId: string
  factionName: string
  branchId?: string
}): CharacterProfileV2Dto {
  const name = input.draft.name.trim()
  const homeIdentity = `${input.factionName}底层弟子，体内封着魔尊血脉。`
  return {
    id: `profile_${name}`,
    name,
    depthLevel: 'core',
    factionId: input.factionId,
    branchId: input.branchId,
    roleInFaction: 'variable',
    appearance: input.draft.appearance || `${name}前期常穿旧道袍，身上带着母亲吊坠碎片。`,
    personality: input.draft.personality || '能忍、警惕、重情，越被逼到绝境越会反击。',
    identity:
      input.draft.identity && /宗|门|派|青云/u.test(input.draft.identity)
        ? input.draft.identity
        : homeIdentity,
    values:
      input.draft.values || '先查清身世真相，再决定正邪归属；真正守过他的人比所谓名分更重要。',
    plotFunction:
      input.draft.plotFunction ||
      `${name}负责从受辱、觉醒、误信到识破伪善，并把血脉争夺推成复仇与守护。`,
    hiddenPressure: input.draft.hiddenPressure,
    fear: input.draft.fear,
    protectTarget: input.draft.protectTarget,
    conflictTrigger: input.draft.conflictTrigger,
    advantage: input.draft.advantage,
    weakness: input.draft.weakness,
    goal: input.draft.goal,
    arc: input.draft.arc,
    publicMask: input.draft.publicMask,
    biography: input.draft.biography
  }
}

function enforceProtagonistHomeFactionProfile(input: {
  result: CharacterProfilesGenerationResult
  protagonistName: string
}): CharacterProfilesGenerationResult {
  const protagonistName = input.protagonistName.trim()
  const home = resolveProtagonistHomeFaction({
    factionMatrix: input.result.factionMatrix,
    protagonistName
  })
  if (!home || !protagonistName) return input.result

  const profiles = input.result.characterProfilesV2 || []
  const existingProfile = profiles.find(
    (profile) => normalizeCharacterName(profile.name) === normalizeCharacterName(protagonistName)
  )
  const protagonistDraft = input.result.characters.find(
    (character) =>
      normalizeCharacterName(character.name) === normalizeCharacterName(protagonistName)
  )
  if (!existingProfile && !protagonistDraft) return input.result

  const nextProfile = existingProfile
    ? {
        ...existingProfile,
        factionId: home.factionId,
        branchId: home.branchId || existingProfile.branchId,
        identity:
          existingProfile.identity && existingProfile.identity.includes(home.factionName)
            ? existingProfile.identity
            : `${home.factionName}底层弟子，体内封着魔尊血脉。`,
        roleInFaction:
          existingProfile.roleInFaction === 'leader' ? 'variable' : existingProfile.roleInFaction
      }
    : buildProtagonistProfileFromDraft({
        draft: protagonistDraft!,
        factionId: home.factionId,
        factionName: home.factionName,
        branchId: home.branchId
      })

  return {
    ...input.result,
    characterProfilesV2: [
      nextProfile,
      ...profiles.filter(
        (profile) =>
          normalizeCharacterName(profile.name) !== normalizeCharacterName(protagonistName)
      )
    ]
  }
}

function buildMandatoryProtagonistV2Fields(input: {
  name: string
  strategy: GenerationStrategy
  coreItem: string
  mainConflict: string
}): Pick<CharacterDraftDto, 'appearance' | 'personality' | 'identity' | 'values' | 'plotFunction'> {
  if (input.strategy.id === 'male_xianxia') {
    return {
      appearance: `${input.name}前期常穿旧道袍，身上带着${input.coreItem}留下的旧痕，眼神在隐忍和爆发之间压着暗火。`,
      personality: '能忍、警惕、重情，越被逼到绝境越会反过来设局。',
      identity: `被宗门长期压制的底层弟子，体内封着会引来仙盟争夺的危险血脉。`,
      values: '先查清身世真相，再决定正邪归属；真正守过他的人，比所谓正道名分更重要。',
      plotFunction: `${input.name}是主线核心发动机，负责从受辱、觉醒、误信到识破伪善，并把血脉争夺推成复仇与守护。`
    }
  }

  if (input.strategy.id === 'urban_legal') {
    return {
      appearance: `${input.name}外表克制利落，随身带着卷宗、录音或关键证据，所有情绪都压在职业边界里。`,
      personality: '冷静、重证据、能抗压，但在当事人隐瞒真相时会被迫重新判断。',
      identity: `被案件推到风口的主角，围绕${input.coreItem}补齐证据链。`,
      values: '程序、证据和职业底线都不能丢，但真相不能被程序表象埋掉。',
      plotFunction: `${input.name}负责把案件压力、证据攻防和庭审反转串成主线，并在${input.mainConflict || '核心案件'}里逼出真相。`
    }
  }

  const roleTitle = input.strategy.worldLexicon.roleTitles[0] || '主角'
  const conflictObject = input.strategy.worldLexicon.conflictObjects[0] || input.coreItem
  const payoffAction = input.strategy.worldLexicon.payoffActions[0] || '完成反击'
  return {
    appearance: `${input.name}的外形和随身物件都围绕${conflictObject}建立辨识度，第一眼能看出他正被主线压力推着走。`,
    personality: '谨慎、能忍、会在关键关系被碰到时主动反击。',
    identity: `${input.strategy.label}里的${roleTitle}型主角，围绕${conflictObject}被迫入局。`,
    values: '守住自己的选择权、关键关系和能翻盘的证据。',
    plotFunction: `${input.name}负责承接${input.mainConflict || conflictObject}，从被动承压推进到${payoffAction}。`
  }
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
  const coreItem = /吊坠|遗物|玉佩/u.test(sourceText) ? '母亲吊坠碎片' : '核心线索'
  const strategy = resolveGenerationStrategy({
    marketProfile: input.storyIntent.marketProfile,
    genre: input.storyIntent.genre,
    storyIntentGenre: sourceText,
    title: input.storyIntent.titleHint
  }).strategy
  const fallback = buildStrategyProtagonistFallback(strategy, {
    name: input.name,
    coreItem,
    mainConflict: input.outlineDraft.mainConflict || input.storyIntent.coreConflict || ''
  })
  const v2Fallback = buildMandatoryProtagonistV2Fields({
    name: input.name,
    strategy,
    coreItem,
    mainConflict: input.outlineDraft.mainConflict || input.storyIntent.coreConflict || ''
  })
  return {
    name: input.name,
    ...fallback,
    ...v2Fallback,
    roleLayer: 'core'
  }
}

function buildFallbackOutlinePayloadFromStoryIntent(input: {
  storyIntent: StoryIntentPackageDto
}): NonNullable<
  NonNullable<
    Awaited<ReturnType<NonNullable<ConfirmedSevenQuestionsGenerationDeps['generateOutlineBundle']>>>
  >['outline']
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
  const existingFactionMatrix = resolveReusableFactionMatrix(input.storyIntent)
  let factionMatrix: FactionMatrixDto
  if (existingFactionMatrix) {
    factionMatrix = existingFactionMatrix
  } else {
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
}): Promise<{
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
}> {
  const { generateOutlineBundle } = await import('./generate-outline-and-characters-support.js')
  const result = await generateOutlineBundle(input)
  if (!result) {
    throw new Error('generate_outline_bundle_failed:null_result')
  }
  return result
}

function createDiagnostic(input: {
  message: string
  level?: GenerationDiagnosticDto['level']
}): GenerationDiagnosticDto {
  const code = input.message.split(/\s+/u)[0]?.replace(/[^a-zA-Z0-9_:.-]/gu, '') || 'diagnostic'
  return {
    stage: input.message.startsWith('character_') ? 'character_ledger' : 'rough_outline',
    level: input.level || 'info',
    code,
    message: input.message,
    createdAt: new Date().toISOString()
  }
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
export async function generateOutlineCharacterBundleFromConfirmedSevenQuestions(
  input: {
    projectId: string
    storyIntent: StoryIntentPackageDto
    outlineDraft: OutlineDraftDto | null
    runtimeConfig: RuntimeProviderConfig
    mode?: OutlineCharacterGenerationMode
    signal?: AbortSignal
  },
  deps: ConfirmedSevenQuestionsGenerationDeps = {}
): Promise<OutlineCharacterGenerationBundleDto> {
  const generationBriefText = input.storyIntent.generationBriefText?.trim()
  const diagnostics: GenerationDiagnosticDto[] = []
  const externalAppendDiagnosticLog =
    deps.appendDiagnosticLog ?? appendConfirmedSevenQuestionsDiagnosticLog
  const appendDiagnosticLog = async (message: string): Promise<void> => {
    diagnostics.push(createDiagnostic({ message }))
    await externalAppendDiagnosticLog(message)
  }
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
  const mode = input.mode ?? 'bundle'

  // 先生成人物小传，再让粗纲消费人物关系和势力底账，避免七问/骨架两套账本漂移。
  let characterProfilesResult = await generateCharacterProfiles({
    storyIntent: baseStoryIntent,
    totalEpisodes: targetEpisodeCount,
    runtimeConfig: input.runtimeConfig,
    signal: input.signal
  })

  const initialProtagonistLock = lockConcreteProtagonistName({
    result: characterProfilesResult,
    protagonistName: baseStoryIntent.protagonist || ''
  })
  characterProfilesResult = initialProtagonistLock.result
  if (initialProtagonistLock.alias) {
    await appendDiagnosticLog(
      `character_bundle_protagonist_alias_locked from=${initialProtagonistLock.alias} to=${baseStoryIntent.protagonist}`
    )
  }

  const storyIntent = normalizeOutlineStoryIntent(baseStoryIntent)
  storyIntent.generationBriefText = storyIntent.generationBriefText || generationBriefText
  let outlineGenerationError: string | undefined
  let validatedOutline: NonNullable<
    NonNullable<
      Awaited<
        ReturnType<NonNullable<ConfirmedSevenQuestionsGenerationDeps['generateOutlineBundle']>>
      >
    >['outline']
  >

  if (mode === 'characters_only') {
    await appendDiagnosticLog('character_bundle_finish_without_rough_outline')
    validatedOutline = buildFallbackOutlinePayloadFromStoryIntent({
      storyIntent
    })
  } else {
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
  }

  const outlineDraft: OutlineDraftDto = {
    title: validatedOutline.title?.trim() || storyIntent.titleHint || '',
    genre: validatedOutline.genre?.trim() || storyIntent.genre || '',
    theme:
      validatedOutline.theme?.trim() ||
      storyIntent.themeAnchors?.[0] ||
      storyIntent.emotionalPayoff ||
      storyIntent.coreConflict ||
      '',
    protagonist: validatedOutline.protagonist?.trim() || storyIntent.protagonist || '',
    mainConflict: validatedOutline.mainConflict?.trim() || storyIntent.coreConflict || '',
    summary:
      mode === 'characters_only'
        ? input.outlineDraft?.summary?.trim() ||
          storyIntent.storySynopsis?.logline?.trim() ||
          storyIntent.creativeSummary?.trim() ||
          generationBriefText
        : validatedOutline.summary?.trim() || '',
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
    : mode === 'characters_only'
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

  const outlineProtagonistLock = lockConcreteProtagonistName({
    result: characterProfilesResult,
    protagonistName: outlineDraft.protagonist || storyIntent.protagonist || ''
  })
  characterProfilesResult = outlineProtagonistLock.result
  if (outlineProtagonistLock.alias) {
    await appendDiagnosticLog(
      `character_bundle_protagonist_alias_locked from=${outlineProtagonistLock.alias} to=${outlineDraft.protagonist || storyIntent.protagonist}`
    )
  }

  // 旧项目如果已经锁过七问，把它折叠进 outlineBlocks；新流程只生成技术规划块。
  if (mode === 'characters_only' || outlineGenerationError) {
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

  const protagonistIntegrity = enforceProtagonistRoleIntegrity({
    characters: filteredCharacters,
    protagonistName: anchors.protagonist || '',
    storyIntent,
    outlineDraft,
    generationBriefText
  })
  filteredCharacters = protagonistIntegrity.characters
  if (protagonistIntegrity.repaired) {
    await appendDiagnosticLog(
      `character_bundle_repaired_protagonist_role_collision name=${anchors.protagonist}`
    )
  }

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

  filteredCharacters = filteredCharacters.map((character) =>
    sanitizeCharacterDraftText(character, anchors.protagonist || storyIntent.protagonist || '')
  )
  characterProfilesResult = enforceProtagonistHomeFactionProfile({
    result: characterProfilesResult,
    protagonistName: anchors.protagonist || storyIntent.protagonist || ''
  })
  if (anchors.protagonist || storyIntent.protagonist) {
    characterProfilesResult = {
      ...characterProfilesResult,
      characters: characterProfilesResult.characters.map((character) =>
        sanitizeCharacterDraftText(character, anchors.protagonist || storyIntent.protagonist || '')
      ),
      characterProfilesV2: characterProfilesResult.characterProfilesV2
        ? sanitizeGeneratedTextInAnyValue(
            characterProfilesResult.characterProfilesV2,
            anchors.protagonist || storyIntent.protagonist || ''
          )
        : characterProfilesResult.characterProfilesV2,
      factionMatrix: characterProfilesResult.factionMatrix
        ? sanitizeGeneratedTextInAnyValue(
            characterProfilesResult.factionMatrix,
            anchors.protagonist || storyIntent.protagonist || ''
          )
        : characterProfilesResult.factionMatrix
    }
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
  const fullProfileDrafts = limitFullProfileDrafts({
    characterDrafts: attachedCharacterDrafts,
    totalEpisodes: targetEpisodeCount,
    protagonist: anchors.protagonist,
    antagonist: anchors.antagonist
  })

  if (fullProfileDrafts.length !== attachedCharacterDrafts.length) {
    await appendDiagnosticLog(
      `character_bundle_short_series_full_profiles_limited before=${attachedCharacterDrafts.length} after=${fullProfileDrafts.length} totalEpisodes=${targetEpisodeCount}`
    )
  }

  const characterDrafts = clampCharacterDraftsToVisibleRoster({
    characterDrafts: fullProfileDrafts,
    entityStore
  })

  if (characterDrafts.length !== fullProfileDrafts.length) {
    await appendDiagnosticLog(
      `character_bundle_trimmed_to_visible_roster before=${fullProfileDrafts.length} after=${characterDrafts.length} entityCharacters=${entityStore.characters.length}`
    )
  }

  await appendDiagnosticLog(
    `rough_outline_finish outlineBlocks=${outlineDraft.outlineBlocks?.length || 0} characters=${characterDrafts.length} entityCharacters=${entityStore.characters.length} factions=${entityStore.factions.length}`
  )

  const strategyRepairedBundle = repairOutlineCharacterBundleStrategyContamination({
    storyIntent,
    outlineDraft,
    factionMatrix: characterProfilesResult.factionMatrix,
    characterProfilesV2: characterProfilesResult.characterProfilesV2,
    normalizedDrafts: attachedCharacterDrafts,
    fullProfileDrafts,
    visibleCharacterDrafts: characterDrafts,
    entityStore
  })

  const storyIntentWithFoundation = attachStoryFoundationToIntent({
    storyIntent,
    entityStore: strategyRepairedBundle.entityStore,
    characterDrafts: strategyRepairedBundle.visibleCharacterDrafts,
    factionMatrix: strategyRepairedBundle.factionMatrix,
    totalEpisodes: targetEpisodeCount
  })

  const warnings: GenerationWarningDto[] = [
    ...(outlineGenerationError
      ? [
          {
            stage: 'rough_outline' as const,
            code: 'rough_outline_generation_failed',
            message: outlineGenerationError
          }
        ]
      : []),
    ...strategyRepairedBundle.warnings,
    ...buildStrategyContaminationWarnings({
      storyIntent,
      outlineDraft: strategyRepairedBundle.outlineDraft,
      characterDrafts: strategyRepairedBundle.visibleCharacterDrafts,
      characterProfilesV2: strategyRepairedBundle.characterProfilesV2,
      entityStore: strategyRepairedBundle.entityStore
    })
  ]

  return {
    storyIntent: storyIntentWithFoundation,
    outlineDraft: strategyRepairedBundle.outlineDraft,
    sevenQuestions: confirmedSevenQuestions ?? null,
    characterLedger: {
      factionMatrix: strategyRepairedBundle.factionMatrix,
      characterProfilesV2: strategyRepairedBundle.characterProfilesV2 || [],
      normalizedDrafts: strategyRepairedBundle.normalizedDrafts,
      fullProfileDrafts: strategyRepairedBundle.fullProfileDrafts,
      visibleCharacterDrafts: strategyRepairedBundle.visibleCharacterDrafts,
      entityStore: strategyRepairedBundle.entityStore
    },
    diagnostics,
    warnings,
    outlineGenerationError
  }
}

export async function generateOutlineAndCharactersFromConfirmedSevenQuestions(
  input: {
    projectId: string
    storyIntent: StoryIntentPackageDto
    outlineDraft: OutlineDraftDto | null
    runtimeConfig: RuntimeProviderConfig
    mode?: OutlineCharacterGenerationMode
    signal?: AbortSignal
  },
  deps: ConfirmedSevenQuestionsGenerationDeps = {}
): Promise<OutlineAndCharactersGenerationResult> {
  const bundle = await generateOutlineCharacterBundleFromConfirmedSevenQuestions(input, deps)
  return {
    storyIntent: bundle.storyIntent,
    outlineDraft: bundle.outlineDraft,
    characterDrafts: bundle.characterLedger.visibleCharacterDrafts,
    entityStore: bundle.characterLedger.entityStore,
    sevenQuestions: bundle.sevenQuestions,
    outlineGenerationError: bundle.outlineGenerationError
  }
}
