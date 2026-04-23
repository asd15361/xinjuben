import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../ai/generate-text'
import type { StoryIntentPackageDto } from '@shared/contracts/intake'
import type { ProjectEntityStoreDto } from '@shared/contracts/entities'
import type {
  CharacterDraftDto,
  DetailedOutlineEpisodeBeatDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  OutlineEpisodeDto
} from '@shared/contracts/workflow'
import {
  buildFourActEpisodeRanges,
  deriveOutlineEpisodeCount
} from '@shared/domain/workflow/episode-count'
import { deriveActiveCharacterPackage } from '@shared/domain/workflow/active-character-package'
import { ensureOutlineEpisodeShape } from '@shared/domain/workflow/outline-episodes'
import { buildDetailedOutlineActPrompt } from './generation-stage-prompts'
import { generateEpisodeControlCardsForSegment } from './episode-control-agent'
import { resolveAiStageTimeoutMs } from '../ai/resolve-ai-stage-timeout'
import { tryParseObject } from './summarize-chat-for-generation-json'

type DetailedOutlineAct = 'opening' | 'midpoint' | 'climax' | 'ending'
type DetailedOutlineSource = 'model'

const DETAILED_OUTLINE_ACT_ORDER: DetailedOutlineAct[] = ['opening', 'midpoint', 'climax', 'ending']

const DETAILED_OUTLINE_ACT_HOOK_TYPE: Record<DetailedOutlineAct, string> = {
  opening: '入局钩子',
  midpoint: '升级钩子',
  climax: '反转钩子',
  ending: '收束钩子'
}

// With 30 episodes, acts can have 7-8 episodes each (vs 2-3 for 10-ep).
// Output tokens must scale to fit the larger act payloads.
const DETAILED_OUTLINE_ACT_MAX_OUTPUT_TOKENS = 6000

// Batch size for detailed outline generation (matches script generation batch)
const DETAILED_OUTLINE_BATCH_SIZE = 5

interface DetailedOutlineActPlan {
  act: DetailedOutlineAct
  startEpisode: number
  endEpisode: number
  episodes: OutlineEpisodeDto[]
}

interface DetailedOutlineActPayload {
  summary?: string
  episodes?: Array<{
    episodeNo?: number
    summary?: string
    sceneByScene?: Array<{
      sceneNo?: number
      location?: string
      timeOfDay?: string
      setup?: string
      tension?: string
      hookEnd?: string
    }>
  }>
}

type InvokeDetailedOutlineActFn = (input: {
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  storyIntent?: StoryIntentPackageDto | null
  plan: DetailedOutlineActPlan
  previousActSummary?: string
  runtimeConfig: RuntimeProviderConfig
  diagnosticLogger?: DetailedOutlineDiagnosticLogger
  signal?: AbortSignal
}) => Promise<DetailedOutlineSegmentDto>

type DecorateSegmentWithEpisodeControlCardsFn = (input: {
  storyIntent?: StoryIntentPackageDto | null
  outline: OutlineDraftDto
  segment: DetailedOutlineSegmentDto
  characters: CharacterDraftDto[]
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
}) => Promise<DetailedOutlineSegmentDto>

export type DetailedOutlineDiagnosticLogger = (message: string) => Promise<void>

function emitDetailedOutlineDiagnostic(
  logger: DetailedOutlineDiagnosticLogger | undefined,
  message: string
): void {
  if (!logger) return

  try {
    void Promise.resolve(logger(message)).catch(() => undefined)
  } catch {
    // 诊断日志只能旁路记录，不能反过来打断正式生成链。
  }
}

function normalizeWhitespace(text: string): string {
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .trim()
}

function parseDetailedOutlinePayload(text: string): DetailedOutlineActPayload | null {
  const parsed = tryParseObject(text)
  if (!parsed) return null
  return parsed as DetailedOutlineActPayload
}

function normalizeSegmentContent(value: unknown, fallback: string): string {
  return normalizeWhitespace(typeof value === 'string' ? value : '') || fallback
}

function normalizeSceneText(value: unknown): string {
  return normalizeWhitespace(typeof value === 'string' ? value : '')
}

function normalizeSceneByScene(value: unknown): DetailedOutlineEpisodeBeatDto['sceneByScene'] {
  if (!Array.isArray(value)) return []

  return value
    .map((item, index) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
      return {
        sceneNo:
          Number.isFinite(Number(record.sceneNo)) && Number(record.sceneNo) > 0
            ? Math.floor(Number(record.sceneNo))
            : index + 1,
        location: normalizeSceneText(record.location),
        timeOfDay: normalizeSceneText(record.timeOfDay),
        setup: normalizeSceneText(record.setup),
        tension: normalizeSceneText(record.tension),
        hookEnd: normalizeSceneText(record.hookEnd)
      }
    })
    .filter(
      (scene) => scene.setup || scene.tension || scene.hookEnd || scene.location || scene.timeOfDay
    )
}

