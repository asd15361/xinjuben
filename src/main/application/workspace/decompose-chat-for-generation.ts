/**
 * Truth Decomposition Engine
 *
 * Transforms freeform user input into structured DecompositionResult.
 * This is the runtime/application-layer decomposition that sits between
 * freeform input and downstream outline/character generation.
 */

import type {
  DecomposeInput,
  DecompositionResult,
  DecompositionCharacter,
  DecompositionFaction,
  DecompositionLocation,
  DecompositionItem,
  DecompositionRelation,
  DecompositionImmutableFact,
  DecompositionUnresolved,
  DecompositionSourceInfo
} from '../../../shared/contracts/decomposition'
import type {
  FormalFactProvenanceTier,
  FormalFactAuthorityType
} from '../../../shared/contracts/formal-fact'
import {
  extractSectionMap,
  collectStructuredSections,
  type StructuredBriefSections
} from './summarize-chat-for-generation-structured-parser.ts'
import { extractNamesFromText } from './summarize-chat-for-generation-shared.ts'

const DEFAULT_TIER: FormalFactProvenanceTier = 'user_declared'

function makeSource(
  provenanceTier: FormalFactProvenanceTier,
  originAuthorityType: FormalFactAuthorityType,
  sourceSection?: string,
  confidence = 1.0
): DecompositionSourceInfo {
  return {
    provenanceTier,
    originAuthorityType,
    sourceSection,
    confidence
  }
}

function extractCharactersFromSections(
  sections: StructuredBriefSections,
  provenanceTier: FormalFactProvenanceTier
): DecompositionCharacter[] {
  const characters: DecompositionCharacter[] = []
  const seen = new Set<string>()

  const addCharacter = (
    name: string,
    summary?: string,
    roleHint?: DecompositionCharacter['roleHint']
  ) => {
    if (!name || seen.has(name)) return
    seen.add(name)
    characters.push({
      name,
      aliases: [],
      summary,
      roleHint,
      source: makeSource(provenanceTier, 'user_declared', 'character_cards')
    })
  }

  if (sections.protagonist) {
    addCharacter(sections.protagonist, undefined, 'protagonist')
  }
  if (sections.antagonist) {
    addCharacter(sections.antagonist, undefined, 'antagonist')
  }

  for (const card of sections.characterCards) {
    const role: DecompositionCharacter['roleHint'] =
      card.name === sections.protagonist
        ? 'protagonist'
        : card.name === sections.antagonist
          ? 'antagonist'
          : sections.explicitKeyCharacters.includes(card.name)
            ? 'supporting'
            : 'minor'
    addCharacter(card.name, card.summary, role)
  }

  for (const name of sections.explicitKeyCharacters) {
    if (!seen.has(name)) {
      addCharacter(name, undefined, 'supporting')
    }
  }

  return characters
}

