import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import { normalizeChatTranscriptForGeneration } from './normalize-chat-transcript'
import {
  normalizeGenerationBriefPackage,
  renderGenerationBriefTemplate
} from './generation-brief-template'
import { buildFallbackSummary } from './summarize-chat-for-generation-fallback'
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
} from './summarize-chat-for-generation-shared'
import {
  collectStructuredSections,
  extractSectionMap,
  extractStructuredBriefText
} from './summarize-chat-for-generation-structured-parser'
import {
  inferChainFromStructuredSections,
  inferCharacterLayersFromSections,
  pickCoreDislocation,
  pickEmotionalPayoff,
  pickSellingPremise,
  pickThemeAnchor,
  pickWorldPressure
} from './summarize-chat-for-generation-structured-inference'

export function parseStructuredGenerationBrief(chatTranscript: string): Record<string, unknown> | null {
  const normalizedTranscript = normalizeChatTranscriptForGeneration(chatTranscript)
  if (!normalizedTranscript.includes('【项目】') || !normalizedTranscript.includes('【主角】')) return null
  const structuredText = extractStructuredBriefText(normalizedTranscript)
  const sectionMap = extractSectionMap(structuredText)
  if (sectionMap.size === 0) return null

  const sections = collectStructuredSections(sectionMap)
  const projectMatch = (sectionMap.get('项目') || '').match(/^([^｜|]+)[｜|]?(\d+)?/)
  const dramaticChain = inferChainFromStructuredSections(sections)
  const themeAnchors = uniqueList(
    [...sections.softUnderstanding, pickThemeAnchor(sections), dramaticChain.seasonDesireLine, dramaticChain.seasonCostLine].filter(Boolean),
    8
  )
  const worldAnchors = uniqueList(
    [toText(sectionMap.get('世界观与故事背景')), toText(sectionMap.get('串联简介')), pickWorldPressure(sections)].filter(Boolean),
    4
  )
  const relationAnchors = uniqueList(
    [...sections.relationSummary, dramaticChain.relationshipLeverLine].filter(Boolean),
    8
  )

  return {
    generationBrief: {
      projectTitle: toText(projectMatch?.[1] || sectionMap.get('项目')),
      episodeCount: Number(projectMatch?.[2] || 10),
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
      ...dramaticChain,
      relationSummary: sections.relationSummary,
      softUnderstanding: sections.softUnderstanding,
      pendingConfirmations: sections.pendingConfirmations
    },
    storyIntent: {
      titleHint: toText(projectMatch?.[1] || sectionMap.get('项目')),
      genre: toText(sectionMap.get('题材与风格')),
      sellingPremise: pickSellingPremise(sections),
      coreDislocation: pickCoreDislocation(sections),
      emotionalPayoff: pickEmotionalPayoff(sections),
      protagonist: sections.protagonist,
      antagonist: sections.antagonist,
      coreConflict: toText(sectionMap.get('核心冲突')),
      endingDirection: toText(sectionMap.get('结局方向')),
      officialKeyCharacters: sections.keyCharacters,
      lockedCharacterNames: uniqueList([sections.protagonist, sections.antagonist, ...sections.keyCharacters], 6),
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
        8
      ),
      manualRequirementNotes: sections.pendingConfirmations.join('；'),
      freeChatFinalSummary: toText(sectionMap.get('串联简介'))
    }
  }
}

