import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import { buildShortDramaConstitutionFromStoryIntent } from '../../../shared/domain/short-drama/short-drama-constitution.ts'
import { cleanPossibleName, normalizeAnchorName } from './summarize-chat-for-generation-shared.ts'

function toStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((v) => typeof v === 'string')
    .map((v) => v.trim())
    .filter(Boolean)
}

function toAnchorName(value: unknown): string {
  return normalizeAnchorName(toStringOrEmpty(value))
}

export function normalizeOutlineStoryIntent(
  input: unknown,
  _fallback?: StoryIntentPackageDto
): StoryIntentPackageDto {
  const obj = (
    input && typeof input === 'object' ? (input as Record<string, unknown>) : {}
  ) as Record<string, unknown>
  const nextOfficialKeyCharacters = toStringArray(obj.officialKeyCharacters)
    .map((item) => cleanPossibleName(item))
    .filter(Boolean)
  const nextLockedCharacterNames = toStringArray(obj.lockedCharacterNames)
    .map((item) => cleanPossibleName(item))
    .filter(Boolean)
  const baseStoryIntent = {
    titleHint: toStringOrEmpty(obj.titleHint) || '',
    genre: toStringOrEmpty(obj.genre) || '',
    tone: toStringOrEmpty(obj.tone) || '',
    audience: toStringOrEmpty(obj.audience) || '',
    sellingPremise: toStringOrEmpty(obj.sellingPremise) || '',
    coreDislocation: toStringOrEmpty(obj.coreDislocation) || '',
    emotionalPayoff: toStringOrEmpty(obj.emotionalPayoff) || '',
    protagonist: toAnchorName(obj.protagonist) || '',
    antagonist: toAnchorName(obj.antagonist) || '',
    coreConflict: toStringOrEmpty(obj.coreConflict) || '',
    endingDirection: toStringOrEmpty(obj.endingDirection) || '',
    officialKeyCharacters: nextOfficialKeyCharacters,
    lockedCharacterNames: nextLockedCharacterNames,
    themeAnchors: toStringArray(obj.themeAnchors),
    worldAnchors: toStringArray(obj.worldAnchors),
    relationAnchors: toStringArray(obj.relationAnchors),
    dramaticMovement: toStringArray(obj.dramaticMovement),
    manualRequirementNotes: toStringOrEmpty(obj.manualRequirementNotes) || '',
    freeChatFinalSummary: toStringOrEmpty(obj.freeChatFinalSummary) || '',
    generationBriefText: toStringOrEmpty(obj.generationBriefText) || ''
  }

  return {
    ...baseStoryIntent,
    shortDramaConstitution: buildShortDramaConstitutionFromStoryIntent(baseStoryIntent)
  }
}
