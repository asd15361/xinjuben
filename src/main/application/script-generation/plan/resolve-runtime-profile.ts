import type { StoryIntentPackageDto } from '../../../../shared/contracts/intake.ts'
import type { ScriptRuntimeFailureHistoryCode } from '../../../../shared/contracts/script-generation.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto
} from '../../../../shared/contracts/workflow.ts'

function normalizeCount(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.floor(Number(value)))
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function resolveScriptRuntimeProfile(input: {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
  targetEpisodes: number
  runtimeFailureHistory?: ScriptRuntimeFailureHistoryCode[]
}): {
  contextPressureScore: number
  shouldCompactContextFirst: boolean
  maxStoryIntentChars: number
  maxCharacterChars: number
  maxSegmentChars: number
  recommendedBatchSize: number
  profileLabel: string
  reason: string
} {
  const runtimeFailureCount = (input.runtimeFailureHistory || []).length
  const storyIntentLength = normalizeCount(
    [
      input.storyIntent?.titleHint,
      input.storyIntent?.coreConflict,
      input.storyIntent?.manualRequirementNotes,
      input.storyIntent?.freeChatFinalSummary,
      ...(input.storyIntent?.themeAnchors || []),
      ...(input.storyIntent?.worldAnchors || []),
      ...(input.storyIntent?.relationAnchors || []),
      ...(input.storyIntent?.dramaticMovement || [])
    ]
      .filter(Boolean)
      .join('\n').length
  )
  const outlineLength = normalizeCount(
    [
      input.outline.title,
      input.outline.theme,
      input.outline.mainConflict,
      input.outline.protagonist
    ].join('\n').length
  )
  const characterLength = normalizeCount(
    input.characters
      .flatMap((character) => [
        character.name,
        character.goal,
        character.arc,
        character.advantage,
        character.weakness
      ])
      .join('\n').length
  )
  const segmentLength = normalizeCount(
    input.segments.map((segment) => segment.content).join('\n').length
  )

  let contextPressureScore = 0
  if (input.targetEpisodes >= 20) contextPressureScore += 4
  else if (input.targetEpisodes >= 12) contextPressureScore += 3
  else if (input.targetEpisodes >= 8) contextPressureScore += 2
  if (storyIntentLength >= 2200) contextPressureScore += 3
  else if (storyIntentLength >= 1200) contextPressureScore += 2
  if (characterLength >= 3000) contextPressureScore += 3
  else if (characterLength >= 1800) contextPressureScore += 2
  if (segmentLength >= 1800) contextPressureScore += 2
  else if (segmentLength >= 900) contextPressureScore += 1
  if (outlineLength >= 500) contextPressureScore += 1
  contextPressureScore += Math.min(4, runtimeFailureCount * 2)

  const shouldCompactContextFirst = contextPressureScore >= 6 || runtimeFailureCount > 0
  const maxStoryIntentChars = shouldCompactContextFirst
    ? runtimeFailureCount > 0
      ? 1000
      : 1200
    : 1800
  const maxCharacterChars = shouldCompactContextFirst
    ? runtimeFailureCount > 0
      ? 1300
      : 1600
    : 2400
  const maxSegmentChars = shouldCompactContextFirst ? (runtimeFailureCount > 0 ? 760 : 900) : 1500
  const recommendedBatchSize = clamp(
    Math.min(5, input.targetEpisodes),
    1,
    Math.max(1, input.targetEpisodes)
  )
  const profileLabel = [
    shouldCompactContextFirst ? 'compact' : 'full',
    `episodes-${input.targetEpisodes}`,
    `pressure-${contextPressureScore}`,
    runtimeFailureCount > 0 ? `retry-${runtimeFailureCount}` : 'fresh'
  ].join(':')

  return {
    contextPressureScore,
    shouldCompactContextFirst,
    maxStoryIntentChars,
    maxCharacterChars,
    maxSegmentChars,
    recommendedBatchSize,
    profileLabel,
    reason: [
      `集数=${input.targetEpisodes}`,
      `storyIntent=${storyIntentLength}`,
      `人物包=${characterLength}`,
      `详纲包=${segmentLength}`,
      shouldCompactContextFirst ? '先瘦身上下文' : '保留完整上下文',
      `首批按 ${recommendedBatchSize} 集推进`,
      runtimeFailureCount > 0 ? `失败历史=${runtimeFailureCount}` : '失败历史=0'
    ].join('｜')
  }
}
