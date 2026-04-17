import type { FormalFactProvenanceTier, FormalFactAuthorityType } from './formal-fact'

/**
 * Truth decomposition layer between freeform user input and downstream generation.
 *
 * This contract formalizes the decomposition of freeform input into structured
 * truth output that downstream stages (outline/character generation) can trust.
 *
 * Key principles:
 * - user_declared: explicitly stated by user
 * - ai_suggested: AI inferred with reasonable confidence but not yet confirmed
 * - system_inferred: derived from structured sections or context
 * - unresolved: items that need user confirmation before becoming facts
 */
export interface DecompositionSourceInfo {
  provenanceTier: FormalFactProvenanceTier
  originAuthorityType: FormalFactAuthorityType
  sourceSection?: string
  confidence: number
}

export interface DecompositionCharacter {
  name: string
  aliases: string[]
  roleHint?: 'protagonist' | 'antagonist' | 'supporting' | 'minor'
  summary?: string
  source: DecompositionSourceInfo
}

export interface DecompositionFaction {
  name: string
  factionType: 'sect' | 'clan' | 'organization' | 'court' | 'family' | 'other'
  memberNames: string[]
  summary?: string
  source: DecompositionSourceInfo
}

export interface DecompositionLocation {
  name: string
  locationType: 'region' | 'city' | 'site' | 'interior' | 'other'
  controllingFactionName?: string
  summary?: string
  source: DecompositionSourceInfo
}

export interface DecompositionItem {
  name: string
  itemType: 'artifact' | 'weapon' | 'evidence' | 'resource' | 'key' | 'other'
  ownerName?: string
  summary?: string
  source: DecompositionSourceInfo
}

export interface DecompositionRelation {
  fromName: string
  toName: string
  relationType:
    | 'alliance'
    | 'hostility'
    | 'kinship'
    | 'romance'
    | 'debt'
    | 'mastery'
    | 'ownership'
    | 'other'
  summary?: string
  source: DecompositionSourceInfo
}

export interface DecompositionImmutableFact {
  label: string
  description: string
  source: DecompositionSourceInfo
}

export interface DecompositionUnresolved {
  item: string
  ambiguity: string
  question: string
  source: DecompositionSourceInfo
}

/**
 * Full decomposition result from freeform input.
 * This is the canonical output of the truth decomposition layer.
 */
export interface DecompositionResult {
  /** Characters extracted from input */
  characters: DecompositionCharacter[]
  /** Factions/organizations/sects/clans extracted from input */
  factions: DecompositionFaction[]
  /** Locations extracted from input */
  locations: DecompositionLocation[]
  /** Key items/props extracted from input */
  items: DecompositionItem[]
  /** Relations between entities */
  relations: DecompositionRelation[]
  /** Immutable facts declared or strongly inferred */
  immutableFacts: DecompositionImmutableFact[]
  /** Items that need user confirmation before becoming facts */
  unresolved: DecompositionUnresolved[]
  /** Original text that was decomposed */
  originalText: string
  /** Sections extracted from structured brief format */
  sectionMap: Record<string, string>
  /** Metadata about the decomposition */
  meta: {
    decomposedAt: string
    provenanceTier: FormalFactProvenanceTier
  }
}

/**
 * Input for decomposing freeform text.
 */
export interface DecomposeInput {
  text: string
  existingEntities?: {
    knownCharacterNames?: string[]
    knownFactionNames?: string[]
    knownLocationNames?: string[]
    knownItemNames?: string[]
  }
  provenanceTier?: FormalFactProvenanceTier
}
