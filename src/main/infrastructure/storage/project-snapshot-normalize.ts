import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import type { ShortDramaConstitutionDto } from '../../../shared/contracts/intake.ts'
import type { ProjectSnapshotDto } from '../../../shared/contracts/project.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineBlockDto,
  DetailedOutlineEpisodeBeatDto,
  DetailedOutlineSectionDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  OutlineEpisodeDto,
  ScreenplaySceneBlockDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow.ts'
import type { EpisodeControlCardDto } from '../../../shared/contracts/workflow.ts'
import { buildEntityStoreFromDecomposition } from '../../../shared/domain/entities/build-entity-store-from-decomposition.ts'
import { draftsToMasterEntities } from '../../../shared/domain/entities/character-draft-mapper.ts'
import { normalizeEntityStore } from '../../../shared/domain/entities/entity-normalizers.ts'
import { syncFactionSeatCharacters } from '../../../shared/domain/entities/faction-seat-characters.ts'
import { normalizeShortDramaConstitution } from '../../../shared/domain/short-drama/short-drama-constitution.ts'
import { normalizeEpisodeControlCard } from '../../../shared/domain/short-drama/episode-control-card.ts'
import { resolvePersistedGenerationTruth } from '../../../shared/domain/workflow/persisted-generation-truth.ts'
import { deriveProjectCharacterBlocks } from '../../../shared/domain/workflow/planning-blocks.ts'
import { deriveStage } from '../../../shared/domain/workflow/stage-derivation.ts'
import { decomposeFreeformInput } from '../../application/workspace/decompose-chat-for-generation.ts'

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : []
}

function asPositiveInteger(value: unknown, fallback: number): number {
  const next = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(next) || next <= 0) return fallback
  return Math.floor(next)
}

function normalizeRoleLayer(value: unknown): CharacterDraftDto['roleLayer'] | undefined {
  return value === 'core' || value === 'active' || value === 'functional' ? value : undefined
}

function normalizeIntegerArray(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined
  const normalized = value.map((item) => asPositiveInteger(item, 0)).filter((item) => item > 0)
  return normalized.length > 0 ? [...new Set(normalized)] : undefined
}

function normalizeStoryIntent(
  storyIntent: StoryIntentPackageDto | null
): StoryIntentPackageDto | null {
  if (!storyIntent) return null

  return {
    ...storyIntent,
    officialKeyCharacters: asStringArray(storyIntent.officialKeyCharacters),
    lockedCharacterNames: asStringArray(storyIntent.lockedCharacterNames),
    themeAnchors: asStringArray(storyIntent.themeAnchors),
    worldAnchors: asStringArray(storyIntent.worldAnchors),
    relationAnchors: asStringArray(storyIntent.relationAnchors),
    dramaticMovement: asStringArray(storyIntent.dramaticMovement),
    shortDramaConstitution: normalizeShortDramaConstitution(
      storyIntent.shortDramaConstitution as ShortDramaConstitutionDto | null | undefined
    )
  }
}

function normalizeEpisodeControlCardShape(
  card: EpisodeControlCardDto | null | undefined
): EpisodeControlCardDto | undefined {
  return normalizeEpisodeControlCard(card) ?? undefined
}

function normalizeCharacterDraft(character: CharacterDraftDto): CharacterDraftDto {
  return {
    ...character,
    name: asString(character.name),
    biography: asString(character.biography),
    publicMask: asString(character.publicMask),
    hiddenPressure: asString(character.hiddenPressure),
    fear: asString(character.fear),
    protectTarget: asString(character.protectTarget),
    conflictTrigger: asString(character.conflictTrigger),
    advantage: asString(character.advantage),
    weakness: asString(character.weakness),
    goal: asString(character.goal),
    arc: asString(character.arc),
    masterEntityId: character.masterEntityId ? asString(character.masterEntityId) : undefined,
    roleLayer: normalizeRoleLayer(character.roleLayer),
    activeBlockNos: normalizeIntegerArray(character.activeBlockNos)
  }
}

