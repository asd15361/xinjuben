import type {
  ScriptGenerationEpisodePlanDto,
  ScriptGenerationMode
} from '@shared/contracts/script-generation'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '@shared/contracts/workflow'
import type { ModelRouteLane } from '@shared/contracts/ai'
import type { InputContractValidationDto } from '@shared/contracts/input-contract'
import { getConfirmedFormalFacts } from '@shared/domain/formal-fact/selectors'
import { estimateEpisodeContextTokens } from './estimate-context-tokens'

export function buildEpisodePlans(input: {
  mode: ScriptGenerationMode
  targetEpisodes: number
  resumeStartEpisode: number
  stageValidation: InputContractValidationDto
  lane: ModelRouteLane
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  segments: DetailedOutlineSegmentDto[]
  script: ScriptSegmentDto[]
  hasDenseStructure: boolean
  runtimeFailureHistory?: Array<
    'runtime_interrupted' | 'parse_interrupted' | 'draft_coverage_insufficient'
  >
}): ScriptGenerationEpisodePlanDto[] {
  const confirmedFormalFacts = getConfirmedFormalFacts(input.outline)
  const latestFailure =
    input.runtimeFailureHistory && input.runtimeFailureHistory.length > 0
      ? input.runtimeFailureHistory[input.runtimeFailureHistory.length - 1]
      : null

  return Array.from({ length: input.targetEpisodes }, (_, index) => {
    const episodeNo = index + 1
    const isAlreadyCovered = input.mode === 'resume' && episodeNo < input.resumeStartEpisode
    const isRewriteMode = input.mode === 'rewrite'
    const strictness =
      input.mode === 'rewrite' ||
      episodeNo === 1 ||
      episodeNo === input.targetEpisodes ||
      episodeNo % 5 === 0
        ? 'strict'
        : 'normal'
    const estimatedContextTokens = estimateEpisodeContextTokens({
      outline: input.outline,
      characters: input.characters,
      segments: input.segments,
      script: input.script,
      targetEpisodes: input.targetEpisodes,
      episodeNo
    })
    const hasP0Risk =
      input.mode === 'rewrite' ||
      episodeNo === input.targetEpisodes ||
      confirmedFormalFacts.length === 0 ||
      input.characters.length < 2
    const hasHardAlignerRisk =
      input.hasDenseStructure ||
      input.outline.theme.trim().length > 0 ||
      input.outline.mainConflict.trim().length > 0
    const recoveryMode =
      latestFailure === 'parse_interrupted'
        ? 'retry_parse'
        : latestFailure === 'draft_coverage_insufficient'
          ? 'retry_coverage'
          : latestFailure === 'runtime_interrupted'
            ? 'retry_runtime'
            : 'fresh'

    return {
      episodeNo,
      status: isAlreadyCovered ? 'pending' : 'ready',
      lane: input.lane,
      reason: isAlreadyCovered
        ? '该集视为前缀已存在，续跑从后续集数开始。'
        : input.mode === 'rewrite'
          ? '重写模式优先保证关键集质量。'
          : input.mode === 'resume'
            ? '续跑模式从未覆盖集数继续。'
            : '首次生成，按当前执行计划进入批次。',
      runtimeHints: {
        episode: episodeNo,
        totalEpisodes: input.targetEpisodes,
        estimatedContextTokens,
        strictness,
        hasP0Risk,
        hasHardAlignerRisk,
        isRewriteMode,
        recoveryMode
      }
    }
  })
}