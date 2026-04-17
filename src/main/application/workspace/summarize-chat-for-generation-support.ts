import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
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
  const latestAuthoritativeEpisodeCount = extractLatestAuthoritativeEpisodeCountFromText(
    normalizedTranscript
  )
  const payloadCharacterCards = uniqueCharacterCards(extractRoleSummary(record.characterCards), 8)
  const structuredCharacterCards = uniqueCharacterCards(
    extractRoleSummary(structuredBrief?.characterCards),
    8
  )
  const characterCards =
    payloadCharacterCards.length > 0 ? payloadCharacterCards : structuredCharacterCards
  const characterCardNames = uniqueList(characterCards.map((item) => item.name), 8)
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
    8
  )
  const roleCardAuthorityCharacters = characterCardNames.length > 0 ? characterCardNames : keyCharacters
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

  return {
    projectTitle:
      structuredHeader?.projectTitle ||
      toText(record.projectTitle) ||
      baseStoryIntent.titleHint ||
      '',
    episodeCount:
      latestAuthoritativeEpisodeCount ||
      Number(record.episodeCount) ||
      latestEpisodeCount ||
      0,
    genreAndStyle:
      toText(record.genreAndStyle) || toText(record.genre) || baseStoryIntent.genre || '',
    tone: toText(record.tone) || baseStoryIntent.tone || '',
    audience: toText(record.audience) || baseStoryIntent.audience || '',
    sellingPremise: toText(record.sellingPremise) || baseStoryIntent.sellingPremise || '',
    coreDislocation:
      toText(record.coreDislocation) || baseStoryIntent.coreDislocation || '',
    emotionalPayoff:
      toText(record.emotionalPayoff) || baseStoryIntent.emotionalPayoff || '',
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
    chainSynopsis:
      toText(record.chainSynopsis) || baseStoryIntent.freeChatFinalSummary || '',
    characterCards,
    characterLayers: uniqueCharacterLayers(extractCharacterLayers(record.characterLayers), 8),
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
      4
    ),
    relationAnchors,
    dramaticMovement,
    relationSummary: uniqueList(
      [...toTextArray(record.relationSummary), ...relationAnchors],
      8
    ),
    softUnderstanding: uniqueList(toTextArray(record.softUnderstanding), 8),
    pendingConfirmations
  }
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
  const latestAuthoritativeEpisodeCount = extractLatestAuthoritativeEpisodeCountFromText(
    normalizedUserTranscript
  )
  const resolvedEpisodeCount =
    latestAuthoritativeEpisodeCount || latestEpisodeCount || 10
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
    4
  )
  const relationAnchors = uniqueList(
    [...sections.relationSummary, dramaticChain.relationshipLeverLine].filter(Boolean),
    8
  )

  return {
    projectTitle:
      structuredHeader?.projectTitle || toText(sectionMap.get('项目')),
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
      generationBriefText
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
