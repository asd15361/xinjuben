import type { StoryIntentPackageDto } from '../../contracts/intake.ts'
import { normalizeShortDramaConstitution } from '../short-drama/short-drama-constitution.ts'
import { cleanCharacterLikeName } from './character-draft-normalization.ts'

export function isConfirmedStoryIntentForTranscript(
  storyIntent: StoryIntentPackageDto | null | undefined,
  chatTranscript: string
): boolean {
  return Boolean(
    storyIntent?.generationBriefText?.trim() &&
    storyIntent.confirmedChatTranscript === chatTranscript
  )
}

function normalizeConfirmedCharacterName(value: string | undefined): string {
  const text = String(value || '').trim()
  if (!text) return ''

  const direct = cleanCharacterLikeName(text)
  if (direct) return direct

  const head = text.split(/[，,。；、|｜/]/)[0]?.trim() || ''
  return cleanCharacterLikeName(head)
}

function normalizeConfirmedCharacterNameList(values: string[] | undefined): string[] {
  const seen = new Set<string>()
  const result: string[] = []

  for (const value of values || []) {
    const normalized = normalizeConfirmedCharacterName(value)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }

  return result
}

export function buildConfirmedStoryIntent(input: {
  storyIntent: Partial<StoryIntentPackageDto>
  generationBriefText: string
  chatTranscript: string
}): StoryIntentPackageDto {
  const shortDramaConstitution = normalizeShortDramaConstitution(
    input.storyIntent.shortDramaConstitution
  )
  const protagonist = normalizeConfirmedCharacterName(input.storyIntent.protagonist)
  const antagonist = normalizeConfirmedCharacterName(input.storyIntent.antagonist)

  return {
    titleHint: input.storyIntent.titleHint || '',
    genre: input.storyIntent.genre || '',
    tone: input.storyIntent.tone || '',
    audience: input.storyIntent.audience || '',
    sellingPremise: input.storyIntent.sellingPremise || '',
    coreDislocation: input.storyIntent.coreDislocation || '',
    emotionalPayoff: input.storyIntent.emotionalPayoff || '',
    protagonist,
    antagonist,
    coreConflict: input.storyIntent.coreConflict || '',
    endingDirection: input.storyIntent.endingDirection || '',
    officialKeyCharacters: normalizeConfirmedCharacterNameList(
      input.storyIntent.officialKeyCharacters
    ),
    lockedCharacterNames: normalizeConfirmedCharacterNameList(
      input.storyIntent.lockedCharacterNames
    ),
    themeAnchors: input.storyIntent.themeAnchors || [],
    worldAnchors: input.storyIntent.worldAnchors || [],
    relationAnchors: input.storyIntent.relationAnchors || [],
    dramaticMovement: input.storyIntent.dramaticMovement || [],
    shortDramaConstitution: shortDramaConstitution || null,
    manualRequirementNotes: input.storyIntent.manualRequirementNotes || '',
    freeChatFinalSummary: input.storyIntent.freeChatFinalSummary || '',
    generationBriefText: input.generationBriefText,
    confirmedChatTranscript: input.chatTranscript,
    creativeSummary: input.storyIntent.creativeSummary || '',
    storySynopsis: input.storyIntent.storySynopsis ?? null
  }
}
