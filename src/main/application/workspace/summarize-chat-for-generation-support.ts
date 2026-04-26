import type { StoryIntentPackageDto, StorySynopsisDto } from '../../../shared/contracts/intake.ts'
import {
  extractLatestAuthoritativeEpisodeCountFromText,
  extractLatestEpisodeCountFromText
} from '../../../shared/domain/workflow/episode-count.ts'
import { normalizeChatTranscriptForGeneration } from './normalize-chat-transcript.ts'
import {
  normalizeGenerationBriefPackage,
  renderGenerationBriefTemplate
} from './generation-brief-template.ts'
import {
  extractCharacterLayers,
  extractRoleSummary,
  normalizeNameList,
  normalizeStoryIntent,
  toText,
  toTextArray,
  uniqueCharacterCards,
  uniqueCharacterLayers,
  uniqueList,
  tryParseObject
} from './summarize-chat-for-generation-shared.ts'
import {
  collectStructuredSections,
  extractStructuredProjectHeader,
  extractSectionMap,
  extractStructuredBriefText
} from './summarize-chat-for-generation-structured-parser.ts'
import {
  inferChainFromStructuredSections,
  inferCharacterLayersFromSections,
  pickCoreDislocation,
  pickEmotionalPayoff,
  pickSellingPremise,
  pickThemeAnchor,
  pickWorldPressure
} from './summarize-chat-for-generation-structured-inference.ts'

type SummaryDraft = {
  projectTitle: string
  episodeCount: number
  genreAndStyle: string
  tone: string
  audience: string
  sellingPremise: string
  coreDislocation: string
  emotionalPayoff: string
  worldAndBackground: string
  protagonist: string
  antagonist: string
  coreConflict: string
  endingDirection: string
  keyCharacters: string[]
  chainSynopsis: string
  characterCards: Array<{ name: string; summary: string }>
  characterLayers: Array<{ name: string; layer: string; duty: string }>
  themeAnchors: string[]
  worldAnchors: string[]
  relationAnchors: string[]
  dramaticMovement: string[]
  relationSummary: string[]
  softUnderstanding: string[]
  pendingConfirmations: string[]
}

function isGenericRoleName(value: string): boolean {
  return /^(主角|男主|女主|反派|对手|大小姐|反派大小姐|名门大小姐|名门正派大小姐|宗门老大|掌门|父亲|母亲|仇人)$/.test(
    value.trim()
  )
}

function requiredRosterCount(episodeCount: number): number {
  if (episodeCount >= 60) return 8
  if (episodeCount >= 20) return 6
  return 4
}

function mergeCharacterCards(
  base: Array<{ name: string; summary: string }>,
  additions: Array<{ name: string; summary: string }>,
  limit = 12
): Array<{ name: string; summary: string }> {
  return uniqueCharacterCards([...base, ...additions], limit)
}

function mergeCharacterLayers(
  base: Array<{ name: string; layer: string; duty: string }>,
  additions: Array<{ name: string; layer: string; duty: string }>,
  limit = 12
): Array<{ name: string; layer: string; duty: string }> {
  return uniqueCharacterLayers([...base, ...additions], limit)
}

