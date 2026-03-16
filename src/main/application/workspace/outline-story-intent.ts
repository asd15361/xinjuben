import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import { cleanPossibleName, normalizeAnchorName } from './summarize-chat-for-generation-shared'

function toStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function toStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((v) => typeof v === 'string').map((v) => v.trim()).filter(Boolean)
}

function toAnchorName(value: unknown): string {
  return normalizeAnchorName(toStringOrEmpty(value))
}

export function normalizeOutlineStoryIntent(input: unknown, fallback?: StoryIntentPackageDto): StoryIntentPackageDto {
  const obj = (input && typeof input === 'object' ? (input as Record<string, unknown>) : {}) as Record<string, unknown>
  const fallbackOfficialKeyCharacters = (fallback?.officialKeyCharacters || []).map((item) => cleanPossibleName(item)).filter(Boolean)
  const fallbackLockedCharacterNames = (fallback?.lockedCharacterNames || []).map((item) => cleanPossibleName(item)).filter(Boolean)
  return {
    titleHint: toStringOrEmpty(obj.titleHint) || fallback?.titleHint || '',
    genre: toStringOrEmpty(obj.genre) || fallback?.genre || '',
    tone: toStringOrEmpty(obj.tone) || fallback?.tone || '',
    audience: toStringOrEmpty(obj.audience) || fallback?.audience || '',
    sellingPremise: toStringOrEmpty(obj.sellingPremise) || fallback?.sellingPremise || '',
    coreDislocation: toStringOrEmpty(obj.coreDislocation) || fallback?.coreDislocation || '',
    emotionalPayoff: toStringOrEmpty(obj.emotionalPayoff) || fallback?.emotionalPayoff || '',
    protagonist: toAnchorName(obj.protagonist) || normalizeAnchorName(fallback?.protagonist || '') || '',
    antagonist: toAnchorName(obj.antagonist) || normalizeAnchorName(fallback?.antagonist || '') || '',
    coreConflict: toStringOrEmpty(obj.coreConflict) || fallback?.coreConflict || '',
    endingDirection: toStringOrEmpty(obj.endingDirection) || fallback?.endingDirection || '',
    officialKeyCharacters: toStringArray(obj.officialKeyCharacters).map((item) => cleanPossibleName(item)).filter(Boolean).length
      ? toStringArray(obj.officialKeyCharacters).map((item) => cleanPossibleName(item)).filter(Boolean)
      : fallbackOfficialKeyCharacters,
    lockedCharacterNames: toStringArray(obj.lockedCharacterNames).map((item) => cleanPossibleName(item)).filter(Boolean).length
      ? toStringArray(obj.lockedCharacterNames).map((item) => cleanPossibleName(item)).filter(Boolean)
      : fallbackLockedCharacterNames,
    themeAnchors: toStringArray(obj.themeAnchors).length ? toStringArray(obj.themeAnchors) : fallback?.themeAnchors || [],
    worldAnchors: toStringArray(obj.worldAnchors).length ? toStringArray(obj.worldAnchors) : fallback?.worldAnchors || [],
    relationAnchors: toStringArray(obj.relationAnchors).length
      ? toStringArray(obj.relationAnchors)
      : fallback?.relationAnchors || [],
    dramaticMovement: toStringArray(obj.dramaticMovement).length
      ? toStringArray(obj.dramaticMovement)
      : fallback?.dramaticMovement || [],
    manualRequirementNotes: toStringOrEmpty(obj.manualRequirementNotes) || fallback?.manualRequirementNotes || '',
    freeChatFinalSummary: toStringOrEmpty(obj.freeChatFinalSummary) || fallback?.freeChatFinalSummary || '',
    generationBriefText: toStringOrEmpty(obj.generationBriefText) || fallback?.generationBriefText || ''
  }
}
