/**
 * Load-Bearing Role/Entity Analysis
 *
 * First slice (T13): rule/contract-driven annotation of batch contexts.
 * Uses only existing structured inputs — no ML/heuristic scoring.
 *
 * Rule inputs used:
 * - storyContract.characterSlots (protagonist/antagonist/heroine/mentor)
 * - storyContract.eventSlots (finalePayoff/antagonistPressure/relationshipShift/healingTechnique/themeRealization)
 * - storyContract.requirements (requirement flags)
 * - storyContract.hardFacts / softFacts
 * - userAnchorLedger (anchorNames, protectedFacts, heroineRequired)
 * - relationAnchors / worldAnchors from storyIntent
 * - activeCharacterBlocks (active per block)
 * - characterDrafts (roleLayer, goals, pressures)
 * - entityStore (master entities with roleLayer)
 */

import type { CharacterDraftDto, CharacterBlockDto } from '../../contracts/workflow.ts'
import type { StoryContractDto, UserAnchorLedgerDto } from '../../contracts/story-contract.ts'
import type { StoryIntentPackageDto } from '../../contracts/intake.ts'
import type { ProjectEntityStoreDto } from '../../contracts/entities.ts'

// ---------------------------------------------------------------------------
// Annotation types
// ---------------------------------------------------------------------------

export const LOAD_BEARING_CATEGORIES = [
  'narrative_carrier',
  'conflict_driver',
  'relationship_lever',
  'theme_fulfiller',
  'plot_anchor',
  'pressure_point'
] as const

export type LoadBearingCategory = (typeof LOAD_BEARING_CATEGORIES)[number]

export interface LoadBearingRoleAnnotation {
  name: string
  /** Human-readable explanation of WHY this role is load-bearing in this batch */
  reason: string
  category: LoadBearingCategory
  /**
   * Optional: which episodes in this batch this role is load-bearing.
   * Omission means "applies to all episodes in batch".
   */
  episodeNos?: number[]
}

export interface LoadBearingEntityAnnotation {
  entityId: string
  name: string
  reason: string
  category: LoadBearingCategory
  episodeNos?: number[]
}

export interface LoadBearingAnnotations {
  roles: LoadBearingRoleAnnotation[]
  entities: LoadBearingEntityAnnotation[]
  /**
   * Key narrative threads that must be carried in this batch.
   * Derived from eventSlots and requirements.
   */
  narrativeThreads: Array<{
    thread: string
    reason: string
  }>
}

// ---------------------------------------------------------------------------
// Rule-driven analyzers
// ---------------------------------------------------------------------------

/**
 * Analyzes which roles are load-bearing for a given batch of episodes.
 *
 * Rules (contract-driven, no ML):
 * 1. storyContract characterSlots are load-bearing (narrative_carrier)
 * 2. Protagonist drives main conflict (conflict_driver)
 * 3. Antagonist creates antagonistPressure (conflict_driver)
 * 4. Heroine is load-bearing if heroineRequired (relationship_lever)
 * 5. Mentor is load-bearing if present (theme_fulfiller)
 * 6. Characters in relationAnchors are load-bearing (relationship_lever)
 * 7. Characters bound to hardFacts are load-bearing (plot_anchor)
 * 8. Characters with activeBlockNos overlapping this batch are load-bearing (pressure_point)
 */
