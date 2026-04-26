import type { StoryIntentPackageDto } from '../../contracts/intake.ts'
import type { ProjectEntityStoreDto } from '../../contracts/entities.ts'
import type { CharacterDraftDto } from '../../contracts/workflow.ts'
import type { FactionMatrixDto } from '../../contracts/faction-matrix.ts'
import type {
  CharacterRosterDto,
  CharacterRosterEntryDto,
  CharacterRosterLayer,
  StoryFoundationDto,
  WorldBibleDto
} from '../../contracts/world-building.ts'

function cleanText(value: string | undefined | null): string {
  return (value || '').replace(/\s+/g, ' ').trim()
}

function uniqueTexts(values: Array<string | undefined | null>, limit: number): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const value of values) {
    const text = cleanText(value)
    if (!text || seen.has(text)) continue
    seen.add(text)
    result.push(text)
    if (result.length >= limit) break
  }
  return result
}

function extractBriefSection(brief: string, sectionName: string): string {
  const escaped = sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = brief.match(new RegExp(`【${escaped}】([\\s\\S]*?)(?=\\n【|$)`))
  return match?.[1]?.trim() || ''
}

function normalizeEpisodeCount(value: number | undefined | null): number {
  const next = Number(value || 0)
  if (!Number.isFinite(next) || next <= 0) return 10
  return Math.max(1, Math.min(120, Math.floor(next)))
}

function rosterLayerFromEntityLayer(
  layer: ProjectEntityStoreDto['characters'][number]['roleLayer']
): CharacterRosterLayer {
  if (layer === 'core') return 'core'
  if (layer === 'active') return 'active'
  return 'functional'
}

function rosterLayerFromDraft(character: CharacterDraftDto): CharacterRosterLayer {
  if (character.roleLayer === 'core' || character.depthLevel === 'core') return 'core'
  if (character.roleLayer === 'active' || character.depthLevel === 'mid') return 'active'
  return 'functional'
}

function fallbackWorldType(storyIntent: StoryIntentPackageDto): string {
  return cleanText(storyIntent.genre) || cleanText(storyIntent.marketProfile?.subgenre) || '待补'
}

export function deriveWorldBibleFromStoryIntent(storyIntent: StoryIntentPackageDto): WorldBibleDto {
  const brief = storyIntent.generationBriefText || ''
  const worldSection = extractBriefSection(brief, '世界观与故事背景')
  const conflict = cleanText(storyIntent.coreConflict)
  const synopsis = cleanText(storyIntent.storySynopsis?.logline)
  const worldAnchors = uniqueTexts(storyIntent.worldAnchors || [], 8)
  const relationAnchors = uniqueTexts(storyIntent.relationAnchors || [], 8)

  return {
    definition:
      cleanText(worldSection) ||
      worldAnchors.join('；') ||
      cleanText(storyIntent.sellingPremise) ||
      synopsis ||
      '待补',
    worldType: fallbackWorldType(storyIntent),
    eraAndSpace: worldAnchors[0] || cleanText(worldSection) || '待补',
    socialOrder: relationAnchors[0] || conflict || '待补',
    historicalWound:
      cleanText(storyIntent.storySynopsis?.protagonistCurrentDilemma) ||
      cleanText(storyIntent.coreDislocation) ||
      '待补',
    powerOrRuleSystem:
      cleanText(storyIntent.storySynopsis?.antagonistPressureMethod) ||
      cleanText(storyIntent.shortDramaConstitution?.worldViewBrief) ||
      '待补',
    coreResources: uniqueTexts(
      [
        cleanText(storyIntent.storySynopsis?.stageGoal),
        cleanText(storyIntent.emotionalPayoff),
        ...worldAnchors
      ],
      6
    ),
    taboosAndCosts: uniqueTexts(
      [
        cleanText(storyIntent.storySynopsis?.openingPressureEvent),
        cleanText(storyIntent.storySynopsis?.antagonistPressureMethod),
        cleanText(storyIntent.manualRequirementNotes)
      ],
      6
    ),
    shootableLocations: uniqueTexts([...worldAnchors, ...relationAnchors], 8),
    source: 'derived_from_story_intent'
  }
}

