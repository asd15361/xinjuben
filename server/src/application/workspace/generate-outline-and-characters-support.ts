import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { appendRuntimeDiagnosticLog } from '../../infrastructure/diagnostics/runtime-diagnostic-log.js'
import { generateTextWithRuntimeRouter } from '../ai/generate-text'
import { resolveAiStageTimeoutMs } from '../ai/resolve-ai-stage-timeout'
import type { StoryIntentPackageDto } from '../../shared/contracts/intake'
import type { CharacterDraftDto, OutlineEpisodeDto } from '../../shared/contracts/workflow'
import type { CharacterProfileV2Dto } from '../../shared/contracts/character-profile-v2'
import type { FactionMatrixDto } from '../../shared/contracts/faction-matrix'
import { getGovernanceOutlineBlockSize } from '../../shared/domain/workflow/batching-contract'
import { buildFourActEpisodeRanges } from '../../shared/domain/workflow/episode-count'
import { parseCharacterBundleText } from './parse-character-bundle'
import { buildCharacterGenerationPrompt } from './generation-stage-prompts'
import {
  buildOutlineEpisodeBatchPrompt,
  buildOutlineOverviewPrompt,
  type RoughOutlineAct,
  type RoughOutlineActPlan,
  type RoughOutlineOverviewInput,
  type RoughOutlineEpisodeBatchInput
} from './rough-outline-stage-prompts'
import {
  type RoughOutlineFailureCode,
  validateOutlineEpisodeBatch
} from './rough-outline-validation'
import {
  assembleOutlineBundleFromStages,
  type OutlineBundlePayload,
  type OutlineEpisodeBatchPayload,
  type OutlineOverviewPayload,
  type RoughOutlineActSummaryPayload
} from './rough-outline-assembly'
import { tryParseObject } from './summarize-chat-for-generation-json'
import {
  buildRoughOutlineParseRetryPrompt,
  isLikelyTruncatedJsonResponse
} from './rough-outline-parse-retry'
import { runRoughOutlineStageWithRetries } from './rough-outline-retry-policy'

const OUTLINE_OVERVIEW_MAX_OUTPUT_TOKENS = 2200
const OUTLINE_BATCH_MAX_OUTPUT_TOKENS = 3200
const CHARACTER_BUNDLE_MAX_OUTPUT_TOKENS = 3000
const ROUGH_OUTLINE_PARSE_RETRY_MAX_OUTPUT_TOKENS = 2000

const ROUGH_OUTLINE_ACT_ORDER: RoughOutlineAct[] = ['opening', 'midpoint', 'climax', 'ending']

interface CharacterBundlePayload {
  characters?: CharacterDraftDto[]
}