function extractFactionsFromSectionMap(
  sectionMap: Map<string, string>,
  sections: StructuredBriefSections,
  provenanceTier: FormalFactProvenanceTier
): DecompositionFaction[] {
  const factions: DecompositionFaction[] = []
  const seen = new Set<string>()

  const factionKeywords = [
    '宗门',
    '道观',
    '家族',
    '世家',
    '门阀',
    '王朝',
    '皇权',
    '帮派',
    '门派',
    '教派',
    '组织',
    '派系'
  ]
  const factionTypeMap: Record<string, DecompositionFaction['factionType']> = {
    宗门: 'sect',
    道观: 'sect',
    门派: 'sect',
    家族: 'family',
    世家: 'family',
    门阀: 'family',
    帮派: 'organization',
    教派: 'organization',
    组织: 'organization',
    王朝: 'court',
    皇权: 'court',
    派系: 'other'
  }

  const worldSection = sectionMap.get('世界观与故事背景') || ''
  const synopsisSection = sectionMap.get('串联简介') || ''

  const genericFactionNames = new Set([
    '宗门',
    '道观',
    '家族',
    '世家',
    '门阀',
    '王朝',
    '皇权',
    '帮派',
    '门派',
    '教派',
    '组织',
    '派系'
  ])

  const inferFactionType = (name: string): DecompositionFaction['factionType'] => {
    if (
      name.endsWith('家族') ||
      name.endsWith('世家') ||
      name.endsWith('门阀')
    ) {
      return 'family'
    }
    if (
      name.endsWith('王朝') ||
      name === '朝廷' ||
      name === '皇宫' ||
      name.endsWith('皇宫') ||
      name === '官府' ||
      name.endsWith('衙门') ||
      name.endsWith('法院') ||
      name.endsWith('公安局') ||
      name.endsWith('分局') ||
      name.endsWith('公安系统')
    ) {
      return 'court'
    }
    if (
      name.endsWith('会') ||
      name.endsWith('帮') ||
      name.endsWith('盟') ||
      name.endsWith('堂') ||
      name.endsWith('司') ||
      name.endsWith('局')
    ) {
      return 'organization'
    }
    if (
      name.endsWith('门') ||
      name.endsWith('派') ||
      name.endsWith('宗') ||
      name.endsWith('宫') ||
      name.endsWith('阁') ||
      name.endsWith('道观')
    ) {
      return 'sect'
    }
    return 'other'
  }

  const worldFactionPattern =
    /(?:^|[，。；、：\s]|在|于|是|有|还|和|与|并|等)(朝廷|皇宫|官府|衙门|法院|公安系统|[一-龥]{2,8}(?:宗门|门派|道观|公安局|分局|司|局|院|府|帮|会|盟|堂|门|派|宗|宫|阁))(?=(?:等(?:\d+座)?道观|[，。；、：\s]|与|和|并|共|同|中|里|内|外|被|暗|仍|又|及|还有|共同|$))/g
  const cardFactionPattern =
    /(朝廷|皇宫|官府|衙门|法院|公安系统|[一-龥]{2,8}(?:帮|会|盟|堂|门|派|宗|宫|阁))(?=(?:香主|堂主|帮主|弟子|道长|长老|掌门|成员|门人))/g
  const invalidFactionPrefixes = ['修仙', '凡俗', '民间', '反清复明组织', '等级世界', '意外成为', '却陷入', '长大的']

  const collectNamedFactions = (): string[] => {
    const names: string[] = []
    const factionTokenPattern = /(朝廷|皇宫|官府|衙门|法院|公安系统|[一-龥]{2,8}?(?:帮|会|盟|堂|门|派|宗|宫|阁|府|院|司|局))/g
    const normalizeFactionNameCandidate = (candidate: string): string[] => {
      const compact = candidate.trim().replace(/等.+$/u, '')
      const parts = [...compact.matchAll(factionTokenPattern)]
        .map((match) => match[1]?.trim() || '')
        .filter(Boolean)
      return parts.length > 0 ? parts : [compact]
    }

    const addName = (name: string) => {
      const cleaned = name.trim()
      if (
        !cleaned ||
        genericFactionNames.has(cleaned) ||
        invalidFactionPrefixes.some((prefix) => cleaned.startsWith(prefix)) ||
        names.includes(cleaned)
      ) {
        return
      }
      names.push(cleaned)
    }

    for (const match of `${worldSection}\n${synopsisSection}`.matchAll(worldFactionPattern)) {
      for (const name of normalizeFactionNameCandidate(match[1] || '')) {
        addName(name)
      }
    }

    for (const card of sections.characterCards) {
      for (const match of card.summary.matchAll(cardFactionPattern)) {
        for (const name of normalizeFactionNameCandidate(match[1] || '')) {
          addName(name)
        }
      }
    }

    return names
  }

  const findFactionMembers = (factionName: string): string[] =>
    sections.characterCards
      .filter((card) => card.summary.includes(factionName))
      .map((card) => card.name)

  const namedFactions = collectNamedFactions()
  for (const name of namedFactions) {
    seen.add(name)
    factions.push({
      name,
      factionType: inferFactionType(name),
      memberNames: findFactionMembers(name),
      summary: `涉及${name}这条势力线`,
      source: makeSource(provenanceTier, 'ai_suggested', 'world_background')
    })
  }

  if (namedFactions.length === 0) {
    for (const keyword of factionKeywords) {
      if (worldSection.includes(keyword) || synopsisSection.includes(keyword)) {
        const factionType = factionTypeMap[keyword] || 'other'
        if (!seen.has(keyword)) {
          seen.add(keyword)
          factions.push({
            name: keyword,
            factionType,
            memberNames: [],
            summary: `涉及${keyword}层面的势力`,
            source: makeSource(provenanceTier, 'ai_suggested', 'world_background')
          })
        }
      }
    }
  }

  return factions
}

