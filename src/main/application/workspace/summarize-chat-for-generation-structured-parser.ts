import type { GenerationBriefCharacterCard } from './generation-brief-template'
import {
  cleanPossibleName,
  splitBulletLines,
  splitNameList,
  toText,
  uniqueList
} from './summarize-chat-for-generation-shared'

export type StructuredBriefSections = {
  sectionMap: Map<string, string>
  characterCards: GenerationBriefCharacterCard[]
  relationSummary: string[]
  softUnderstanding: string[]
  pendingConfirmations: string[]
  protagonist: string
  antagonist: string
  explicitKeyCharacters: string[]
  keyCharacters: string[]
}

export function extractSectionMap(text: string): Map<string, string> {
  const matches = [...text.matchAll(/【([^】]+)】([\s\S]*?)(?=【[^】]+】|$)/g)]
  const map = new Map<string, string>()
  for (const match of matches) {
    const title = toText(match[1])
    const content = toText(match[2])
    if (title) map.set(title, content)
  }
  return map
}

export function extractStructuredBriefText(text: string): string {
  const lines = text.split('\n')
  const collected: string[] = []
  let started = false
  let currentSection = ''
  const bulletSections = new Set(['角色卡', '人物分层', '人物关系总梳理', '软理解', '待确认'])

  for (const rawLine of lines) {
    const line = rawLine.trimEnd()
    const trimmed = line.trim()
    if (!started) {
      if (trimmed.startsWith('【项目】')) {
        started = true
        currentSection = '项目'
        collected.push(trimmed)
      }
      continue
    }

    if (!trimmed) {
      collected.push('')
      continue
    }

    const sectionMatch = trimmed.match(/^【([^】]+)】/)
    if (sectionMatch) {
      currentSection = sectionMatch[1]
      collected.push(trimmed)
      continue
    }

    if (bulletSections.has(currentSection)) {
      if (trimmed.startsWith('- ')) {
        collected.push(trimmed)
        continue
      }
      break
    }

    if (/^(AI|你|用户|助手|系统)[:：]?$/.test(trimmed)) break
    collected.push(trimmed)
  }

  return collected.join('\n').trim()
}

export function parseCharacterCards(sectionText: string): GenerationBriefCharacterCard[] {
  return splitBulletLines(sectionText)
    .map((line) => {
      const [name, ...rest] = line.split('：')
      return {
        name: cleanPossibleName(name),
        summary: toText(rest.join('：'))
      }
    })
    .filter((item) => item.name && item.summary)
}

export function collectStructuredSections(sectionMap: Map<string, string>): StructuredBriefSections {
  const protagonist = toText(sectionMap.get('主角'))
  const antagonist = toText(sectionMap.get('对手'))
  const characterCards = parseCharacterCards(sectionMap.get('角色卡') || '')
  const relationSummary = splitBulletLines(sectionMap.get('人物关系总梳理') || '')
  const softUnderstanding = splitBulletLines(sectionMap.get('软理解') || '')
  const pendingConfirmations = splitBulletLines(sectionMap.get('待确认') || '')
  const explicitKeyCharacters = splitNameList(sectionMap.get('关键角色') || '')
  const knownNames = uniqueList([protagonist, antagonist, ...explicitKeyCharacters, ...characterCards.map((item) => item.name)], 8)
  const relationNames = uniqueList(
    relationSummary.flatMap((line) => knownNames.filter((name) => name && line.includes(name))),
    8
  )
  const cardNames = characterCards.map((item) => item.name)
  const keyCharacters = uniqueList(
    [protagonist, antagonist, ...explicitKeyCharacters, ...cardNames, ...relationNames].filter(Boolean),
    6
  )

  return {
    sectionMap,
    characterCards,
    relationSummary,
    softUnderstanding,
    pendingConfirmations,
    protagonist,
    antagonist,
    explicitKeyCharacters,
    keyCharacters
  }
}

export function findCharacterCard(
  cards: GenerationBriefCharacterCard[],
  name: string
): GenerationBriefCharacterCard | undefined {
  return cards.find((item) => item.name === name)
}