export function analyzeLoadBearingRoles(input: {
  storyContract: StoryContractDto
  userAnchorLedger: UserAnchorLedgerDto
  storyIntent?: StoryIntentPackageDto | null
  characters: CharacterDraftDto[]
  activeCharacterBlocks?: CharacterBlockDto[]
  startEpisode: number
  endEpisode: number
}): LoadBearingRoleAnnotation[] {
  const annotations: LoadBearingRoleAnnotation[] = []
  const addedNames = new Set<string>()

  const addAnnotation = (annotation: LoadBearingRoleAnnotation): void => {
    if (!addedNames.has(annotation.name)) {
      annotations.push(annotation)
      addedNames.add(annotation.name)
    }
  }

  const { storyContract, userAnchorLedger, storyIntent, characters, activeCharacterBlocks } = input
  const { characterSlots, eventSlots, requirements, hardFacts } = storyContract

  // Rule 1: Character slot roles are narrative carriers
  if (characterSlots.protagonist) {
    addAnnotation({
      name: characterSlots.protagonist,
      reason: '主角槽位：承担主线冲突推进',
      category: 'narrative_carrier'
    })
  }
  if (characterSlots.antagonist) {
    addAnnotation({
      name: characterSlots.antagonist,
      reason: '对手槽位：制造主线压力与对抗',
      category: 'narrative_carrier'
    })
  }
  if (characterSlots.heroine && userAnchorLedger.heroineRequired) {
    addAnnotation({
      name: characterSlots.heroine,
      reason: '情感槽位：用户锚定情感对象，关系线必须经由她展开',
      category: 'relationship_lever'
    })
  }
  if (characterSlots.mentor) {
    addAnnotation({
      name: characterSlots.mentor,
      reason: '导师槽位：主题/成长线关键角色',
      category: 'theme_fulfiller'
    })
  }

  // Rule 2-3: Conflict drivers from eventSlots
  if (eventSlots.antagonistPressure && characterSlots.antagonist) {
    addAnnotation({
      name: characterSlots.antagonist,
      reason: `对手压力事件：${eventSlots.antagonistPressure}`,
      category: 'conflict_driver'
    })
  }

  if (requirements.requireAntagonistLoveConflict && characterSlots.antagonist) {
    addAnnotation({
      name: characterSlots.antagonist,
      reason: `对手情感争夺需求：${eventSlots.antagonistLoveConflict || '对手对主角所爱持续施压或争夺'}`,
      category: 'conflict_driver'
    })
  }

  // Rule 4: Relationship lever from eventSlots
  if (eventSlots.relationshipShift) {
    // Find characters mentioned in relationshipShift
    const relChars = characters.filter(
      (c) =>
        eventSlots.relationshipShift!.includes(c.name) ||
        c.goal.includes(eventSlots.relationshipShift!)
    )
    for (const char of relChars) {
      addAnnotation({
        name: char.name,
        reason: `关系转折承载：${eventSlots.relationshipShift}`,
        category: 'relationship_lever'
      })
    }
  }

  // Rule 5: Theme fulfillers
  if (eventSlots.themeRealization) {
    // Characters whose goals align with theme
    const themeChars = characters.filter(
      (c) =>
        c.goal.includes(eventSlots.themeRealization!) ||
        c.arc.includes(eventSlots.themeRealization!)
    )
    for (const char of themeChars) {
      addAnnotation({
        name: char.name,
        reason: `主题兑现：${eventSlots.themeRealization}`,
        category: 'theme_fulfiller'
      })
    }
  }

  // Rule 6: Characters in relationAnchors from storyIntent
  if (storyIntent?.relationAnchors?.length) {
    for (const anchor of storyIntent.relationAnchors) {
      const matchedChars = characters.filter(
        (c) => anchor.includes(c.name) || c.goal.includes(anchor) || c.arc.includes(anchor)
      )
      for (const char of matchedChars) {
        addAnnotation({
          name: char.name,
          reason: `关系锚定：${anchor}`,
          category: 'relationship_lever'
        })
      }
    }
  }

  // Rule 7: Plot anchors from hardFacts
  if (hardFacts?.length) {
    for (const fact of hardFacts) {
      const matchedChars = characters.filter(
        (c) =>
          fact.includes(c.name) ||
          c.goal.includes(fact) ||
          c.hiddenPressure.includes(fact) ||
          c.conflictTrigger.includes(fact)
      )
      for (const char of matchedChars) {
        addAnnotation({
          name: char.name,
          reason: `硬事实绑定：${fact}`,
          category: 'plot_anchor'
        })
      }
    }
  }

  // Rule 8: Pressure points from activeCharacterBlocks
  if (activeCharacterBlocks?.length) {
    for (const block of activeCharacterBlocks) {
      // Check if block overlaps with this batch's episode range
      if (block.startEpisode <= input.endEpisode && block.endEpisode >= input.startEpisode) {
        for (const char of block.characters) {
          // Skip if already annotated as narrative_carrier (higher priority)
          const alreadyAnnotated = annotations.find(
            (a) => a.name === char.name && a.category === 'narrative_carrier'
          )
          if (!alreadyAnnotated) {
            addAnnotation({
              name: char.name,
              reason: `当前块活跃角色：第${block.startEpisode}-${block.endEpisode}集`,
              category: 'pressure_point'
            })
          }
        }
      }
    }
  }

  return annotations
}