function normalizeCharacterDrafts(value: unknown): CharacterDraftDto[] {
  return Array.isArray(value)
    ? value.map((item) => normalizeCharacterDraft((item ?? {}) as CharacterDraftDto))
    : []
}

function normalizeScreenplayScene(
  scene: ScreenplaySceneBlockDto,
  fallbackSceneNo: number
): ScreenplaySceneBlockDto {
  return {
    ...scene,
    sceneNo: asPositiveInteger(scene.sceneNo, fallbackSceneNo),
    sceneCode: scene.sceneCode ? asString(scene.sceneCode) : undefined,
    sceneHeading: scene.sceneHeading ? asString(scene.sceneHeading) : undefined,
    characterRoster: Array.isArray(scene.characterRoster)
      ? scene.characterRoster.filter((item): item is string => typeof item === 'string')
      : undefined,
    body: scene.body ? asString(scene.body) : undefined,
    location: scene.location ? asString(scene.location) : undefined,
    timeOfDay: scene.timeOfDay ? asString(scene.timeOfDay) : undefined,
    setup: scene.setup ? asString(scene.setup) : undefined,
    tension: scene.tension ? asString(scene.tension) : undefined,
    hookEnd: scene.hookEnd ? asString(scene.hookEnd) : undefined
  }
}

function normalizeEpisodeBeat(
  beat: DetailedOutlineEpisodeBeatDto,
  fallbackEpisodeNo: number
): DetailedOutlineEpisodeBeatDto {
  return {
    ...beat,
    episodeNo: asPositiveInteger(beat.episodeNo, fallbackEpisodeNo),
    summary: asString(beat.summary),
    sceneByScene: Array.isArray(beat.sceneByScene)
      ? beat.sceneByScene.map((scene, index) => normalizeScreenplayScene(scene, index + 1))
      : undefined,
    episodeControlCard: normalizeEpisodeControlCardShape(beat.episodeControlCard)
  }
}

function normalizeOutlineEpisode(
  episode: OutlineEpisodeDto,
  fallbackEpisodeNo: number
): OutlineEpisodeDto {
  return {
    ...episode,
    episodeNo: asPositiveInteger(episode.episodeNo, fallbackEpisodeNo),
    summary: asString(episode.summary),
    sceneByScene: Array.isArray(episode.sceneByScene)
      ? episode.sceneByScene.map((scene, index) => normalizeScreenplayScene(scene, index + 1))
      : undefined
  }
}

function normalizeOutlineDraft(outline: OutlineDraftDto | null): OutlineDraftDto | null {
  if (!outline) return null

  return {
    ...outline,
    title: asString(outline.title),
    genre: asString(outline.genre),
    theme: asString(outline.theme),
    mainConflict: asString(outline.mainConflict),
    protagonist: asString(outline.protagonist),
    summary: asString(outline.summary),
    planningUnitEpisodes:
      typeof outline.planningUnitEpisodes === 'number' && outline.planningUnitEpisodes > 0
        ? Math.floor(outline.planningUnitEpisodes)
        : undefined,
    summaryEpisodes: Array.isArray(outline.summaryEpisodes)
      ? outline.summaryEpisodes.map((episode, index) => normalizeOutlineEpisode(episode, index + 1))
      : [],
    outlineBlocks: Array.isArray(outline.outlineBlocks)
      ? outline.outlineBlocks.map((block, index) => ({
          ...block,
          blockNo: asPositiveInteger(block.blockNo, index + 1),
          label: asString(block.label),
          startEpisode: asPositiveInteger(block.startEpisode, 1),
          endEpisode: asPositiveInteger(block.endEpisode, asPositiveInteger(block.startEpisode, 1)),
          summary: asString(block.summary),
          episodes: Array.isArray(block.episodes)
            ? block.episodes.map((episode, episodeIndex) =>
                normalizeOutlineEpisode(episode, episodeIndex + 1)
              )
            : []
        }))
      : outline.outlineBlocks,
    facts: Array.isArray(outline.facts) ? outline.facts.map((fact) => ({ ...fact })) : []
  }
}

