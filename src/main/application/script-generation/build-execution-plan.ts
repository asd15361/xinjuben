import type {
  BuildScriptGenerationPlanInputDto,
  ScriptGenerationExecutionPlanDto
} from '../../../shared/contracts/script-generation'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type { CharacterDraftDto, DetailedOutlineSegmentDto, OutlineDraftDto, ScriptSegmentDto } from '../../../shared/contracts/workflow'
import { buildScriptGenerationContract } from '../../../shared/domain/script-generation/contract-policy'
import { validateStageInputContract } from '../input-contract/validate-stage-input'
import { buildEpisodePlans } from './plan/build-episode-plans'
import { clampTargetEpisodes, resolveMode } from './plan/resolve-generation-mode'
import { resolveLaneStrategy } from './plan/resolve-lane-strategy'
import { resolveScriptRuntimeProfile } from './plan/resolve-runtime-profile'

interface BuildExecutionPlanContext {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
  script: ScriptSegmentDto[]
}

export function buildScriptGenerationExecutionPlan(
  context: BuildExecutionPlanContext,
  input: BuildScriptGenerationPlanInputDto = {}
): ScriptGenerationExecutionPlanDto {
  const stageValidation = validateStageInputContract('script', {
    storyIntent: context.storyIntent,
    outline: context.outline,
    characters: context.characters,
    segments: context.segments,
    script: context.script
  })

  const targetEpisodes = clampTargetEpisodes(input.targetEpisodes)
  const generationContract = buildScriptGenerationContract({
    storyIntent: context.storyIntent,
    outline: context.outline,
    characters: context.characters,
    segments: context.segments,
    targetEpisodes
  })
  const existingSceneCount = context.script.length
  const mode = resolveMode(input.mode, existingSceneCount)
  const hasDenseStructure = context.segments.filter((item) => item.content.trim()).length >= 3
  const runtimeProfile = resolveScriptRuntimeProfile({
    storyIntent: context.storyIntent,
    outline: context.outline,
    characters: context.characters,
    segments: context.segments,
    targetEpisodes,
    runtimeFailureHistory: input.runtimeFailureHistory
  })
  const lanes = resolveLaneStrategy({
    mode,
    targetEpisodes,
    hasDenseStructure
  })
  const resumeStartEpisode =
    mode === 'resume' && existingSceneCount > 0
      ? existingSceneCount + 1
      : 1
  const episodePlans = buildEpisodePlans({
    mode,
    targetEpisodes,
    resumeStartEpisode,
    stageValidation,
    lane: lanes.primary,
    outline: context.outline,
    characters: context.characters,
    segments: context.segments,
    script: context.script,
    hasDenseStructure,
    runtimeFailureHistory: input.runtimeFailureHistory
  })

  return {
    mode,
    ready: stageValidation.ready && generationContract.ready,
    blockedBy: stageValidation.issues,
    contract: generationContract,
    targetEpisodes,
    existingSceneCount,
    recommendedPrimaryLane: lanes.primary,
    recommendedFallbackLane: lanes.fallback,
    runtimeProfile,
    episodePlans
  }
}