function extractLocationsFromSectionMap(
  sectionMap: Map<string, string>,
  provenanceTier: FormalFactProvenanceTier
): DecompositionLocation[] {
  const locations: DecompositionLocation[] = []
  const seen = new Set<string>()

  const locationKeywords = [
    '镇',
    '城',
    '村',
    '山',
    '洞',
    '府',
    '宫',
    '殿',
    '楼',
    '阁',
    '寺',
    '观',
    '岛',
    '域',
    '境'
  ]

  const worldSection = sectionMap.get('世界观与故事背景') || ''
  const synopsisSection = sectionMap.get('串联简介') || ''

  const textToSearch = `${worldSection} ${synopsisSection}`

  const allNames = extractNamesFromText(textToSearch)
  for (const name of allNames) {
    const isLocation = locationKeywords.some((kw) => name.includes(kw))
    if (isLocation && !seen.has(name)) {
      seen.add(name)
      locations.push({
        name,
        locationType: name.includes('城')
          ? 'city'
          : name.includes('镇') || name.includes('村')
            ? 'site'
            : 'other',
        summary: `场景：${name}`,
        source: makeSource(provenanceTier, 'ai_suggested', 'location_inference')
      })
    }
  }

  return locations
}

function extractItemsFromSectionMap(
  sectionMap: Map<string, string>,
  provenanceTier: FormalFactProvenanceTier
): DecompositionItem[] {
  const items: DecompositionItem[] = []
  const seen = new Set<string>()

  const itemKeywords = [
    '钥匙',
    '秘宝',
    '密库',
    '法器',
    '婚约',
    '证据',
    '秘卷',
    '玉佩',
    '令牌',
    '秘籍',
    '丹药',
    '兵器'
  ]

  const synopsisSection = sectionMap.get('串联简介') || ''
  const conflictSection = sectionMap.get('核心冲突') || ''

  const textToSearch = `${synopsisSection} ${conflictSection}`

  for (const keyword of itemKeywords) {
    if (textToSearch.includes(keyword) && !seen.has(keyword)) {
      seen.add(keyword)
      items.push({
        name: keyword,
        itemType:
          keyword === '钥匙'
            ? 'key'
            : keyword.includes('秘') || keyword.includes('法')
              ? 'artifact'
              : 'other',
        summary: `关键物品：${keyword}`,
        source: makeSource(provenanceTier, 'ai_suggested', 'item_inference')
      })
    }
  }

  return items
}

function extractRelationsFromSections(
  sections: StructuredBriefSections,
  provenanceTier: FormalFactProvenanceTier
): DecompositionRelation[] {
  const relations: DecompositionRelation[] = []
  const seen = new Set<string>()

  const knownNames = new Set(
    [
      sections.protagonist,
      sections.antagonist,
      ...sections.explicitKeyCharacters,
      ...sections.characterCards.map((c) => c.name)
    ].filter(Boolean)
  )

  for (const line of sections.relationSummary) {
    const namesInLine = extractNamesFromText(line).filter((n) => knownNames.has(n))
    if (namesInLine.length < 2) continue

    const fromName = namesInLine[0]
    const toName = namesInLine[1]

    let relationType: DecompositionRelation['relationType'] = 'other'
    if (/敌|仇|恨|杀|对抗/.test(line)) {
      relationType = 'hostility'
    } else if (/爱|喜欢|心|情/.test(line)) {
      relationType = 'romance'
    } else if (/师|徒|传|教/.test(line)) {
      relationType = 'mastery'
    } else if (/联盟|并肩|联手|合作/.test(line)) {
      relationType = 'alliance'
    }

    const key = `${fromName}->${toName}`
    if (!seen.has(key)) {
      seen.add(key)
      relations.push({
        fromName,
        toName,
        relationType,
        summary: line,
        source: makeSource(provenanceTier, 'ai_suggested', 'relation_summary')
      })
    }
  }

  return relations
}