export function normalizeSummaryPayload(payload: Record<string, unknown> | null, chatTranscript: string): {
  generationBriefText: string
  storyIntent: Partial<StoryIntentPackageDto>
} {
  const fallback = buildFallbackSummary(chatTranscript)
  const generationBriefRecord =
    payload?.generationBrief && typeof payload.generationBrief === 'object' && !Array.isArray(payload.generationBrief)
      ? (payload.generationBrief as Record<string, unknown>)
      : {}

  const mergedKeyCharacters = normalizeNameList(
    [
      ...toTextArray(generationBriefRecord.keyCharacters),
      ...(fallback.generationBrief?.keyCharacters || [])
    ],
    8
  )
  const mergedCharacterCards = uniqueCharacterCards(
    [
      ...extractRoleSummary(generationBriefRecord.characterCards),
      ...(fallback.generationBrief?.characterCards || [])
    ],
    8
  )
  const mergedCharacterLayers = uniqueCharacterLayers(
    [
      ...extractCharacterLayers(generationBriefRecord.characterLayers),
      ...(fallback.generationBrief?.characterLayers || [])
    ],
    8
  )

  const generationBrief = normalizeGenerationBriefPackage({
    ...fallback.generationBrief,
    projectTitle: toText(generationBriefRecord.projectTitle) || fallback.generationBrief?.projectTitle,
    episodeCount: Number(generationBriefRecord.episodeCount) || fallback.generationBrief?.episodeCount,
    genreAndStyle: toText(generationBriefRecord.genreAndStyle) || fallback.generationBrief?.genreAndStyle,
    sellingPremise: toText(generationBriefRecord.sellingPremise) || fallback.generationBrief?.sellingPremise,
    coreDislocation: toText(generationBriefRecord.coreDislocation) || fallback.generationBrief?.coreDislocation,
    emotionalPayoff: toText(generationBriefRecord.emotionalPayoff) || fallback.generationBrief?.emotionalPayoff,
    worldAndBackground: toText(generationBriefRecord.worldAndBackground) || fallback.generationBrief?.worldAndBackground,
    protagonist: toText(generationBriefRecord.protagonist) || fallback.generationBrief?.protagonist,
    antagonist: toText(generationBriefRecord.antagonist) || fallback.generationBrief?.antagonist,
    coreConflict: toText(generationBriefRecord.coreConflict) || fallback.generationBrief?.coreConflict,
    endingDirection: toText(generationBriefRecord.endingDirection) || fallback.generationBrief?.endingDirection,
    keyCharacters: mergedKeyCharacters.length ? mergedKeyCharacters : fallback.generationBrief?.keyCharacters,
    chainSynopsis: toText(generationBriefRecord.chainSynopsis) || fallback.generationBrief?.chainSynopsis,
    characterCards: mergedCharacterCards.length ? mergedCharacterCards : fallback.generationBrief?.characterCards,
    characterLayers: mergedCharacterLayers.length ? mergedCharacterLayers : fallback.generationBrief?.characterLayers,
    seasonDesireLine: toText(generationBriefRecord.seasonDesireLine) || fallback.generationBrief?.seasonDesireLine,
    seasonResistanceLine:
      toText(generationBriefRecord.seasonResistanceLine) || fallback.generationBrief?.seasonResistanceLine,
    seasonCostLine: toText(generationBriefRecord.seasonCostLine) || fallback.generationBrief?.seasonCostLine,
    relationshipLeverLine:
      toText(generationBriefRecord.relationshipLeverLine) || fallback.generationBrief?.relationshipLeverLine,
    hookChainLine: toText(generationBriefRecord.hookChainLine) || fallback.generationBrief?.hookChainLine,
    relationSummary: toTextArray(generationBriefRecord.relationSummary).length
      ? toTextArray(generationBriefRecord.relationSummary)
      : fallback.generationBrief?.relationSummary,
    softUnderstanding: toTextArray(generationBriefRecord.softUnderstanding).length
      ? toTextArray(generationBriefRecord.softUnderstanding)
      : fallback.generationBrief?.softUnderstanding,
    pendingConfirmations: toTextArray(generationBriefRecord.pendingConfirmations).length
      ? toTextArray(generationBriefRecord.pendingConfirmations)
      : fallback.generationBrief?.pendingConfirmations
  })

  return {
    generationBriefText: renderGenerationBriefTemplate(generationBrief),
    storyIntent: {
      ...fallback.storyIntent,
      ...normalizeStoryIntent(payload?.storyIntent),
      sellingPremise:
        toText((payload?.storyIntent as Record<string, unknown> | undefined)?.sellingPremise) ||
        fallback.storyIntent?.sellingPremise ||
        generationBrief.sellingPremise,
      coreDislocation:
        toText((payload?.storyIntent as Record<string, unknown> | undefined)?.coreDislocation) ||
        fallback.storyIntent?.coreDislocation ||
        generationBrief.coreDislocation,
      emotionalPayoff:
        toText((payload?.storyIntent as Record<string, unknown> | undefined)?.emotionalPayoff) ||
        fallback.storyIntent?.emotionalPayoff ||
        generationBrief.emotionalPayoff,
      officialKeyCharacters: normalizeNameList(
        [
          ...toTextArray((payload?.storyIntent as Record<string, unknown> | undefined)?.officialKeyCharacters),
          ...(fallback.storyIntent?.officialKeyCharacters || []),
          ...generationBrief.keyCharacters
        ],
        8
      ),
      lockedCharacterNames: normalizeNameList(
        [
          ...toTextArray((payload?.storyIntent as Record<string, unknown> | undefined)?.lockedCharacterNames),
          ...(fallback.storyIntent?.lockedCharacterNames || []),
          ...generationBrief.keyCharacters
        ],
        8
      ),
      generationBriefText: renderGenerationBriefTemplate(generationBrief)
    }
  }
}

export { tryParseObject }