function normalizeDetailedOutlineSection(
  section: DetailedOutlineSectionDto,
  fallbackSectionNo: number
): DetailedOutlineSectionDto {
  return {
    ...section,
    sectionNo: asPositiveInteger(section.sectionNo, fallbackSectionNo),
    title: section.title ? asString(section.title) : undefined,
    act: section.act ? asString(section.act) : undefined,
    startEpisode:
      section.startEpisode !== undefined
        ? asPositiveInteger(section.startEpisode, fallbackSectionNo)
        : undefined,
    endEpisode:
      section.endEpisode !== undefined
        ? asPositiveInteger(
            section.endEpisode,
            section.startEpisode !== undefined
              ? asPositiveInteger(section.startEpisode, fallbackSectionNo)
              : fallbackSectionNo
          )
        : undefined,
    summary: section.summary ? asString(section.summary) : undefined,
    hookType: section.hookType ? asString(section.hookType) : undefined,
    episodeBeats: Array.isArray(section.episodeBeats)
      ? section.episodeBeats.map((beat, index) => normalizeEpisodeBeat(beat, index + 1))
      : undefined
  }
}

function normalizeDetailedOutlineBlocks(value: unknown): DetailedOutlineBlockDto[] {
  return Array.isArray(value)
    ? value.map((block, index) => {
        const draft = (block ?? {}) as DetailedOutlineBlockDto
        return {
          ...draft,
          blockNo: asPositiveInteger(draft.blockNo, index + 1),
          startEpisode: asPositiveInteger(draft.startEpisode, 1),
          endEpisode: asPositiveInteger(draft.endEpisode, asPositiveInteger(draft.startEpisode, 1)),
          summary: draft.summary ? asString(draft.summary) : undefined,
          episodeBeats: Array.isArray(draft.episodeBeats)
            ? draft.episodeBeats.map((beat, beatIndex) => normalizeEpisodeBeat(beat, beatIndex + 1))
            : undefined,
          sections: Array.isArray(draft.sections)
            ? draft.sections.map((section, sectionIndex) =>
                normalizeDetailedOutlineSection(section, sectionIndex + 1)
              )
            : undefined
        }
      })
    : []
}

function normalizeDetailedOutlineSegments(value: unknown): DetailedOutlineSegmentDto[] {
  return Array.isArray(value)
    ? value.map((segment) => {
        const draft = (segment ?? {}) as DetailedOutlineSegmentDto
        return {
          ...draft,
          title: draft.title ? asString(draft.title) : undefined,
          content: asString(draft.content),
          hookType: asString(draft.hookType),
          episodeBeats: Array.isArray(draft.episodeBeats)
            ? draft.episodeBeats.map((beat, index) => normalizeEpisodeBeat(beat, index + 1))
            : undefined
        }
      })
    : []
}

function normalizeScriptDraft(value: unknown): ScriptSegmentDto[] {
  return Array.isArray(value) ? value.map((segment) => ({ ...(segment as ScriptSegmentDto) })) : []
}

function isEntityStoreEmpty(entityStore: ProjectSnapshotDto['entityStore']): boolean {
  return (
    entityStore.characters.length === 0 &&
    entityStore.factions.length === 0 &&
    entityStore.locations.length === 0 &&
    entityStore.items.length === 0 &&
    entityStore.relations.length === 0
  )
}

function mergeCharacterDraftsIntoEntityStore(input: {
  projectId: string
  entityStore: ProjectSnapshotDto['entityStore']
  characterDrafts: CharacterDraftDto[]
}): ProjectSnapshotDto['entityStore'] {
  if (input.characterDrafts.length === 0) {
    return input.entityStore
  }

  const mergedCharacters = draftsToMasterEntities(input.characterDrafts, {
    projectId: input.projectId,
    entityStore: input.entityStore,
    createIfNotFound: true
  })
  const charactersById = new Map(
    input.entityStore.characters.map((character) => [character.id, character])
  )

  for (const character of mergedCharacters) {
    charactersById.set(character.id, character)
  }

  return normalizeEntityStore(
    syncFactionSeatCharacters({
      ...normalizeEntityStore(input.entityStore),
      characters: [...charactersById.values()]
    })
  )
}

