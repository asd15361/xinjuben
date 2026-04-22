import type {
  RewriteScriptEpisodeInputDto,
  StartScriptGenerationInputDto,
  ScriptGenerationExecutionPlanDto,
  ScriptGenerationMode,
  ScriptRuntimeFailureHistoryCode
} from '../../../../../shared/contracts/script-generation.ts'
import type { ProjectEntityStoreDto } from '../../../../../shared/contracts/entities.ts'
import type { StoryIntentPackageDto } from '../../../../../shared/contracts/intake.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../../../shared/contracts/workflow.ts'
import {
  countCoveredScriptEpisodes,
  restrictScriptToTargetEpisodes
} from '../../../../../shared/domain/workflow/script-episode-coverage.ts'
import {
  getScriptGenerationPlan,
  type ScriptGenerationPlanServiceInput
} from '../../../app/services/script-plan-service.ts'

export interface RequestedScriptGenerationMeta {
  normalizedTargetEpisodes: number
  normalizedScript: ScriptSegmentDto[]
  coveredEpisodeCount: number
  requestedMode: ScriptGenerationMode
}

export function resolveRequestedScriptGenerationMeta(
  script: ScriptSegmentDto[],
  targetEpisodes: number
): RequestedScriptGenerationMeta {
  const normalizedTargetEpisodes = Number.isFinite(targetEpisodes) ? Math.floor(targetEpisodes) : 0
  const normalizedScript =
    normalizedTargetEpisodes > 0
      ? restrictScriptToTargetEpisodes(script, normalizedTargetEpisodes)
      : []
  const coveredEpisodeCount = countCoveredScriptEpisodes(script, normalizedTargetEpisodes)
  const requestedMode =
    normalizedTargetEpisodes > 0 && coveredEpisodeCount >= normalizedTargetEpisodes
      ? 'rewrite'
      : coveredEpisodeCount > 0
        ? 'resume'
        : 'fresh_start'

  return {
    normalizedTargetEpisodes,
    normalizedScript,
    coveredEpisodeCount,
    requestedMode
  }
}

interface ResolveEffectiveScriptGenerationPlanInput {
  generationPlan: ScriptGenerationExecutionPlanDto | null
  requestedMode: ScriptGenerationMode
  normalizedTargetEpisodes: number
  scriptPlanBase: ScriptSegmentDto[]
  storyIntent: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
  runtimeFailureHistory: readonly ScriptRuntimeFailureHistoryCode[]
  getPlan?: (
    input: ScriptGenerationPlanServiceInput
  ) => Promise<ScriptGenerationExecutionPlanDto | null>
}

export async function resolveEffectiveScriptGenerationPlan(
  input: ResolveEffectiveScriptGenerationPlanInput
): Promise<ScriptGenerationExecutionPlanDto | null> {
  const freshPlan = await (input.getPlan ?? getScriptGenerationPlan)({
    planInput: {
      mode: input.requestedMode,
      targetEpisodes: input.normalizedTargetEpisodes,
      runtimeFailureHistory: [...input.runtimeFailureHistory]
    },
    storyIntent: input.storyIntent,
    outline: input.outline,
    characters: input.characters,
    segments: input.segments,
    script: input.scriptPlanBase,
    failureHistory: input.runtimeFailureHistory
  })

  if (freshPlan) {
    return freshPlan
  }

  if (
    input.generationPlan &&
    input.generationPlan.mode === input.requestedMode &&
    input.generationPlan.targetEpisodes === input.normalizedTargetEpisodes &&
    input.generationPlan.existingSceneCount ===
      countCoveredScriptEpisodes(input.scriptPlanBase, input.normalizedTargetEpisodes)
  ) {
    return input.generationPlan
  }

  return null
}

export function buildScriptCharactersSummary(characters: CharacterDraftDto[]): string[] {
  return characters.map((item) => `${item.name}:${item.goal || item.protectTarget || item.fear}`)
}

interface BuildScriptGenerationRequestBaseInput {
  plan: ScriptGenerationExecutionPlanDto
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
  existingScript: ScriptSegmentDto[]
  storyIntent: StoryIntentPackageDto | null
  charactersSummary: string[]
  projectEntityStore?: ProjectEntityStoreDto | null
}

export function buildStartScriptGenerationRequest(
  input: BuildScriptGenerationRequestBaseInput & { projectId: string }
): StartScriptGenerationInputDto {
  return {
    projectId: input.projectId,
    plan: input.plan,
    outlineTitle: input.outline.title,
    theme: input.outline.theme,
    mainConflict: input.outline.mainConflict,
    charactersSummary: input.charactersSummary,
    storyIntent: input.storyIntent,
    scriptControlPackage: input.plan.scriptControlPackage,
    outline: input.outline,
    characters: input.characters,
    entityStore: input.projectEntityStore ?? undefined,
    segments: input.segments,
    existingScript: input.existingScript
  }
}

export function buildRewriteScriptEpisodeRequest(
  input: BuildScriptGenerationRequestBaseInput & { episodeNo: number }
): RewriteScriptEpisodeInputDto {
  return {
    episodeNo: input.episodeNo,
    plan: input.plan,
    outlineTitle: input.outline.title,
    theme: input.outline.theme,
    mainConflict: input.outline.mainConflict,
    charactersSummary: input.charactersSummary,
    storyIntent: input.storyIntent,
    scriptControlPackage: input.plan.scriptControlPackage,
    outline: input.outline,
    characters: input.characters,
    entityStore: input.projectEntityStore ?? undefined,
    segments: input.segments,
    existingScript: input.existingScript
  }
}
