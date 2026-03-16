import { randomUUID } from 'crypto'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type { CharacterDraftDto, FormalFact } from '../../../shared/contracts/workflow'
import type { OutlineBundlePayload } from './generate-outline-and-characters-support'

export type OutlineFactCandidate = {
  label?: string
  description?: string
  level?: 'core' | 'supporting'
  linkedToPlot?: boolean
  linkedToTheme?: boolean
}

export function toDraftFacts(facts: OutlineFactCandidate[] | undefined): FormalFact[] {
  const now = new Date().toISOString()
  return (facts || [])
    .filter((f) => f.label?.trim() && f.description?.trim())
    .slice(0, 12)
    .map((fact) => ({
      id: randomUUID(),
      label: fact.label!.trim(),
      description: fact.description!.trim(),
      linkedToPlot: fact.linkedToPlot ?? true,
      linkedToTheme: fact.linkedToTheme ?? true,
      authorityType: 'ai_suggested',
      status: 'draft',
      level: fact.level ?? 'core',
      declaredBy: 'system',
      declaredStage: 'outline',
      createdAt: now,
      updatedAt: now
    }))
}

function scoreFactPriority(input: {
  fact: OutlineFactCandidate
  storyIntent: StoryIntentPackageDto
}): number {
  const text = `${input.fact.label} ${input.fact.description}`.toLowerCase()
  let score = input.fact.level === 'core' ? 40 : 10

  const protagonist = (input.storyIntent.protagonist || '').trim().toLowerCase()
  const antagonist = (input.storyIntent.antagonist || '').trim().toLowerCase()
  if (protagonist && text.includes(protagonist)) score += 50
  if (antagonist && text.includes(antagonist)) score += 35

  for (const name of input.storyIntent.officialKeyCharacters) {
    const normalized = name.trim().toLowerCase()
    if (normalized && text.includes(normalized)) score += 25
  }

  for (const anchor of [...input.storyIntent.relationAnchors, ...input.storyIntent.dramaticMovement]) {
    const normalized = anchor.trim().toLowerCase()
    if (normalized && text.includes(normalized)) score += 18
  }

  const conflictKeywords = ['冲突', '逼迫', '守护', '所爱', '宿敌', '危机', '反转', '亮出底牌', '关系', '钥匙']
  for (const keyword of conflictKeywords) {
    if (text.includes(keyword)) score += 12
  }

  const loreOnlyKeywords = ['道观', '境界', '世界观', '法器', '体系', '地名', '王母宫']
  const hasConflictWeight = conflictKeywords.some((keyword) => text.includes(keyword))
  if (!hasConflictWeight && loreOnlyKeywords.some((keyword) => text.includes(keyword))) score -= 15

  return score
}

export function prioritizeOutlineFacts(input: {
  facts: OutlineFactCandidate[]
  storyIntent: StoryIntentPackageDto
}): OutlineFactCandidate[] {
  return [...input.facts].sort((left, right) => {
    const scoreGap =
      scoreFactPriority({ fact: right, storyIntent: input.storyIntent }) -
      scoreFactPriority({ fact: left, storyIntent: input.storyIntent })
    if (scoreGap !== 0) return scoreGap
    return (left.label || '').localeCompare(right.label || '', 'zh-CN')
  })
}

function factLooksCovered(facts: OutlineFactCandidate[], keywords: string[]): boolean {
  const normalizedKeywords = keywords.map((keyword) => keyword.trim().toLowerCase()).filter(Boolean)
  if (normalizedKeywords.length === 0) return true
  return facts.some((fact) => {
    const text = `${fact.label} ${fact.description}`.toLowerCase()
    return normalizedKeywords.every((keyword) => text.includes(keyword))
  })
}

function buildEssentialFacts(input: {
  storyIntent: StoryIntentPackageDto
  outline: NonNullable<OutlineBundlePayload['outline']>
  characters: CharacterDraftDto[]
}): OutlineFactCandidate[] {
  const essentials: OutlineFactCandidate[] = []
  const protagonist = (input.storyIntent.protagonist || input.outline.protagonist || '').trim()
  const antagonist = (input.storyIntent.antagonist || '').trim()
  const conflict = (input.storyIntent.coreConflict || input.outline.mainConflict || '').trim()

  if (
    protagonist &&
    !factLooksCovered(input.outline.facts || [], [protagonist]) &&
    input.outline.protagonist?.trim()
  ) {
    essentials.push({
      label: `draft_${protagonist}身份与处境`,
      description: input.outline.protagonist.trim(),
      level: 'core',
      linkedToPlot: true,
      linkedToTheme: true
    })
  }

  if (
    antagonist &&
    !factLooksCovered(input.outline.facts || [], [antagonist]) &&
    conflict
  ) {
    essentials.push({
      label: `draft_${antagonist}施压线`,
      description: `${antagonist}是主角当前最直接的外部压力来源之一，正在把冲突推向${conflict}。`,
      level: 'core',
      linkedToPlot: true,
      linkedToTheme: false
    })
  }

  const relationAnchor = input.storyIntent.relationAnchors.find((anchor) => protagonist && anchor.includes(protagonist))
  if (relationAnchor && !factLooksCovered(input.outline.facts || [], [relationAnchor])) {
    essentials.push({
      label: 'draft_关键人物关系',
      description: relationAnchor,
      level: 'supporting',
      linkedToPlot: true,
      linkedToTheme: true
    })
  }

  const keyCharacter = input.characters.find((character) => character.name.trim() && character.biography?.trim())
  if (
    keyCharacter &&
    !factLooksCovered(input.outline.facts || [], [keyCharacter.name.trim()]) &&
    essentials.length < 4
  ) {
    essentials.push({
      label: `draft_${keyCharacter.name.trim()}人物锚点`,
      description: keyCharacter.biography.trim().slice(0, 120),
      level: 'supporting',
      linkedToPlot: true,
      linkedToTheme: true
    })
  }

  return essentials
}

export function mergeOutlineFacts(input: {
  generatedFacts: OutlineFactCandidate[]
  storyIntent: StoryIntentPackageDto
  outline: NonNullable<OutlineBundlePayload['outline']>
  characters: CharacterDraftDto[]
}): OutlineFactCandidate[] {
  const essentials = buildEssentialFacts({
    storyIntent: input.storyIntent,
    outline: input.outline,
    characters: input.characters
  })
  const merged = [...essentials, ...input.generatedFacts]
  const seen = new Set<string>()
  return merged.filter((fact) => {
    const label = fact.label?.trim()
    const description = fact.description?.trim()
    if (!label || !description) return false
    const key = `${label}::${description}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