function normalizeEpisodeBeats(value: unknown): DetailedOutlineEpisodeBeatDto[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item, index) => {
      const record = item && typeof item === 'object' ? (item as Record<string, unknown>) : {}
      const rawEpisodeNo = Number(record.episodeNo)
      const episodeNo =
        Number.isFinite(rawEpisodeNo) && rawEpisodeNo > 0 ? Math.floor(rawEpisodeNo) : index + 1
      const summary = normalizeWhitespace(typeof record.summary === 'string' ? record.summary : '')
      const sceneByScene = normalizeSceneByScene(record.sceneByScene)
      return { episodeNo, summary, sceneByScene }
    })
    .filter((item) => item.summary || item.sceneByScene?.length)
    .sort((left, right) => left.episodeNo - right.episodeNo)
}

function extractActSummary(
  payload: DetailedOutlineActPayload | undefined,
  fallback: string
): string {
  return normalizeSegmentContent(payload?.summary, fallback)
}

function extractActEpisodes(
  payload: DetailedOutlineActPayload | undefined,
  fallback: DetailedOutlineEpisodeBeatDto[]
): DetailedOutlineEpisodeBeatDto[] {
  const normalized = normalizeEpisodeBeats(payload?.episodes)
  const hasStructuredScenes = normalized.some((episode) => (episode.sceneByScene?.length || 0) > 0)
  return normalized.length > 0 && hasStructuredScenes ? normalized : fallback
}

function normalizeEpisodeNo(value: number | undefined, fallback: number): number {
  return Number.isFinite(value) && (value || 0) > 0 ? Math.floor(value as number) : fallback
}

function hasExactEpisodeCoverage(
  episodeBeats: DetailedOutlineEpisodeBeatDto[],
  startEpisode: number,
  endEpisode: number
): boolean {
  const expectedEpisodeNos = Array.from(
    { length: endEpisode - startEpisode + 1 },
    (_, index) => startEpisode + index
  )
  if (episodeBeats.length !== expectedEpisodeNos.length) return false

  const actualEpisodeNos = episodeBeats
    .map((episode, index) => normalizeEpisodeNo(episode.episodeNo, startEpisode + index))
    .sort((left, right) => left - right)

  return expectedEpisodeNos.every((episodeNo, index) => actualEpisodeNos[index] === episodeNo)
}

export function isDetailedOutlineActResultComplete(input: {
  segment: DetailedOutlineSegmentDto
  startEpisode: number
  endEpisode: number
}): boolean {
  if (!normalizeWhitespace(input.segment.content)) return false

  const episodeBeats = Array.isArray(input.segment.episodeBeats) ? input.segment.episodeBeats : []
  if (!hasExactEpisodeCoverage(episodeBeats, input.startEpisode, input.endEpisode)) return false

  return episodeBeats.every((episode) => {
    if (!normalizeWhitespace(episode.summary)) return false
    return Array.isArray(episode.sceneByScene) && episode.sceneByScene.length > 0
  })
}

export function isDetailedOutlineModelResultComplete(
  segments: DetailedOutlineSegmentDto[],
  expectedTotalEpisodes?: number
): boolean {
  if (!Array.isArray(segments) || segments.length !== 4) return false

  // FAIL-CLOSED: Check total episode coverage if expected count provided
  if (expectedTotalEpisodes !== undefined) {
    const totalEpisodeBeats = segments.reduce(
      (sum, seg) => sum + (seg.episodeBeats?.length ?? 0),
      0
    )
    if (totalEpisodeBeats < expectedTotalEpisodes) return false
  }

  return segments.every((segment) => {
    if (!normalizeWhitespace(segment.content)) return false
    if (!Array.isArray(segment.episodeBeats) || segment.episodeBeats.length === 0) return false

    return segment.episodeBeats.every((episode) => {
      if (!normalizeWhitespace(episode.summary)) return false
      return Array.isArray(episode.sceneByScene) && episode.sceneByScene.length > 0
    })
  })
}

interface DetailedOutlineBatchPlan {
  act: DetailedOutlineAct
  actIndex: number
  startEpisode: number
  endEpisode: number
  episodes: OutlineEpisodeDto[]
  isLastBatchInAct: boolean
}