function buildAutoRosterForDraft(draft: SummaryDraft): {
  keyCharacters: string[]
  characterCards: Array<{ name: string; summary: string }>
  characterLayers: Array<{ name: string; layer: string; duty: string }>
} {
  const combinedText = [
    draft.genreAndStyle,
    draft.worldAndBackground,
    draft.sellingPremise,
    draft.coreDislocation,
    draft.coreConflict,
    draft.chainSynopsis,
    ...draft.relationSummary,
    ...draft.worldAnchors,
    ...draft.relationAnchors
  ].join('\n')

  const isCultivation = /修仙|玄幻|宗门|魔尊|灵根|血脉|仙门|门派/.test(combinedText)
  const protagonist =
    draft.protagonist && !isGenericRoleName(draft.protagonist)
      ? draft.protagonist
      : isCultivation
        ? '林潜渊'
        : '林远'
  const antagonist =
    draft.antagonist && !isGenericRoleName(draft.antagonist)
      ? draft.antagonist
      : isCultivation
        ? '陆昭仪'
        : '陆昭'

  const cards = [
    {
      name: protagonist,
      summary:
        '男主，表面被众人嘲笑为废柴，实则身负魔尊血脉；开局母亲吊坠被踩碎后第一次觉醒，后续追查身世并完成逆袭复仇。'
    },
    {
      name: '谢含章',
      summary:
        '女主，宗门老大的女儿，暗中守护男主并陪他寻找身世真相；前期单向付出，被男主误解和忽视。'
    },
    {
      name: '沈观澜',
      summary:
        '宗门老大，知道男主魔尊血脉真相，为保护男主和世界故意制造废柴假象，长期背负误解和愧疚。'
    },
    {
      name: antagonist,
      summary:
        '名门正派大小姐，伪装善意接近男主，实际觊觎魔尊血脉，是情感骗局和血脉争夺线的核心反派。'
    },
    {
      name: '秦玄策',
      summary:
        '正道盟主宗门的掌权者，联合多派试探并围猎男主血脉，和男主父母旧案有关。'
    },
    {
      name: '周砚',
      summary:
        '开局欺辱男主的同门弟子，踩碎母亲吊坠并触发男主第一次觉醒，是第一场打脸的承压点。'
    },
    {
      name: '叶归尘',
      summary: '男主父亲旧案线索人物，牵出魔尊血脉、父母之死和正道盟主宗门的旧仇。'
    },
    {
      name: '执法弟子甲',
      summary: '功能角色，负责传令、宣判、押送和制造宗门规则压迫。'
    },
    {
      name: '山门守卫乙',
      summary: '群像角色，在山门、试炼、禁地入口等场景提供阻拦、通报和目击反应。'
    }
  ]

  const layers = [
    { name: protagonist, layer: '核心人物', duty: '承载废柴逆袭、血脉觉醒、身世追查和最终复仇。' },
    { name: '谢含章', layer: '核心人物', duty: '承载默默守护、禁忌情感和后期愧疚反转。' },
    { name: '沈观澜', layer: '核心人物', duty: '承载隐忍保护、父辈秘密和世界危机真相。' },
    { name: antagonist, layer: '核心反派', duty: '诱骗男主、争夺魔尊血脉、推动情感骗局。' },
    { name: '秦玄策', layer: '势力反派', duty: '代表正道盟主宗门和多派围猎压力。' },
    { name: '周砚', layer: '功能反派', duty: '负责开局羞辱、踩碎吊坠和第一场打脸。' },
    { name: '叶归尘', layer: '旧案线索', duty: '连接男主父母之死和复仇目标。' },
    { name: '执法弟子甲', layer: '功能角色', duty: '执行宗门规则压迫，可在多集里传令和押送。' },
    { name: '山门守卫乙', layer: '群像/跑龙套', duty: '提供阻拦、通报、目击和一句台词反应。' }
  ]

  return {
    keyCharacters: cards.map((item) => item.name),
    characterCards: cards,
    characterLayers: layers
  }
}

function shouldAutoCompleteRoster(draft: SummaryDraft, chatTranscript: string): boolean {
  const text = `${chatTranscript}\n${draft.protagonist}\n${draft.antagonist}\n${draft.chainSynopsis}`
  return (
    /帮.*取名|你.*取名|不会取名|不会写|随便取|自己取名字|你来取|你帮我.*补|交给你|你总结不了吗/.test(
      text
    ) ||
    isGenericRoleName(draft.protagonist) ||
    isGenericRoleName(draft.antagonist)
  )
}

