import type {
  BuildScriptGenerationPlanInputDto,
  ScriptGenerationExecutionPlanDto
} from '../../../shared/contracts/script-generation.ts'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineBlockDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow.ts'
import { buildScriptGenerationContract } from '../../../shared/domain/script-generation/contract-policy.ts'
import { buildScriptGenerationControlPackage } from '../../../shared/domain/script-generation/script-control-package.ts'
import { validateStageInputContract } from '../../../shared/domain/workflow/validate-stage-input-contract.ts'
import { buildEpisodePlans } from './plan/build-episode-plans.ts'
import { clampTargetEpisodes, resolveMode } from './plan/resolve-generation-mode.ts'
import { resolveLaneStrategy } from './plan/resolve-lane-strategy.ts'
import { resolveScriptRuntimeProfile } from './plan/resolve-runtime-profile.ts'
import { countCoveredScriptEpisodes } from '../../../shared/domain/workflow/script-episode-coverage.ts'

interface BuildExecutionPlanContext {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
  detailedOutlineBlocks?: DetailedOutlineBlockDto[]
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
  const existingSceneCount = countCoveredScriptEpisodes(context.script, targetEpisodes)
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
  const lanes = resolveLaneStrategy()
  const resumeStartEpisode =
    mode === 'resume' && existingSceneCount > 0 ? existingSceneCount + 1 : 1
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
    ready: stageValidation.ready,
    blockedBy: stageValidation.issues,
    contract: generationContract,
    scriptControlPackage: buildScriptGenerationControlPackage({
      storyIntent: context.storyIntent,
      segments: context.segments,
      detailedOutlineBlocks: context.detailedOutlineBlocks,
      targetEpisodes
    }),
    targetEpisodes,
    existingSceneCount,
    recommendedPrimaryLane: lanes.primary,
    recommendedFallbackLane: lanes.fallback,
    runtimeProfile,
    episodePlans
  }
}