function buildDetailedOutlineBatchPlans(outline: OutlineDraftDto): DetailedOutlineBatchPlan[] {
  const totalEpisodes = deriveOutlineEpisodeCount(outline, outline.summaryEpisodes.length || 0)
  const actRanges = buildFourActEpisodeRanges(totalEpisodes)
  const batchPlans: DetailedOutlineBatchPlan[] = []

  actRanges.forEach((range, actIndex) => {
    const act = DETAILED_OUTLINE_ACT_ORDER[actIndex]
    let batchStart = range.startEpisode

    while (batchStart <= range.endEpisode) {
      const batchEnd = Math.min(batchStart + DETAILED_OUTLINE_BATCH_SIZE - 1, range.endEpisode)
      const episodes = outline.summaryEpisodes.filter(
        (episode) => episode.episodeNo >= batchStart && episode.episodeNo <= batchEnd
      )
      batchPlans.push({
        act,
        actIndex,
        startEpisode: batchStart,
        endEpisode: batchEnd,
        episodes,
        isLastBatchInAct: batchEnd === range.endEpisode
      })
      batchStart = batchEnd + 1
    }
  })

  return batchPlans
}

export function normalizeDetailedOutlineSourceOutline(outline: OutlineDraftDto): OutlineDraftDto {
  const totalEpisodes = deriveOutlineEpisodeCount(outline, outline.summaryEpisodes.length || 0)
  return ensureOutlineEpisodeShape(outline, totalEpisodes)
}

async function invokeDetailedOutlineAct(input: {
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  storyIntent?: StoryIntentPackageDto | null
  plan: DetailedOutlineActPlan
  previousActSummary?: string
  runtimeConfig: RuntimeProviderConfig
  diagnosticLogger?: DetailedOutlineDiagnosticLogger
  signal?: AbortSignal
}): Promise<DetailedOutlineSegmentDto> {
  const timeoutMs = resolveAiStageTimeoutMs('detailed_outline')
  const prompt = buildDetailedOutlineActPrompt({
    outline: input.outline,
    characters: input.characters,
    storyIntent: input.storyIntent,
    act: input.plan.act,
    startEpisode: input.plan.startEpisode,
    endEpisode: input.plan.endEpisode,
    episodes: input.plan.episodes,
    previousActSummary: input.previousActSummary
  })
  const startedAt = Date.now()
  let responseChars = 0
  let responseHead = ''
  let responseTail = ''
  let lane = 'unknown'
  let model = 'unknown'
  let finishReason = 'unknown'

  emitDetailedOutlineDiagnostic(
    input.diagnosticLogger,
    `act_start act=${input.plan.act} range=${input.plan.startEpisode}-${input.plan.endEpisode} promptChars=${prompt.length} timeoutMs=${timeoutMs} maxOutputTokens=${DETAILED_OUTLINE_ACT_MAX_OUTPUT_TOKENS}`
  )

  try {
    const result = await generateTextWithRuntimeRouter(
      {
        task: 'detailed_outline',
        prompt,
        allowFallback: false,
        responseFormat: 'json_object',
        temperature: 0.45,
        timeoutMs,
        maxOutputTokens: DETAILED_OUTLINE_ACT_MAX_OUTPUT_TOKENS,
        runtimeHints: {
          totalEpisodes: input.outline.summaryEpisodes.length,
          episode: input.plan.startEpisode,
          strictness: 'strict'
        }
      },
      input.runtimeConfig,
      { signal: input.signal }
    )

    lane = result.lane
    model = result.model
    finishReason = result.finishReason || 'unknown'
    responseChars = result.text.length
    const normalizedResponse = result.text.replace(/\s+/g, ' ').trim()
    responseHead = normalizedResponse.slice(0, 240)
    responseTail = normalizedResponse.slice(-240)

    const parsedPayload = parseDetailedOutlinePayload(result.text)
    if (!parsedPayload) {
      throw new Error(`detailed_outline_parse_failed:${input.plan.act}`)
    }

    const segment: DetailedOutlineSegmentDto = {
      act: input.plan.act,
      startEpisode: input.plan.startEpisode,
      endEpisode: input.plan.endEpisode,
      content: extractActSummary(payload, ''),
      hookType: DETAILED_OUTLINE_ACT_HOOK_TYPE[input.plan.act],
      episodeBeats: extractActEpisodes(payload, [])
    }

    if (
      !isDetailedOutlineActResultComplete({
        segment,
        startEpisode: input.plan.startEpisode,
        endEpisode: input.plan.endEpisode
      })
    ) {
      throw new Error(`detailed_outline_model_incomplete:${input.plan.act}`)
    }

    emitDetailedOutlineDiagnostic(
      input.diagnosticLogger,
      `act_finish act=${input.plan.act} range=${input.plan.startEpisode}-${input.plan.endEpisode} elapsedMs=${Date.now() - startedAt} lane=${lane} model=${model} finishReason=${finishReason} responseChars=${responseChars} responseHead=${responseHead} responseTail=${responseTail}`
    )

    return segment
  } catch (error) {
    emitDetailedOutlineDiagnostic(
      input.diagnosticLogger,
      `act_fail act=${input.plan.act} range=${input.plan.startEpisode}-${input.plan.endEpisode} elapsedMs=${Date.now() - startedAt} lane=${lane} model=${model} finishReason=${finishReason} responseChars=${responseChars} responseHead=${responseHead} responseTail=${responseTail} error=${error instanceof Error ? error.message : String(error)}`
    )
    throw error instanceof Error ? error : new Error(String(error || 'detailed_outline_failed'))
  }
}