function ensureUsableCharacterRoster(draft: SummaryDraft, chatTranscript: string): SummaryDraft {
  const requiredCount = requiredRosterCount(draft.episodeCount)
  const existingNames = uniqueList(
    [
      ...draft.keyCharacters,
      ...draft.characterCards.map((item) => item.name),
      ...draft.characterLayers.map((item) => item.name)
    ].filter((name) => name && !isGenericRoleName(name)),
    12
  )
  if (existingNames.length >= requiredCount) return draft
  if (!shouldAutoCompleteRoster(draft, chatTranscript)) return draft

  const autoRoster = buildAutoRosterForDraft(draft)
  const characterCards = mergeCharacterCards(draft.characterCards, autoRoster.characterCards)
  const characterLayers = mergeCharacterLayers(draft.characterLayers, autoRoster.characterLayers)
  const keyCharacters = normalizeNameList(
    [
      ...existingNames,
      ...draft.keyCharacters.filter((name) => !isGenericRoleName(name)),
      ...autoRoster.keyCharacters
    ],
    12
  )

  return {
    ...draft,
    protagonist:
      draft.protagonist && !isGenericRoleName(draft.protagonist)
        ? draft.protagonist
        : autoRoster.characterCards[0]?.name || draft.protagonist,
    antagonist:
      draft.antagonist && !isGenericRoleName(draft.antagonist)
        ? draft.antagonist
        : autoRoster.characterCards[3]?.name || draft.antagonist,
    keyCharacters,
    characterCards,
    characterLayers
  }
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function splitManualRequirementNotes(value: string): string[] {
  return value
    .split(/[；;\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function normalizeSummaryDraft(
  payload: Record<string, unknown> | null,
  chatTranscript: string
): SummaryDraft {
  const record = toRecord(payload)
  const baseStoryIntent = normalizeStoryIntent(record.storyIntent || payload)
  const normalizedTranscript = normalizeChatTranscriptForGeneration(chatTranscript)
  const structuredHeader = extractStructuredProjectHeader(chatTranscript)
  const structuredBrief = parseStructuredGenerationBrief(chatTranscript)
  const latestEpisodeCount = extractLatestEpisodeCountFromText(normalizedTranscript)
  const latestAuthoritativeEpisodeCount =
    extractLatestAuthoritativeEpisodeCountFromText(normalizedTranscript)
  const payloadCharacterCards = uniqueCharacterCards(extractRoleSummary(record.characterCards), 12)
  const structuredCharacterCards = uniqueCharacterCards(
    extractRoleSummary(structuredBrief?.characterCards),
    12
  )
  const characterCards =
    payloadCharacterCards.length > 0 ? payloadCharacterCards : structuredCharacterCards
  const characterCardNames = uniqueList(
    characterCards.map((item) => item.name),
    12
  )
  const keyCharacters = normalizeNameList(
    [
      ...toTextArray(record.keyCharacters),
      ...toTextArray(record.officialKeyCharacters),
      ...toTextArray(record.lockedCharacterNames),
      ...(baseStoryIntent.officialKeyCharacters || []),
      ...(baseStoryIntent.lockedCharacterNames || []),
      baseStoryIntent.protagonist || '',
      baseStoryIntent.antagonist || ''
    ],
    12
  )
  const roleCardAuthorityCharacters =
    characterCardNames.length > 0 ? characterCardNames : keyCharacters
  const relationAnchors = uniqueList(
    [
      ...toTextArray(record.relationAnchors),
      ...(baseStoryIntent.relationAnchors || []),
      ...toTextArray(record.relationSummary)
    ],
    8
  )
  const dramaticMovement = uniqueList(
    [
      ...toTextArray(record.dramaticMovement),
      toText(record.seasonDesireLine),
      toText(record.seasonResistanceLine),
      toText(record.seasonCostLine),
      toText(record.relationshipLeverLine),
      toText(record.hookChainLine),
      ...(baseStoryIntent.dramaticMovement || [])
    ].filter(Boolean),
    5
  )
  const pendingConfirmations = uniqueList(
    [
      ...toTextArray(record.pendingConfirmations),
      ...splitManualRequirementNotes(
        toText(record.manualRequirementNotes) || baseStoryIntent.manualRequirementNotes || ''
      )
    ],
    8
  )

  return ensureUsableCharacterRoster(
    {
    projectTitle:
      structuredHeader?.projectTitle ||
      toText(record.projectTitle) ||
      baseStoryIntent.titleHint ||
      '',
    episodeCount:
      latestAuthoritativeEpisodeCount || Number(record.episodeCount) || latestEpisodeCount || 0,
    genreAndStyle:
      toText(record.genreAndStyle) || toText(record.genre) || baseStoryIntent.genre || '',
    tone: toText(record.tone) || baseStoryIntent.tone || '',
    audience: toText(record.audience) || baseStoryIntent.audience || '',
    sellingPremise: toText(record.sellingPremise) || baseStoryIntent.sellingPremise || '',
    coreDislocation: toText(record.coreDislocation) || baseStoryIntent.coreDislocation || '',
    emotionalPayoff: toText(record.emotionalPayoff) || baseStoryIntent.emotionalPayoff || '',
    worldAndBackground:
      toText(record.worldAndBackground) ||
      toTextArray(record.worldAnchors)[0] ||
      baseStoryIntent.worldAnchors?.[0] ||
      '',
    protagonist: toText(record.protagonist) || baseStoryIntent.protagonist || '',
    antagonist: toText(record.antagonist) || baseStoryIntent.antagonist || '',
    coreConflict: toText(record.coreConflict) || baseStoryIntent.coreConflict || '',
    endingDirection: toText(record.endingDirection) || baseStoryIntent.endingDirection || '',
    keyCharacters: roleCardAuthorityCharacters,
    chainSynopsis: toText(record.chainSynopsis) || baseStoryIntent.freeChatFinalSummary || '',
    characterCards,
    characterLayers: uniqueCharacterLayers(extractCharacterLayers(record.characterLayers), 12),
    themeAnchors: uniqueList(
      [...toTextArray(record.themeAnchors), ...(baseStoryIntent.themeAnchors || [])],
      8
    ),
    worldAnchors: uniqueList(
      [
        ...toTextArray(record.worldAnchors),
        ...(baseStoryIntent.worldAnchors || []),
        toText(record.worldAndBackground)
      ].filter(Boolean),
      8
    ),
    relationAnchors,
    dramaticMovement,
    relationSummary: uniqueList([...toTextArray(record.relationSummary), ...relationAnchors], 8),
    softUnderstanding: uniqueList(toTextArray(record.softUnderstanding), 8),
      pendingConfirmations
    },
    chatTranscript
  )
}

export function parseStructuredGenerationBrief(
  chatTranscript: string
): Record<string, unknown> | null {
  const rawTranscript = typeof chatTranscript === 'string' ? chatTranscript : ''
  const normalizedUserTranscript = normalizeChatTranscriptForGeneration(rawTranscript)
  if (!rawTranscript.includes('【项目】') || !rawTranscript.includes('【主角】')) return null
  const structuredText = extractStructuredBriefText(rawTranscript)
  const sectionMap = extractSectionMap(structuredText)
  if (sectionMap.size === 0) return null

  const sections = collectStructuredSections(sectionMap)
  const structuredHeader = extractStructuredProjectHeader(rawTranscript)
  const latestEpisodeCount = extractLatestEpisodeCountFromText(normalizedUserTranscript)
  const latestAuthoritativeEpisodeCount =
    extractLatestAuthoritativeEpisodeCountFromText(normalizedUserTranscript)
  const resolvedEpisodeCount = latestAuthoritativeEpisodeCount || latestEpisodeCount || 10
  const dramaticChain = inferChainFromStructuredSections(sections)
  const themeAnchors = uniqueList(
    [
      ...sections.softUnderstanding,
      pickThemeAnchor(sections),
      dramaticChain.seasonDesireLine,
      dramaticChain.seasonCostLine
    ].filter(Boolean),
    8
  )
  const worldAnchors = uniqueList(
    [
      toText(sectionMap.get('世界观与故事背景')),
      toText(sectionMap.get('串联简介')),
      pickWorldPressure(sections)
    ].filter(Boolean),
    8
  )
  const relationAnchors = uniqueList(
    [...sections.relationSummary, dramaticChain.relationshipLeverLine].filter(Boolean),
    8
  )

  return {
    projectTitle: structuredHeader?.projectTitle || toText(sectionMap.get('项目')),
    episodeCount: resolvedEpisodeCount,
    genreAndStyle: toText(sectionMap.get('题材与风格')),
    sellingPremise: pickSellingPremise(sections),
    coreDislocation: pickCoreDislocation(sections),
    emotionalPayoff: pickEmotionalPayoff(sections),
    worldAndBackground: toText(sectionMap.get('世界观与故事背景')),
    protagonist: sections.protagonist,
    antagonist: sections.antagonist,
    coreConflict: toText(sectionMap.get('核心冲突')),
    endingDirection: toText(sectionMap.get('结局方向')),
    keyCharacters: sections.keyCharacters,
    chainSynopsis: toText(sectionMap.get('串联简介')),
    characterCards: sections.characterCards,
    characterLayers: inferCharacterLayersFromSections(sections),
    themeAnchors,
    worldAnchors,
    relationAnchors,
    dramaticMovement: uniqueList(
      [
        dramaticChain.seasonDesireLine,
        dramaticChain.seasonResistanceLine,
        dramaticChain.seasonCostLine,
        dramaticChain.relationshipLeverLine,
        dramaticChain.hookChainLine
      ].filter(Boolean),
      5
    ),
    relationSummary: sections.relationSummary,
    softUnderstanding: sections.softUnderstanding,
    pendingConfirmations: sections.pendingConfirmations
  }
}

function extractStorySynopsis(payload: Record<string, unknown> | null): StorySynopsisDto | null {
  if (!payload) return null
  const raw = payload.storySynopsis
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const record = raw as Record<string, unknown>
  const logline = String(record.logline || '').trim()
  if (!logline) return null

  return {
    logline,
    openingPressureEvent: String(record.openingPressureEvent || '').trim(),
    protagonistCurrentDilemma: String(record.protagonistCurrentDilemma || '').trim(),
    firstFaceSlapEvent: String(record.firstFaceSlapEvent || '').trim(),
    antagonistForce: String(record.antagonistForce || '').trim(),
    antagonistPressureMethod: String(record.antagonistPressureMethod || '').trim(),
    corePayoff: String(record.corePayoff || '').trim(),
    stageGoal: String(record.stageGoal || '').trim(),
    keyFemaleCharacterFunction: String(record.keyFemaleCharacterFunction || '').trim() || undefined,
    episodePlanHint: String(record.episodePlanHint || '').trim() || undefined,
    finaleDirection: String(record.finaleDirection || '').trim()
  }
}

export function normalizeSummaryPayload(
  payload: Record<string, unknown> | null,
  chatTranscript: string
): {
  generationBriefText: string
  storyIntent: Partial<StoryIntentPackageDto>
} {
  const draft = normalizeSummaryDraft(payload, chatTranscript)
  const generationBrief = normalizeGenerationBriefPackage({
    projectTitle: draft.projectTitle,
    episodeCount: draft.episodeCount,
    genreAndStyle: draft.genreAndStyle,
    sellingPremise: draft.sellingPremise,
    coreDislocation: draft.coreDislocation,
    emotionalPayoff: draft.emotionalPayoff,
    worldAndBackground: draft.worldAndBackground || draft.worldAnchors.join('；'),
    protagonist: draft.protagonist,
    antagonist: draft.antagonist,
    coreConflict: draft.coreConflict,
    endingDirection: draft.endingDirection,
    keyCharacters: draft.keyCharacters,
    chainSynopsis: draft.chainSynopsis,
    characterCards: draft.characterCards,
    characterLayers: draft.characterLayers,
    seasonDesireLine: draft.dramaticMovement[0] || '',
    seasonResistanceLine: draft.dramaticMovement[1] || '',
    seasonCostLine: draft.dramaticMovement[2] || '',
    relationshipLeverLine: draft.relationAnchors[0] || draft.dramaticMovement[3] || '',
    hookChainLine: draft.dramaticMovement[4] || draft.dramaticMovement[3] || '',
    relationSummary: draft.relationSummary,
    softUnderstanding: draft.softUnderstanding,
    pendingConfirmations: draft.pendingConfirmations
  })
  const generationBriefText = renderGenerationBriefTemplate(generationBrief)
  const creativeSummary = String(payload?.creativeSummary || '').trim() || draft.chainSynopsis
  const storySynopsis = extractStorySynopsis(payload)

  return {
    generationBriefText,
    storyIntent: {
      titleHint: draft.projectTitle,
      genre: draft.genreAndStyle,
      tone: draft.tone,
      audience: draft.audience,
      sellingPremise: draft.sellingPremise,
      coreDislocation: draft.coreDislocation,
      emotionalPayoff: draft.emotionalPayoff,
      protagonist: draft.protagonist,
      antagonist: draft.antagonist,
      coreConflict: draft.coreConflict,
      endingDirection: draft.endingDirection,
      officialKeyCharacters: draft.keyCharacters,
      lockedCharacterNames: draft.keyCharacters,
      themeAnchors: draft.themeAnchors,
      worldAnchors: draft.worldAnchors,
      relationAnchors: draft.relationAnchors,
      dramaticMovement: draft.dramaticMovement,
      manualRequirementNotes: draft.pendingConfirmations.join('；'),
      freeChatFinalSummary: draft.chainSynopsis,
      generationBriefText,
      creativeSummary,
      storySynopsis
    }
  }
}

export function isSummaryPayloadComplete(payload: Record<string, unknown> | null): boolean {
  if (!payload) return false

  const draft = normalizeSummaryDraft(payload, '')

  return Boolean(
    draft.projectTitle &&
    draft.episodeCount > 0 &&
    draft.genreAndStyle &&
    draft.sellingPremise &&
    draft.coreDislocation &&
    draft.emotionalPayoff &&
    draft.protagonist &&
    draft.chainSynopsis &&
    draft.keyCharacters.length > 0
  )
}

export { tryParseObject }
