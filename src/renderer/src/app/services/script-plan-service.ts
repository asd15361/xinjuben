import type {
  BuildScriptGenerationPlanInputDto,
  ScriptGenerationExecutionPlanDto,
  ScriptRuntimeFailureHistoryCode
} from '../../../../shared/contracts/script-generation.ts'
import type { StoryIntentPackageDto } from '../../../../shared/contracts/intake.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../../shared/contracts/workflow.ts'
import { collectScriptEpisodeNos } from '../../../../shared/domain/workflow/script-episode-coverage.ts'
import { perfLog } from '../timing/performance-logger.ts'

let cachedPlan: ScriptGenerationExecutionPlanDto | null = null
let cachedRevision: string | null = null

function stableStringify(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value !== 'object') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export interface ScriptGenerationPlanServiceInput {
  planInput: BuildScriptGenerationPlanInputDto
  storyIntent: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
  script: ScriptSegmentDto[]
  failureHistory: readonly ScriptRuntimeFailureHistoryCode[]
}

function computeRevision(input: ScriptGenerationPlanServiceInput): string {
  return [
    input.planInput.mode,
    input.planInput.targetEpisodes,
    stableStringify(collectScriptEpisodeNos(input.script ?? [])),
    stableStringify(input.outline),
    stableStringify(input.characters),
    stableStringify(input.segments),
    stableStringify(input.failureHistory)
  ].join(':')
}

export async function getScriptGenerationPlan(
  input: ScriptGenerationPlanServiceInput
): Promise<ScriptGenerationExecutionPlanDto | null> {
  const currentRevision = computeRevision(input)

  if (cachedPlan && cachedRevision === currentRevision) {
    return cachedPlan
  }

  perfLog.scriptPlanServiceStart()
  const result = await window.api.workflow.buildScriptGenerationPlan({
    plan: {
      ...input.planInput,
      runtimeFailureHistory: [...input.failureHistory]
    },
    storyIntent: input.storyIntent,
    outline: input.outline,
    characters: input.characters,
    segments: input.segments,
    script: input.script
  })
  perfLog.scriptPlanServiceEnd()

  if (result) {
    cachedPlan = result
    cachedRevision = currentRevision
  }

  return result
}

export function clearScriptPlanCache(): void {
  cachedPlan = null
  cachedRevision = null
}