export async function generateDetailedOutlineFromContext(
  input: {
    outline: OutlineDraftDto
    characters: CharacterDraftDto[]
    entityStore?: ProjectEntityStoreDto | null
    storyIntent?: StoryIntentPackageDto | null
    runtimeConfig: RuntimeProviderConfig
    diagnosticLogger?: DetailedOutlineDiagnosticLogger
    signal?: AbortSignal
  },
  deps: {
    invokeAct?: InvokeDetailedOutlineActFn
    decorateSegmentWithEpisodeControlCards?: DecorateSegmentWithEpisodeControlCardsFn
  } = {}
): Promise<{
  segments: DetailedOutlineSegmentDto[]
  source: DetailedOutlineSource
  diagnostic: string
}> {
  const normalizedOutline = normalizeDetailedOutlineSourceOutline(input.outline)
  const batchPlans = buildDetailedOutlineBatchPlans(normalizedOutline)
  const invokeAct = deps.invokeAct ?? invokeDetailedOutlineAct
  const decorateSegmentWithEpisodeControlCards =
    deps.decorateSegmentWithEpisodeControlCards ?? generateEpisodeControlCardsForSegment

  try {
    const totalEpisodes = deriveOutlineEpisodeCount(normalizedOutline)
    const actRanges = buildFourActEpisodeRanges(totalEpisodes)
    const actEpisodeBeats: Array<DetailedOutlineEpisodeBeatDto[]> = [[], [], [], []]
    const actSummaries: string[] = ['', '', '', '']

    for (const batch of batchPlans) {
      if (batch.episodes.length === 0) {
        throw new Error(
          `detailed_outline_missing_batch_range:${batch.act}-${batch.startEpisode}-${batch.endEpisode}`
        )
      }

      const previousActSummary = batch.actIndex > 0 ? actSummaries[batch.actIndex - 1] : ''
      const activeCharacterPackage = deriveActiveCharacterPackage({
        outline: normalizedOutline,
        characterDrafts: input.characters,
        entityStore: input.entityStore,
        startEpisode: batch.startEpisode,
        endEpisode: batch.endEpisode,
        batchNo: batch.actIndex + 1
      })

      const segment = await invokeAct({
        outline: normalizedOutline,
        characters:
          activeCharacterPackage.characters.length > 0
            ? activeCharacterPackage.characters
            : input.characters,
        storyIntent: input.storyIntent,
        plan: {
          act: batch.act,
          startEpisode: batch.startEpisode,
          endEpisode: batch.endEpisode,
          episodes: batch.episodes
        },
        previousActSummary,
        runtimeConfig: input.runtimeConfig,
        diagnosticLogger: input.diagnosticLogger,
        signal: input.signal
      })
      const segmentWithControlCards = await decorateSegmentWithEpisodeControlCards({
        storyIntent: input.storyIntent,
        outline: normalizedOutline,
        segment,
        characters:
          activeCharacterPackage.characters.length > 0
            ? activeCharacterPackage.characters
            : input.characters,
        runtimeConfig: input.runtimeConfig,
        signal: input.signal
      })

      // Merge episodeBeats into the act
      if (segmentWithControlCards.episodeBeats) {
        actEpisodeBeats[batch.actIndex].push(...segmentWithControlCards.episodeBeats)
      }

      // Update act summary if this is the last batch in the act
      if (batch.isLastBatchInAct && segmentWithControlCards.content) {
        actSummaries[batch.actIndex] = segmentWithControlCards.content
      }
    }

    // Build final segments from merged batches
    const segments: DetailedOutlineSegmentDto[] = DETAILED_OUTLINE_ACT_ORDER.map((act, index) => {
      const range = actRanges[index]
      return {
        act,
        startEpisode: range.startEpisode,
        endEpisode: range.endEpisode,
        content: actSummaries[index],
        hookType: DETAILED_OUTLINE_ACT_HOOK_TYPE[act],
        episodeBeats: actEpisodeBeats[index]
      }
    })

    if (!isDetailedOutlineModelResultComplete(segments, totalEpisodes)) {
      throw new Error('detailed_outline_model_incomplete')
    }

    return {
      segments,
      source: 'model',
      diagnostic: `router_ok:model:batches=${batchPlans.length}`
    }
  } catch (error) {
    throw new Error(
      `detailed_outline_generation_failed:${error instanceof Error ? error.message : String(error)}`
    )
  }
}