/**
 * Analyzes which master entities are load-bearing for a given batch.
 * Uses entityStore + storyContract facts.
 */
export function analyzeLoadBearingEntities(input: {
  storyContract: StoryContractDto
  userAnchorLedger: UserAnchorLedgerDto
  storyIntent?: StoryIntentPackageDto | null
  entityStore: ProjectEntityStoreDto
  startEpisode: number
  endEpisode: number
}): LoadBearingEntityAnnotation[] {
  const annotations: LoadBearingEntityAnnotation[] = []
  const addedIds = new Set<string>()

  const addAnnotation = (annotation: LoadBearingEntityAnnotation): void => {
    if (!addedIds.has(annotation.entityId)) {
      annotations.push(annotation)
      addedIds.add(annotation.entityId)
    }
  }

  const { storyContract, storyIntent, entityStore } = input
  const { characterSlots, eventSlots, hardFacts } = storyContract

  // Characters from entity store
  const characters = entityStore.characters || []

  // Core role characters from entity store
  for (const char of characters) {
    if (char.roleLayer === 'core') {
      addAnnotation({
        entityId: char.id,
        name: char.name,
        reason: `核心层角色（core layer）：${char.summary || '承担核心叙事功能'}`,
        category: 'narrative_carrier'
      })
    }
  }

  // Character slot mappings
  const slotNames = [
    characterSlots.protagonist,
    characterSlots.antagonist,
    characterSlots.heroine,
    characterSlots.mentor
  ].filter(Boolean)

  for (const char of characters) {
    if (slotNames.includes(char.name)) {
      addAnnotation({
        entityId: char.id,
        name: char.name,
        reason: `角色槽位匹配：${char.name}`,
        category: 'narrative_carrier'
      })
    }
  }

  // Factions/locations bound to conflict
  for (const faction of entityStore.factions || []) {
    if (hardFacts?.some((f) => faction.name.includes(f) || f.includes(faction.name))) {
      addAnnotation({
        entityId: faction.id,
        name: faction.name,
        reason: `势力绑定硬事实：${hardFacts.find((f) => faction.name.includes(f) || f.includes(faction.name))}`,
        category: 'plot_anchor'
      })
    }
  }

  for (const location of entityStore.locations || []) {
    if (hardFacts?.some((f) => location.name.includes(f) || f.includes(location.name))) {
      addAnnotation({
        entityId: location.id,
        name: location.name,
        reason: `地点绑定硬事实：${hardFacts.find((f) => location.name.includes(f) || f.includes(location.name))}`,
        category: 'plot_anchor'
      })
    }
  }

  // Items bound to plot
  for (const item of entityStore.items || []) {
    if (hardFacts?.some((f) => item.name.includes(f) || f.includes(item.name))) {
      addAnnotation({
        entityId: item.id,
        name: item.name,
        reason: `道具绑定硬事实：${hardFacts.find((f) => item.name.includes(f) || f.includes(item.name))}`,
        category: 'plot_anchor'
      })
    }
  }

  // Relations that are load-bearing (from relationAnchors)
  if (storyIntent?.relationAnchors?.length || eventSlots.relationshipShift) {
    for (const rel of entityStore.relations || []) {
      const relText = `${rel.name} ${rel.summary}`
      const isMentioned =
        storyIntent?.relationAnchors?.some((a) => relText.includes(a) || a.includes(rel.name)) ||
        (eventSlots.relationshipShift && relText.includes(eventSlots.relationshipShift))

      if (isMentioned) {
        addAnnotation({
          entityId: rel.id,
          name: rel.name,
          reason: `关系锚定：${rel.summary || rel.relationType}`,
          category: 'relationship_lever'
        })
      }
    }
  }

  return annotations
}