function backfillLegacyEntityStore(input: {
  project: ProjectSnapshotDto
  normalizedCharacterDrafts: CharacterDraftDto[]
}): ProjectSnapshotDto['entityStore'] {
  const normalizedEntityStore = normalizeEntityStore(input.project.entityStore)
  const syncedEntityStore = normalizeEntityStore(syncFactionSeatCharacters(normalizedEntityStore))
  if (!isEntityStoreEmpty(normalizedEntityStore)) {
    return mergeCharacterDraftsIntoEntityStore({
      projectId: input.project.id,
      entityStore: syncedEntityStore,
      characterDrafts: input.normalizedCharacterDrafts
    })
  }

  const generationBriefText = input.project.storyIntent?.generationBriefText?.trim() || ''
  if (!generationBriefText) {
    return normalizedEntityStore
  }

  const derivedEntityStore = buildEntityStoreFromDecomposition({
    projectId: input.project.id,
    decomposition: decomposeFreeformInput({
      text: generationBriefText,
      provenanceTier: 'user_declared'
    }),
    existingStore: syncedEntityStore
  })

  return mergeCharacterDraftsIntoEntityStore({
    projectId: input.project.id,
    entityStore: derivedEntityStore,
    characterDrafts: input.normalizedCharacterDrafts
  })
}

export function normalizeProjectSnapshot(project: ProjectSnapshotDto): ProjectSnapshotDto {
  const normalizedOutlineDraft = normalizeOutlineDraft(project.outlineDraft ?? null)
  const normalizedCharacterDrafts = normalizeCharacterDrafts(project.characterDrafts)
  const normalizedScriptDraft = normalizeScriptDraft(project.scriptDraft)
  const normalizedEntityStore = backfillLegacyEntityStore({
    project,
    normalizedCharacterDrafts
  })
  const generationTruth = resolvePersistedGenerationTruth({
    generationStatus: project.generationStatus ?? null,
    scriptFailureResolution: project.scriptFailureResolution ?? null,
    scriptDraft: normalizedScriptDraft
  })

  const normalizedProject: ProjectSnapshotDto = {
    ...project,
    chatMessages: Array.isArray(project.chatMessages) ? [...project.chatMessages] : [],
    generationStatus: project.generationStatus ?? null,
    storyIntent: normalizeStoryIntent(project.storyIntent ?? null),
    entityStore: normalizedEntityStore,
    outlineDraft: normalizedOutlineDraft,
    characterDrafts: normalizedCharacterDrafts,
    activeCharacterBlocks: deriveProjectCharacterBlocks({
      outline: normalizedOutlineDraft,
      characters: normalizedCharacterDrafts
    }),
    detailedOutlineBlocks: normalizeDetailedOutlineBlocks(project.detailedOutlineBlocks),
    detailedOutlineSegments: normalizeDetailedOutlineSegments(project.detailedOutlineSegments),
    scriptDraft: normalizedScriptDraft,
    scriptProgressBoard: project.scriptProgressBoard ?? null,
    scriptFailureResolution: project.scriptFailureResolution ?? null,
    scriptRuntimeFailureHistory: Array.isArray(project.scriptRuntimeFailureHistory)
      ? project.scriptRuntimeFailureHistory.filter(
          (item): item is string => typeof item === 'string'
        )
      : [],
    visibleResult: project.visibleResult ?? generationTruth.visibleResult,
    formalRelease: project.formalRelease ?? generationTruth.formalRelease
  }

  return {
    ...normalizedProject,
    stage: deriveStage(normalizedProject)
  }
}