function toStringOrEmpty(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeActPlans(totalEpisodes: number): RoughOutlineActPlan[] {
  const ranges = buildFourActEpisodeRanges(totalEpisodes)
  return ROUGH_OUTLINE_ACT_ORDER.map((act, index) => ({
    act,
    startEpisode: ranges[index]?.startEpisode ?? index + 1,
    endEpisode: ranges[index]?.endEpisode ?? index + 1
  }))
}

function resolveOverviewFailureCode(
  outline: OutlineOverviewPayload['outline']
): RoughOutlineFailureCode | 'act_summaries_missing' | null {
  if (!outline || typeof outline !== 'object') return 'missing_title'
  if (!toStringOrEmpty(outline.title)) return 'missing_title'
  if (!toStringOrEmpty(outline.genre)) return 'missing_genre'
  if (!toStringOrEmpty(outline.theme)) return 'missing_theme'
  if (!toStringOrEmpty(outline.protagonist)) return 'missing_protagonist'
  if (!toStringOrEmpty(outline.mainConflict)) return 'missing_main_conflict'
  if (!toStringOrEmpty(outline.summary)) return 'missing_summary'

  const actSummaries = Array.isArray(outline.actSummaries) ? outline.actSummaries : []
  const seenActs = new Set<RoughOutlineAct>()
  for (const act of ROUGH_OUTLINE_ACT_ORDER) {
    const matched = actSummaries.find((item) => item?.act === act)
    if (!matched?.act || !toStringOrEmpty(matched.summary) || seenActs.has(matched.act)) {
      return 'act_summaries_missing'
    }
    seenActs.add(matched.act)
  }

  return actSummaries.length === ROUGH_OUTLINE_ACT_ORDER.length ? null : 'act_summaries_missing'
}

function mergeActSummariesIntoPlans(
  basePlans: RoughOutlineActPlan[],
  actSummaries: RoughOutlineActSummaryPayload[] | undefined
): RoughOutlineActPlan[] {
  const actSummaryMap = new Map<RoughOutlineAct, string>()
  for (const item of actSummaries || []) {
    if (!item?.act) continue
    const summary = toStringOrEmpty(item.summary)
    if (!summary) continue
    actSummaryMap.set(item.act, summary)
  }

  return basePlans.map((plan) => ({
    ...plan,
    summary: actSummaryMap.get(plan.act) || ''
  }))
}

function pickBatchActPlans(
  actPlans: RoughOutlineActPlan[],
  startEpisode: number,
  endEpisode: number
): RoughOutlineActPlan[] {
  return actPlans.filter(
    (plan) => plan.endEpisode >= startEpisode && plan.startEpisode <= endEpisode
  )
}

function formatOutlineValidationDetails(input: {
  code: string
  actualEpisodeCount: number
  missingEpisodeNos: number[]
  duplicateEpisodeNos: number[]
  emptyEpisodeNos: number[]
}): string {
  return `code=${input.code} actualEpisodeCount=${input.actualEpisodeCount} missing=[${input.missingEpisodeNos.join(',')}] duplicate=[${input.duplicateEpisodeNos.join(',')}] empty=[${input.emptyEpisodeNos.join(',')}]`
}

async function invokeRoughOutlineStage<T>(input: {
  prompt: string
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
  stage: 'rough_outline_overview' | 'rough_outline_batch'
  logContext: string
  maxOutputTokens: number
  runtimeHints?: {
    episode?: number
    totalEpisodes?: number
  }
}): Promise<T> {
  const timeoutMs = resolveAiStageTimeoutMs('rough_outline')
  const startedAt = Date.now()
  await appendRuntimeDiagnosticLog(
    'rough_outline',
    `${input.stage}_start ${input.logContext} promptChars=${input.prompt.length} timeoutMs=${timeoutMs} maxOutputTokens=${input.maxOutputTokens}`
  )

  try {
    const result = await generateTextWithRuntimeRouter(
      {
        task: 'rough_outline',
        prompt: input.prompt,
        allowFallback: false,
        responseFormat: 'json_object',
        temperature: 0.45,
        timeoutMs,
        maxOutputTokens: input.maxOutputTokens,
        runtimeHints: {
          totalEpisodes: input.runtimeHints?.totalEpisodes,
          episode: input.runtimeHints?.episode,
          strictness: 'strict'
        }
      },
      input.runtimeConfig,
      { signal: input.signal }
    )

    const parsed = tryParseObject(result.text)
    const parsedOk = Boolean(parsed)
    const normalizedResponsePreview = result.text.replace(/\s+/g, ' ').trim()
    await appendRuntimeDiagnosticLog(
      'rough_outline',
      `${input.stage}_finish ${input.logContext} elapsedMs=${Date.now() - startedAt} lane=${result.lane} model=${result.model} finishReason=${result.finishReason || 'unknown'} responseChars=${result.text.length} parsed=${parsedOk ? 'yes' : 'no'} responseHead=${normalizedResponsePreview.slice(0, 240)} responseTail=${normalizedResponsePreview.slice(-240)}`
    )

    if (!parsedOk) {
      if (input.stage === 'rough_outline_overview' && isLikelyTruncatedJsonResponse(result.text)) {
        await appendRuntimeDiagnosticLog(
          'rough_outline',
          `${input.stage}_retry_parse ${input.logContext} reason=truncated_json retryMaxOutputTokens=${ROUGH_OUTLINE_PARSE_RETRY_MAX_OUTPUT_TOKENS}`
        )
        const retryPrompt = buildRoughOutlineParseRetryPrompt(input.prompt)
        const retryResult = await generateTextWithRuntimeRouter(
          {
            task: 'rough_outline',
            prompt: retryPrompt,
            allowFallback: false,
            responseFormat: 'json_object',
            temperature: 0.2,
            timeoutMs,
            maxOutputTokens: ROUGH_OUTLINE_PARSE_RETRY_MAX_OUTPUT_TOKENS,
            runtimeHints: {
              totalEpisodes: input.runtimeHints?.totalEpisodes,
              episode: input.runtimeHints?.episode,
              strictness: 'strict',
              recoveryMode: 'retry_parse'
            }
          },
          input.runtimeConfig,
          { signal: input.signal }
        )
        const retryParsed = tryParseObject(retryResult.text)
        const retryPreview = retryResult.text.replace(/\s+/g, ' ').trim()
        await appendRuntimeDiagnosticLog(
          'rough_outline',
          `${input.stage}_retry_finish ${input.logContext} elapsedMs=${Date.now() - startedAt} lane=${retryResult.lane} model=${retryResult.model} finishReason=${retryResult.finishReason || 'unknown'} responseChars=${retryResult.text.length} parsed=${retryParsed ? 'yes' : 'no'} responseHead=${retryPreview.slice(0, 240)} responseTail=${retryPreview.slice(-240)}`
        )
        if (retryParsed) {
          return retryParsed as T
        }
      }
      throw new Error(`${input.stage}_parse_failed`)
    }

    return parsed as T
  } catch (error) {
    await appendRuntimeDiagnosticLog(
      'rough_outline',
      `${input.stage}_fail ${input.logContext} elapsedMs=${Date.now() - startedAt} error=${error instanceof Error ? error.message : String(error)}`
    )
    throw error instanceof Error ? error : new Error(String(error || `${input.stage}_failed`))
  }
}

async function generateOutlineOverview(input: {
  generationBriefText: string
  totalEpisodes: number
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
  sevenQuestions?: RoughOutlineOverviewInput['sevenQuestions']
  characterProfiles?: RoughOutlineOverviewInput['characterProfiles']
  characterProfilesV2?: CharacterProfileV2Dto[]
  factionMatrix?: FactionMatrixDto
}): Promise<{
  overview: OutlineOverviewPayload
  actPlans: RoughOutlineActPlan[]
}> {
  const baseActPlans = normalizeActPlans(input.totalEpisodes)
  return runRoughOutlineStageWithRetries({
    stage: 'rough_outline_overview',
    logContext: `totalEpisodes=${input.totalEpisodes}`,
    log: (message) => appendRuntimeDiagnosticLog('rough_outline', message),
    run: async () => {
      const prompt = buildOutlineOverviewPrompt({
        generationBriefText: input.generationBriefText,
        totalEpisodes: input.totalEpisodes,
        actPlans: baseActPlans,
        sevenQuestions: input.sevenQuestions,
        characterProfiles: input.characterProfiles,
        characterProfilesV2: input.characterProfilesV2,
        factionMatrix: input.factionMatrix
      })
      const overview = await invokeRoughOutlineStage<OutlineOverviewPayload>({
        prompt,
        runtimeConfig: input.runtimeConfig,
        signal: input.signal,
        stage: 'rough_outline_overview',
        logContext: `totalEpisodes=${input.totalEpisodes}`,
        maxOutputTokens: OUTLINE_OVERVIEW_MAX_OUTPUT_TOKENS,
        runtimeHints: {
          totalEpisodes: input.totalEpisodes
        }
      })

      const failureCode = resolveOverviewFailureCode(overview?.outline)
      if (failureCode) {
        const errorCode =
          failureCode === 'act_summaries_missing'
            ? 'rough_outline_overview_incomplete:act_summaries_missing'
            : `rough_outline_incomplete:${failureCode}`
        await appendRuntimeDiagnosticLog(
          'rough_outline',
          `rough_outline_overview_incomplete totalEpisodes=${input.totalEpisodes} code=${failureCode}`
        )
        throw new Error(errorCode)
      }

      return {
        overview,
        actPlans: mergeActSummariesIntoPlans(baseActPlans, overview.outline?.actSummaries)
      }
    }
  })
}

async function generateOutlineEpisodeBatch(input: {
  generationBriefText: string
  totalEpisodes: number
  startEpisode: number
  endEpisode: number
  overviewSummary: string
  actPlans: RoughOutlineActPlan[]
  previousEpisodes: OutlineEpisodeDto[]
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
  sevenQuestions?: RoughOutlineEpisodeBatchInput['sevenQuestions']
  characterProfiles?: RoughOutlineEpisodeBatchInput['characterProfiles']
  characterProfilesV2?: CharacterProfileV2Dto[]
  factionMatrix?: FactionMatrixDto
}): Promise<OutlineEpisodeBatchPayload> {
  return runRoughOutlineStageWithRetries({
    stage: 'rough_outline_batch',
    logContext: `range=${input.startEpisode}-${input.endEpisode}`,
    log: (message) => appendRuntimeDiagnosticLog('rough_outline', message),
    run: async () => {
      const prompt = buildOutlineEpisodeBatchPrompt({
        generationBriefText: input.generationBriefText,
        totalEpisodes: input.totalEpisodes,
        startEpisode: input.startEpisode,
        endEpisode: input.endEpisode,
        overviewSummary: input.overviewSummary,
        actPlans: pickBatchActPlans(input.actPlans, input.startEpisode, input.endEpisode),
        previousEpisodes: input.previousEpisodes,
        sevenQuestions: input.sevenQuestions,
        characterProfiles: input.characterProfiles,
        characterProfilesV2: input.characterProfilesV2,
        factionMatrix: input.factionMatrix
      })
      const batch = await invokeRoughOutlineStage<OutlineEpisodeBatchPayload>({
        prompt,
        runtimeConfig: input.runtimeConfig,
        signal: input.signal,
        stage: 'rough_outline_batch',
        logContext: `range=${input.startEpisode}-${input.endEpisode}`,
        maxOutputTokens: OUTLINE_BATCH_MAX_OUTPUT_TOKENS,
        runtimeHints: {
          totalEpisodes: input.totalEpisodes,
          episode: input.startEpisode
        }
      })

      const validation = validateOutlineEpisodeBatch({
        episodes: Array.isArray(batch?.episodes) ? batch.episodes : [],
        startEpisode: input.startEpisode,
        endEpisode: input.endEpisode
      })
      if (!validation.ok) {
        await appendRuntimeDiagnosticLog(
          'rough_outline',
          `rough_outline_batch_incomplete range=${input.startEpisode}-${input.endEpisode} ${formatOutlineValidationDetails(
            {
              code: validation.code || 'unknown',
              actualEpisodeCount: validation.actualEpisodeCount,
              missingEpisodeNos: validation.missingEpisodeNos,
              duplicateEpisodeNos: validation.duplicateEpisodeNos,
              emptyEpisodeNos: validation.emptyEpisodeNos
            }
          )}`
        )
        throw new Error(`rough_outline_incomplete:${validation.code || 'episode_numbers_invalid'}`)
      }

      return batch
    }
  })
}

export async function generateOutlineBundle(input: {
  generationBriefText: string
  totalEpisodes: number
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
  sevenQuestions?: RoughOutlineOverviewInput['sevenQuestions']
  characterProfiles?: RoughOutlineOverviewInput['characterProfiles']
  characterProfilesV2?: CharacterProfileV2Dto[]
  factionMatrix?: FactionMatrixDto
}): Promise<OutlineBundlePayload | null> {
  const overviewStage = await generateOutlineOverview({
    generationBriefText: input.generationBriefText,
    totalEpisodes: input.totalEpisodes,
    runtimeConfig: input.runtimeConfig,
    signal: input.signal,
    sevenQuestions: input.sevenQuestions,
    characterProfiles: input.characterProfiles,
    characterProfilesV2: input.characterProfilesV2,
    factionMatrix: input.factionMatrix
  })

  const batchSize = getGovernanceOutlineBlockSize()
  const batches: OutlineEpisodeBatchPayload[] = []
  const assembledEpisodes: OutlineEpisodeDto[] = []

  for (let startEpisode = 1; startEpisode <= input.totalEpisodes; startEpisode += batchSize) {
    const endEpisode = Math.min(input.totalEpisodes, startEpisode + batchSize - 1)
    const batch = await generateOutlineEpisodeBatch({
      generationBriefText: input.generationBriefText,
      totalEpisodes: input.totalEpisodes,
      startEpisode,
      endEpisode,
      overviewSummary: overviewStage.overview.outline?.summary?.trim() || '',
      actPlans: overviewStage.actPlans,
      previousEpisodes: assembledEpisodes.slice(-4),
      runtimeConfig: input.runtimeConfig,
      signal: input.signal,
      sevenQuestions: input.sevenQuestions,
      characterProfiles: input.characterProfiles,
      characterProfilesV2: input.characterProfilesV2,
      factionMatrix: input.factionMatrix
    })
    batches.push(batch)
    for (const episode of batch.episodes || []) {
      assembledEpisodes.push({
        episodeNo: Number(episode?.episodeNo) || assembledEpisodes.length + 1,
        summary: toStringOrEmpty(episode?.summary)
      })
    }
  }

  const assembled = assembleOutlineBundleFromStages({
    overview: overviewStage.overview,
    batches
  })
  await appendRuntimeDiagnosticLog(
    'rough_outline',
    `rough_outline_assembled totalEpisodes=${input.totalEpisodes} batchCount=${batches.length} episodeCount=${assembled.outline?.episodes?.length || 0}`
  )
  return assembled
}

export async function generateCharacterBundle(input: {
  generationBriefText: string
  runtimeConfig: RuntimeProviderConfig
  storyIntent: StoryIntentPackageDto
  outlineSummary: string
  signal?: AbortSignal
}): Promise<CharacterBundlePayload | null> {
  const prompt = buildCharacterGenerationPrompt({
    generationBriefText: input.generationBriefText,
    protagonist: input.storyIntent.protagonist || '',
    antagonist: input.storyIntent.antagonist || '',
    keyCharacters: input.storyIntent.officialKeyCharacters || [],
    conflict: input.storyIntent.coreConflict || '',
    outlineSummary: input.outlineSummary
  })
  const timeoutMs = resolveAiStageTimeoutMs('character_profile')
  const startedAt = Date.now()
  await appendRuntimeDiagnosticLog(
    'character_profile',
    `start briefChars=${input.generationBriefText.length} outlineSummaryChars=${input.outlineSummary.length} promptChars=${prompt.length} timeoutMs=${timeoutMs} maxOutputTokens=${CHARACTER_BUNDLE_MAX_OUTPUT_TOKENS}`
  )

  try {
    const result = await generateTextWithRuntimeRouter(
      {
        task: 'character_profile',
        prompt,
        allowFallback: false,
        responseFormat: 'json_object',
        temperature: 0.5,
        timeoutMs,
        maxOutputTokens: CHARACTER_BUNDLE_MAX_OUTPUT_TOKENS
      },
      input.runtimeConfig,
      { signal: input.signal }
    )

    const parsed = parseCharacterBundleText(result.text)
    const parsedOk = Boolean(parsed?.characters?.length)
    const normalizedResponsePreview = result.text.replace(/\s+/g, ' ').trim()
    await appendRuntimeDiagnosticLog(
      'character_profile',
      `finish elapsedMs=${Date.now() - startedAt} lane=${result.lane} model=${result.model} finishReason=${result.finishReason || 'unknown'} responseChars=${result.text.length} parsed=${parsedOk ? 'yes' : 'no'} responseHead=${normalizedResponsePreview.slice(0, 240)} responseTail=${normalizedResponsePreview.slice(-240)}`
    )
    if (!parsedOk) {
      throw new Error('character_profile_parse_failed')
    }

    return parsed
  } catch (error) {
    await appendRuntimeDiagnosticLog(
      'character_profile',
      `fail elapsedMs=${Date.now() - startedAt} error=${error instanceof Error ? error.message : String(error)}`
    )
    throw error instanceof Error ? error : new Error(String(error || 'character_profile_failed'))
  }
}