function extractImmutableFactsFromSections(
  sections: StructuredBriefSections,
  provenanceTier: FormalFactProvenanceTier
): DecompositionImmutableFact[] {
  const facts: DecompositionImmutableFact[] = []

  const sectionPairs: Array<[string, string]> = [
    ['核心冲突', sections.sectionMap.get('核心冲突') || ''],
    ['核心错位', sections.sectionMap.get('核心错位') || ''],
    ['情绪兑现', sections.sectionMap.get('情绪兑现') || ''],
    ['设定成交句', sections.sectionMap.get('设定成交句') || '']
  ]

  for (const [label, content] of sectionPairs) {
    if (content && content.trim() && content.trim() !== '待补') {
      facts.push({
        label,
        description: content.trim(),
        source: makeSource(provenanceTier, 'user_declared', label)
      })
    }
  }

  return facts
}

function extractUnresolvedFromSections(
  sections: StructuredBriefSections,
  provenanceTier: FormalFactProvenanceTier
): DecompositionUnresolved[] {
  const unresolved: DecompositionUnresolved[] = []

  for (const item of sections.pendingConfirmations) {
    if (!item || !item.trim()) continue

    const hasAmbiguity = /不确定|未确认|待定|模糊|可能/.test(item)
    const hasQuestion = item.includes('?') || item.includes('？') || hasAmbiguity

    unresolved.push({
      item: item.trim(),
      ambiguity: hasAmbiguity ? '信息不完整或存在多种可能' : '待用户确认',
      question: hasQuestion ? item : `请确认：${item}`,
      source: makeSource(provenanceTier, 'ai_suggested', 'pending_confirmations')
    })
  }

  for (const line of sections.softUnderstanding) {
    if (!line || !line.trim()) continue
    if (/待确认|不确定|未说明|待定/.test(line)) {
      unresolved.push({
        item: line.trim(),
        ambiguity: '软理解中包含未确认信息',
        question: `请确认软理解：${line.trim()}`,
        source: makeSource(provenanceTier, 'ai_suggested', 'soft_understanding')
      })
    }
  }

  return unresolved
}

/**
 * Main decomposition function.
 * Takes freeform input and produces structured DecompositionResult.
 */
export function decomposeFreeformInput(input: DecomposeInput): DecompositionResult {
  const provenanceTier = input.provenanceTier || DEFAULT_TIER
  const text = input.text.trim()

  if (!text) {
    return {
      characters: [],
      factions: [],
      locations: [],
      items: [],
      relations: [],
      immutableFacts: [],
      unresolved: [],
      originalText: '',
      sectionMap: {},
      meta: {
        decomposedAt: new Date().toISOString(),
        provenanceTier
      }
    }
  }

  const sectionMap = extractSectionMap(text)
  const sections = collectStructuredSections(sectionMap)

  const characters = extractCharactersFromSections(sections, provenanceTier)
  const factions = extractFactionsFromSectionMap(sectionMap, sections, provenanceTier)
  const locations = extractLocationsFromSectionMap(sectionMap, provenanceTier)
  const items = extractItemsFromSectionMap(sectionMap, provenanceTier)
  const relations = extractRelationsFromSections(sections, provenanceTier)
  const immutableFacts = extractImmutableFactsFromSections(sections, provenanceTier)
  const unresolved = extractUnresolvedFromSections(sections, provenanceTier)

  const sectionMapRecord: Record<string, string> = {}
  for (const [key, value] of sectionMap.entries()) {
    sectionMapRecord[key] = value
  }

  return {
    characters,
    factions,
    locations,
    items,
    relations,
    immutableFacts,
    unresolved,
    originalText: text,
    sectionMap: sectionMapRecord,
    meta: {
      decomposedAt: new Date().toISOString(),
      provenanceTier
    }
  }
}

export { type StructuredBriefSections } from './summarize-chat-for-generation-structured-parser.ts'
export { type GenerationBriefCharacterCard } from './generation-brief-template.ts'