/**
 * Derives narrative threads that must be carried in this batch.
 */
export function deriveNarrativeThreads(input: {
  storyContract: StoryContractDto
  userAnchorLedger: UserAnchorLedgerDto
  storyIntent?: StoryIntentPackageDto | null
}): Array<{ thread: string; reason: string }> {
  const threads: Array<{ thread: string; reason: string }> = []
  const { storyContract, userAnchorLedger, storyIntent } = input
  const { eventSlots, requirements } = storyContract

  if (eventSlots.finalePayoff) {
    threads.push({
      thread: eventSlots.finalePayoff,
      reason: '终局必须回收的事件线'
    })
  }

  if (requirements.requireAntagonistContinuity && eventSlots.antagonistPressure) {
    threads.push({
      thread: eventSlots.antagonistPressure,
      reason: '对手贯穿压力线'
    })
  }

  if (requirements.requireAntagonistLoveConflict && eventSlots.antagonistLoveConflict) {
    threads.push({
      thread: eventSlots.antagonistLoveConflict,
      reason: '对手情感争夺线'
    })
  }

  if (requirements.requireRelationshipShift && eventSlots.relationshipShift) {
    threads.push({
      thread: eventSlots.relationshipShift,
      reason: '关系转折线'
    })
  }

  if (requirements.requireHealingTechnique && eventSlots.healingTechnique) {
    threads.push({
      thread: eventSlots.healingTechnique,
      reason: '关键救治技术线'
    })
  }

  if (requirements.requireThemeRealization && eventSlots.themeRealization) {
    threads.push({
      thread: eventSlots.themeRealization,
      reason: '主题兑现线'
    })
  }

  if (userAnchorLedger.heroineRequired) {
    threads.push({
      thread: userAnchorLedger.heroineHint || '女主情感线',
      reason: '用户锚定的情感对象线'
    })
  }

  // World anchors from storyIntent are narrative threads
  if (storyIntent?.worldAnchors?.length) {
    for (const anchor of storyIntent.worldAnchors) {
      threads.push({
        thread: anchor,
        reason: '世界观锚定线'
      })
    }
  }

  // Relation anchors from storyIntent that aren't already covered
  if (storyIntent?.relationAnchors?.length) {
    for (const anchor of storyIntent.relationAnchors) {
      const alreadyCovered = threads.some(
        (t) => t.thread === anchor || t.reason.includes('关系转折') || t.reason.includes('情感')
      )
      if (!alreadyCovered) {
        threads.push({
          thread: anchor,
          reason: '关系锚定线'
        })
      }
    }
  }

  return threads
}

/**
 * Full load-bearing analysis for a batch.
 */
export function analyzeLoadBearing(input: {
  storyContract: StoryContractDto
  userAnchorLedger: UserAnchorLedgerDto
  storyIntent?: StoryIntentPackageDto | null
  characters: CharacterDraftDto[]
  activeCharacterBlocks?: CharacterBlockDto[]
  entityStore?: ProjectEntityStoreDto
  startEpisode: number
  endEpisode: number
}): LoadBearingAnnotations {
  const roles = analyzeLoadBearingRoles({
    storyContract: input.storyContract,
    userAnchorLedger: input.userAnchorLedger,
    storyIntent: input.storyIntent,
    characters: input.characters,
    activeCharacterBlocks: input.activeCharacterBlocks,
    startEpisode: input.startEpisode,
    endEpisode: input.endEpisode
  })

  const entities: LoadBearingEntityAnnotation[] = input.entityStore
    ? analyzeLoadBearingEntities({
        storyContract: input.storyContract,
        userAnchorLedger: input.userAnchorLedger,
        storyIntent: input.storyIntent,
        entityStore: input.entityStore,
        startEpisode: input.startEpisode,
        endEpisode: input.endEpisode
      })
    : []

  const narrativeThreads = deriveNarrativeThreads({
    storyContract: input.storyContract,
    userAnchorLedger: input.userAnchorLedger,
    storyIntent: input.storyIntent
  })

  return { roles, entities, narrativeThreads }
}
