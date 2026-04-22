import type { IntakeAnswer, StoryIntentPackageDto } from '../../../../shared/contracts/intake.ts'

export function buildStoryIntentFromIntake(input: {
  answers: IntakeAnswer[]
  freeChatFinalSummary?: string
  manualRequirementNotes?: string
  lockedCharacterNames?: string[]
}): StoryIntentPackageDto {
  const getAnswer = (id: string): string | undefined =>
    input.answers.find((answer) => answer.questionId === id)?.answer?.trim() || undefined

  return {
    titleHint: getAnswer('title'),
    genre: getAnswer('genre'),
    tone: getAnswer('tone'),
    audience: getAnswer('audience'),
    protagonist: getAnswer('protagonist'),
    antagonist: getAnswer('antagonist'),
    coreConflict: getAnswer('conflict'),
    endingDirection: getAnswer('ending'),
    officialKeyCharacters: [getAnswer('protagonist'), getAnswer('antagonist')].filter(
      Boolean
    ) as string[],
    lockedCharacterNames: input.lockedCharacterNames ?? [],
    themeAnchors: [getAnswer('theme')].filter(Boolean) as string[],
    worldAnchors: [getAnswer('world')].filter(Boolean) as string[],
    relationAnchors: [getAnswer('relationship')].filter(Boolean) as string[],
    dramaticMovement: [getAnswer('twist'), getAnswer('cost'), getAnswer('hook')].filter(
      Boolean
    ) as string[],
    manualRequirementNotes: input.manualRequirementNotes,
    freeChatFinalSummary: input.freeChatFinalSummary
  }
}