export function deriveCharacterRoster(input: {
  entityStore?: ProjectEntityStoreDto | null
  characterDrafts?: CharacterDraftDto[]
  factionMatrix?: FactionMatrixDto | null
  totalEpisodes?: number
}): CharacterRosterDto {
  const totalEpisodes = normalizeEpisodeCount(input.totalEpisodes)
  const minimumRoleSlots = Math.ceil(totalEpisodes / 2)
  const standardRoleSlots = Math.ceil(totalEpisodes * 0.65)
  const entriesByName = new Map<string, CharacterRosterEntryDto>()
  const factionNameById = new Map(
    (input.entityStore?.factions || []).map((faction) => [faction.id, faction.name])
  )
  const locationNameById = new Map(
    (input.entityStore?.locations || []).map((location) => [location.id, location.name])
  )

  for (const character of input.entityStore?.characters || []) {
    const name = cleanText(character.name)
    if (!name || entriesByName.has(name)) continue
    const layer = rosterLayerFromEntityLayer(character.roleLayer)
    entriesByName.set(name, {
      id: character.id,
      name,
      layer: character.identityMode === 'slot' ? 'crowd' : layer,
      identityMode: character.identityMode === 'slot' ? 'slot' : 'named',
      factionName: factionNameById.get(character.linkedFactionIds[0] || ''),
      fieldName: locationNameById.get(character.linkedLocationIds[0] || ''),
      duty: cleanText(character.currentFunction) || cleanText(character.summary) || '待补',
      needsFullProfile: layer === 'core' || layer === 'active',
      dialoguePotential: layer === 'core' || layer === 'active' ? 'recurring' : 'one_line',
      sourceEntityId: character.id
    })
  }

  for (const draft of input.characterDrafts || []) {
    const name = cleanText(draft.name)
    if (!name) continue
    const layer = rosterLayerFromDraft(draft)
    const existing = entriesByName.get(name)
    entriesByName.set(name, {
      id: existing?.id || draft.masterEntityId || `draft_${name}`,
      name,
      layer: existing?.layer || layer,
      identityMode: existing?.identityMode || 'named',
      factionName: existing?.factionName,
      fieldName: existing?.fieldName,
      duty: existing?.duty || cleanText(draft.plotFunction) || cleanText(draft.goal) || '待补',
      needsFullProfile: true,
      dialoguePotential: 'recurring',
      sourceEntityId: existing?.sourceEntityId || draft.masterEntityId
    })
  }

  for (const faction of input.factionMatrix?.factions || []) {
    for (const branch of faction.branches || []) {
      for (const placeholder of branch.characters || []) {
        const name = cleanText(placeholder.name)
        if (!name || entriesByName.has(name)) continue
        const layer: CharacterRosterLayer =
          placeholder.depthLevel === 'core'
            ? 'core'
            : placeholder.depthLevel === 'mid'
              ? 'active'
              : placeholder.roleInFaction === 'functional'
                ? 'crowd'
                : 'functional'
        entriesByName.set(name, {
          id: placeholder.id || `slot_${entriesByName.size + 1}`,
          name,
          layer,
          identityMode: placeholder.depthLevel === 'extra' ? 'slot' : 'named',
          factionName: faction.name,
          duty: cleanText(placeholder.plotFunction) || cleanText(placeholder.identity) || '待补',
          needsFullProfile: layer === 'core' || layer === 'active',
          dialoguePotential: layer === 'crowd' ? 'one_line' : 'recurring'
        })
      }
    }
  }

  const entries = [...entriesByName.values()]
  const actualRoleSlots = entries.length

  return {
    totalEpisodes,
    minimumRoleSlots,
    standardRoleSlots,
    actualRoleSlots,
    entries,
    scaleWarning:
      actualRoleSlots < minimumRoleSlots
        ? `${totalEpisodes}集项目角色位少于最低建议：${actualRoleSlots}/${minimumRoleSlots}`
        : undefined
  }
}

export function buildStoryFoundation(input: {
  storyIntent: StoryIntentPackageDto
  entityStore?: ProjectEntityStoreDto | null
  characterDrafts?: CharacterDraftDto[]
  factionMatrix?: FactionMatrixDto | null
  totalEpisodes?: number
}): StoryFoundationDto {
  const worldBible =
    input.storyIntent.worldBible || deriveWorldBibleFromStoryIntent(input.storyIntent)
  const factionMatrix = input.factionMatrix || input.storyIntent.factionMatrix || null
  const characterRoster = deriveCharacterRoster({
    entityStore: input.entityStore,
    characterDrafts: input.characterDrafts,
    factionMatrix,
    totalEpisodes: input.totalEpisodes
  })

  return {
    worldBible,
    factionMatrix,
    characterRoster
  }
}

export function attachStoryFoundationToIntent(input: {
  storyIntent: StoryIntentPackageDto
  entityStore?: ProjectEntityStoreDto | null
  characterDrafts?: CharacterDraftDto[]
  factionMatrix?: FactionMatrixDto | null
  totalEpisodes?: number
}): StoryIntentPackageDto {
  const storyFoundation = buildStoryFoundation(input)
  return {
    ...input.storyIntent,
    worldBible: storyFoundation.worldBible,
    factionMatrix: storyFoundation.factionMatrix,
    characterRoster: storyFoundation.characterRoster,
    storyFoundation
  }
}
