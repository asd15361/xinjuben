/**
 * src/main/application/script-generation/runtime/run-script-generation-batch.ts
 *
 * CURRENT PRODUCTION ENTRY for episode-level script generation.
 * This is the official batch runner that produces full episode screenplays.
 *
 * Production path:
 * start-script-generation -> run-script-generation-batch -> create-script-generation-prompt -> parse-generated-scene -> finalize-script-postflight
 *
 * Scene-level alternatives (create-scene-generation-prompt.ts, assemble-episode-scenes.ts)
 * remain prototype-only and are NOT part of this production chain.
 */
import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text.ts'
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../../shared/contracts/workflow'
import type { AiGenerateRequestDto } from '../../../../shared/contracts/ai'
import type {
  ScriptGenerationProgressBoardDto,
  StartScriptGenerationInputDto,
  StartScriptGenerationResultDto
} from '../../../../shared/contracts/script-generation'
import { advanceScriptGenerationState } from '../state-machine.ts'
import { createScriptGenerationPrompt } from '../prompt/create-script-generation-prompt.ts'
import { buildFirstDraftSystemPrompt } from '../prompt/first-draft-system-prompt.ts'
import { parseGeneratedScene } from './parse-generated-scene.ts'
import { selectBatchEpisodesForRun } from './select-script-generation-batch.ts'
import { resolveAiStageTimeoutMs } from '../../ai/resolve-ai-stage-timeout.ts'
import {
  collectEpisodeGuardFailures,
  shouldAcceptRepairCandidate,
  shouldReplaceBestAttempt,
  type EpisodeGuardFailure
} from '../../../../shared/domain/script/screenplay-repair-guard.ts'
import { inspectScreenplayQualityEpisode } from '../../../../shared/domain/script/screenplay-quality.ts'
import { repairScriptSceneWithAgents } from './repair-script-quality-with-agents.ts'
import { parseScreenplayScenes } from '../../../../shared/domain/script/screenplay-format.ts'
import { EPISODE_CHAR_COUNT } from '../../../../shared/domain/workflow/contract-thresholds.ts'
import fs from 'node:fs'
import path from 'node:path'

const MAX_EPISODE_GENERATION_ATTEMPTS = 2

export {
  collectEpisodeGuardFailures,
  shouldAcceptRepairCandidate,
  shouldReplaceBestAttempt
}

export function buildEpisodeRetryPrompt(
  promptText: string,
  failures: EpisodeGuardFailure[]
): string {
  if (failures.length === 0) return promptText
  const lines = failures.map((failure, index) => `${index + 1}. ${failure.detail}`)
  const extraInstructions: string[] = []

  if (failures.some((failure) => failure.code === 'voice_over')) {
    extraInstructions.push(
      '上一版发现了（画外音）/旁白/OS。未进场人物的声音必须改成动作描述，例如：△门外传来某人的喊声：“……”；不能继续写成角色对白行。'
    )
  }

  const charFailure = failures.find((f) => f.code === 'char_count')
  if (charFailure) {
    const detail = charFailure.detail
    if (detail.includes('偏瘦')) {
      extraInstructions.push(
        '字数不够。当前太薄，需要扩充。优先把最短场补实：增加对手交锋、动作结果、局面变化。每场双方各至少1句硬对白，集尾落成已发生的结果。不准只补感叹句和解释句凑字数。'
      )
    } else {
      extraInstructions.push(
        '字数超了。当前太肥，需要压缩。优先删最胖场：删同义对白、重复动作、重复逼问。只删水词，不删实质冲突。集尾钩子不能削弱。'
      )
    }
  }

  return [
    promptText,
    '',
    '【上一版硬失败，必须直接修正后重写】',
    ...lines,
    ...extraInstructions,
    '这次是整集重写，不是局部补丁。先满足场次数、去掉画外音/模板污染，再保证剧情不变。'
  ].join('\n')
}

function resolveRewriteSceneCount(previousScene: ScriptSegmentDto): number {
  return previousScene.screenplayScenes?.length || parseScreenplayScenes(previousScene.screenplay || '').length || 2
}

function buildCharCountRewriteGuidance(
  previousScene: ScriptSegmentDto,
  failures: EpisodeGuardFailure[]
): string[] {
  const charFailure = failures.find((failure) => failure.code === 'char_count')
  if (!charFailure) return []

  const qualityReport = inspectScreenplayQualityEpisode(previousScene)
  const sceneCount = resolveRewriteSceneCount(previousScene)
  const minChars =
    typeof EPISODE_CHAR_COUNT.min === 'function'
      ? EPISODE_CHAR_COUNT.min(sceneCount)
      : EPISODE_CHAR_COUNT.min
  const maxChars = EPISODE_CHAR_COUNT.max

  if (charFailure.detail.includes('偏瘦')) {
    return [
      `- 字数没过。上一版当前约 ${qualityReport.charCount} 字，必须补到 ${minChars}-${maxChars} 字区间内。`,
      '- 补的是硬内容：把最薄的场补出对手回应、动作结果、局面变化，不准靠空解释和感叹句灌水。'
    ]
  }

  return [
    `- 字数没过。上一版当前约 ${qualityReport.charCount} 字，必须压到 ${minChars}-${maxChars} 字区间内。`,
    '- 优先删重复动作、重复逼问、重复解释，只留最有效的一轮冲突；不准为了压字数改剧情事实。'
  ]
}

function buildEpisodeIssueTicket(
  previousScene: ScriptSegmentDto,
  failures: EpisodeGuardFailure[]
): string[] {
  const issueLines = failures.map((failure, index) => `${index + 1}. [${failure.code}] ${failure.detail}`)
  const guidance: string[] = []

  if (failures.some((failure) => failure.code === 'template_pollution')) {
    guidance.push('- 清掉待补、模板、伪剧本壳和重复假场头，只保留真实可拍的动作和对白。')
  }
  if (failures.some((failure) => failure.code === 'scene_count')) {
    guidance.push('- 场次数没过。严格按上一版原有场数和场号改，不准新增场、拆场、并场。')
  }
  if (
    failures.some((failure) =>
      ['missing_roster', 'missing_action', 'insufficient_dialogue', 'thin_scene_body', 'truncated_body'].includes(failure.code)
    )
  ) {
    guidance.push('- 把缺的人物表、△动作、对白和残句补齐，但只补硬内容，不准顺手改掉已成立的剧情推进。')
  }
  if (failures.some((failure) => failure.code === 'voice_over')) {
    guidance.push('- 画外音/旁白/OS 改成可拍动作，不准继续把未进场人物写成直接对白。')
  }
  if (failures.some((failure) => failure.code === 'legacy_marker')) {
    guidance.push('- 删掉 Action:/Dialogue:/Emotion: 这类旧标签，只输出剧本正文。')
  }
  if (failures.some((failure) => failure.code === 'inner_monologue')) {
    guidance.push('- 把心理描写改成角色可见动作、对白或现场结果。')
  }

  return [
    '【这次没过的硬问题】',
    ...issueLines,
    ...buildCharCountRewriteGuidance(previousScene, failures),
    ...guidance
  ]
}

export function buildEpisodeEditPrompt(input: {
  previousScene: ScriptSegmentDto
  failures: EpisodeGuardFailure[]
}): string {
  const { previousScene, failures } = input
  const sceneCount = resolveRewriteSceneCount(previousScene)

  const editLines = [
    '【上一版成稿改稿任务】',
    `- 当前是第 ${previousScene.sceneNo} 集的自动改稿，而且这次只自动改这一次。`,
    `- 当前场数 ${sceneCount} 场，场数和剧情事实必须保持不变。`,
    '- 你不是整集瞎重写，而是对着下面这版原稿，按问题单把没过的位置改对。'
  ]

  editLines.push(
    '- 先通读下面这版原稿，再在这版原稿基础上直接改，不要重新发明新写法，不要换剧情，不要换场次。'
  )
  editLines.push('- 只输出修改后的完整剧本正文，不要解释，不要分析，不要列改动说明。')
  editLines.push(
    '- 必须保留「第X集」标题、原有场号、人物表、△动作和对白格式；禁止输出 Action:/Dialogue:/Emotion: 这类旧三段标签。'
  )
  editLines.push(...buildEpisodeIssueTicket(previousScene, failures))
  editLines.push('【必须改的上一版原稿】')
  editLines.push(previousScene.screenplay || '')

  return [
    `你现在不是从零创作第 ${previousScene.sceneNo} 集，而是在修改上一版已经写出的成稿。`,
    '任务只有一个：在不改剧情事实、不改场次、不改承接关系的前提下，把它按问题单修回正式合同。',
    ...editLines
  ].join('\n')
}

export function pickEpisodeRetryMode(
  failures: EpisodeGuardFailure[]
): 'retry_parse' | 'retry_coverage' | 'retry_runtime' {
  if (
    failures.some(
      (failure) => failure.code === 'scene_count' || failure.code === 'template_pollution'
    )
  ) {
    return 'retry_parse'
  }
  return 'retry_runtime'
}

function resolveEpisodeAttemptTemperature(input: {
  episodeNo: number
  runtimeHints?: AiGenerateRequestDto['runtimeHints']
  rewriteMode: boolean
}): number {
  if (input.rewriteMode) return 0.45
  if (input.runtimeHints?.recoveryMode === 'retry_parse') return 0.45
  if (input.runtimeHints?.recoveryMode === 'retry_coverage') return 0.55
  if (input.runtimeHints?.recoveryMode === 'retry_runtime') return 0.6
  if (input.episodeNo === 1) return 0.45
  if (input.runtimeHints?.strictness === 'strict') return 0.65
  return 0.78
}

export function buildEpisodeAttemptRequest(input: {
  attempt: number
  basePromptText: string
  bestAttempt: {
    parsedScene: ScriptSegmentDto
    rawText: string
    promptLength: number
    failures: EpisodeGuardFailure[]
  } | null
  episodeNo: number
  runtimeHints?: AiGenerateRequestDto['runtimeHints']
}): {
  task: AiGenerateRequestDto['task']
  prompt: string
  runtimeHints?: AiGenerateRequestDto['runtimeHints']
  temperature: number
  timeoutMs: number
} {
  const rewriteMode = input.attempt > 1 && !!input.bestAttempt
  const retryFailures = input.bestAttempt?.failures || []
  const nextRuntimeHints = !rewriteMode
    ? input.runtimeHints
    : {
        ...input.runtimeHints,
        recoveryMode: pickEpisodeRetryMode(retryFailures),
        strictness: 'strict' as const,
        isRewriteMode: true
      }
  const task: AiGenerateRequestDto['task'] = rewriteMode ? 'episode_rewrite' : 'episode_script'
  const prompt = !rewriteMode
    ? input.basePromptText
    : buildEpisodeEditPrompt({
        previousScene: input.bestAttempt!.parsedScene,
        failures: retryFailures
      })

  return {
    task,
    prompt,
    runtimeHints: nextRuntimeHints,
    temperature: resolveEpisodeAttemptTemperature({
      episodeNo: input.episodeNo,
      runtimeHints: nextRuntimeHints,
      rewriteMode
    }),
    timeoutMs: resolveAiStageTimeoutMs(task, nextRuntimeHints)
  }
}

function writeEpisodeEvidenceIfEnabled(
  episodeNo: number,
  attempt: number,
  task: AiGenerateRequestDto['task'],
  rawText: string,
  promptLength: number,
  parsedScene: ScriptSegmentDto,
  failures: EpisodeGuardFailure[]
): void {
  const caseId = process.env.E2E_CASE_ID
  if (!caseId) return
  try {
    // Keep rawText truncation at 8000 to avoid filling disk with debug evidence.
    // Truncation is detectable via rawTextLength > 8000 or explicit `truncated` flag.
    const RAW_TEXT_MAX = 8000
    const isTruncated = rawText.length > RAW_TEXT_MAX

    // Quality charCount is the ONLY official word-count contract for this evidence file.
    // It comes from the same source as inspectScreenplayQualityEpisode, ensuring
    // evidence reports, summary files, and quality gate all agree on the same number.
    // parsedLength (A/D/E sum) is debug-only and must NOT be used as a quality metric.
    const qualityReport = inspectScreenplayQualityEpisode(parsedScene)

    const evidence = {
      episodeNo,
      attempt,
      task,
      timestamp: new Date().toISOString(),
      promptLength,
      rawTextLength: rawText.length,
      rawText: rawText.substring(0, RAW_TEXT_MAX),
      truncated: isTruncated,
      failures,
      // Official production word-count contract — same algorithm as inspectScreenplayQualityEpisode
      qualityCharCount: qualityReport.charCount,
      pass: qualityReport.pass,
      // parsedLength is retained as a debug field ONLY. It is NOT a quality contract.
      // Do not reference it in reports, summaries, or quality gates.
      debugParsedLength: (parsedScene.action + parsedScene.dialogue + parsedScene.emotion).length,
      parsed: {
        sceneNo: parsedScene.sceneNo,
        actionLength: parsedScene.action.length,
        dialogueLength: parsedScene.dialogue.length,
        emotionLength: parsedScene.emotion.length,
        actionPreview: parsedScene.action.substring(0, 100),
        dialoguePreview: parsedScene.dialogue.substring(0, 100),
        emotionPreview: parsedScene.emotion.substring(0, 100)
      },
      screenplayScenes: parsedScene.screenplayScenes
        ? parsedScene.screenplayScenes.map((s) => ({
            sceneCode: s.sceneCode ?? '',
            heading: s.sceneHeading ?? '',
            characterRoster: s.characterRoster ?? [],
            bodyLength: (s.body || '').length
          }))
        : undefined
    }
    const outDir = path.join(process.cwd(), 'tools', 'e2e', 'out', `evidence-${caseId}`)
    fs.mkdirSync(outDir, { recursive: true })
    const latestPath = path.join(outDir, `ep${episodeNo}-evidence.json`)
    const attemptPath = path.join(outDir, `ep${episodeNo}-attempt${attempt}.json`)
    const payload = JSON.stringify(evidence, null, 2)
    fs.writeFileSync(latestPath, payload, 'utf8')
    fs.writeFileSync(attemptPath, payload, 'utf8')
  } catch {
    // non-blocking — evidence is optional
  }
}

interface EpisodeSummaryStats {
  attemptCount: number
  qualityCharCount: number
  pass: boolean
  thin: boolean
  fat: boolean
  rewrite: boolean
  sceneCount: number
}

function writeEpisodeSummaryStatsIfEnabled(
  episodeNo: number,
  stats: EpisodeSummaryStats
): void {
  const caseId = process.env.E2E_CASE_ID
  if (!caseId) return
  try {
    const outDir = path.join(process.cwd(), 'tools', 'e2e', 'out', `evidence-${caseId}`)
    fs.mkdirSync(outDir, { recursive: true })
    const statsPath = path.join(outDir, `ep${episodeNo}-summary.json`)
    fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2), 'utf8')
  } catch {
    // non-blocking
  }
}

export async function runScriptGenerationBatch(input: {
  generationInput: StartScriptGenerationInputDto
  runtimeConfig: RuntimeProviderConfig
  board: ScriptGenerationProgressBoardDto
  outline: OutlineDraftDto
  characters: CharacterDraftDto[]
  existingScript: ScriptSegmentDto[]
  beforeEpisode?: (payload: { episodeNo: number }) => Promise<void>
  onProgress?: (payload: {
    phase: 'generate_batch'
    detail: string
    board: ScriptGenerationProgressBoardDto
  }) => void
  generateText?: typeof generateTextWithRuntimeRouter
  enableImmediateRepair?: boolean
}): Promise<{
  board: ScriptGenerationProgressBoardDto
  generatedScenes: StartScriptGenerationResultDto['generatedScenes']
  /** Raw AI output text per episode — used for evidence logging only, not part of production logic */
  rawTexts?: Array<{ episodeNo: number; text: string; promptLength: number }>
  failure?: {
    episodeNo: number
    message: string
  }
}> {
  // Current production script-generation entry. Scene-level prototype helpers are not used here.
  let board = input.board
  const readyEpisodes = selectBatchEpisodesForRun(input.generationInput.plan, board)
  const generatedScenes: StartScriptGenerationResultDto['generatedScenes'] = []
  const rawTexts: Array<{ episodeNo: number; text: string; promptLength: number }> = []
  const generateText = input.generateText ?? generateTextWithRuntimeRouter
  const enableImmediateRepair = input.enableImmediateRepair !== false

  if (readyEpisodes.length === 0) {
    return {
      board,
      generatedScenes
    }
  }

  for (const episode of readyEpisodes) {
    if (input.beforeEpisode) {
      await input.beforeEpisode({ episodeNo: episode.episodeNo })
    }

    board = advanceScriptGenerationState(board, {
      type: 'episode_started',
      episodeNo: episode.episodeNo,
      reason: '当前集进入生成中。'
    })
    input.onProgress?.({
      phase: 'generate_batch',
      detail: `第${episode.episodeNo}集开始生成`,
      board
    })

    try {
      const basePromptText = createScriptGenerationPrompt(
        {
          ...input.generationInput,
          existingScript: [...input.generationInput.existingScript, ...generatedScenes]
        },
        input.outline,
        input.characters,
        episode.episodeNo,
        generatedScenes
      )

      let bestAttempt: {
        parsedScene: ScriptSegmentDto
        rawText: string
        promptLength: number
        failures: EpisodeGuardFailure[]
      } | null = null
      let episodeAttemptCount = 0

      for (let attempt = 1; attempt <= MAX_EPISODE_GENERATION_ATTEMPTS; attempt += 1) {
        episodeAttemptCount = attempt
        const attemptRequest = buildEpisodeAttemptRequest({
          attempt,
          basePromptText,
          bestAttempt,
          episodeNo: episode.episodeNo,
          runtimeHints: episode.runtimeHints
        })

        const result = await generateText(
          {
            task: attemptRequest.task,
            prompt: attemptRequest.prompt,
            systemInstruction: buildFirstDraftSystemPrompt(),
            preferredLane: episode.lane,
            allowFallback: false,
            temperature: attemptRequest.temperature,
            timeoutMs: attemptRequest.timeoutMs,
            runtimeHints: attemptRequest.runtimeHints
          },
          input.runtimeConfig
        )

        rawTexts.push({
          episodeNo: episode.episodeNo,
          text: result.text,
          promptLength: attemptRequest.prompt.length
        })

        const parsedScene = parseGeneratedScene(result.text, episode.episodeNo)
        const failures = collectEpisodeGuardFailures(parsedScene)
        writeEpisodeEvidenceIfEnabled(
          episode.episodeNo,
          attempt,
          attemptRequest.task,
          result.text,
          attemptRequest.prompt.length,
          parsedScene,
          failures
        )

        const shouldTakeCandidate =
          !bestAttempt ||
          (attempt === 1
            ? shouldReplaceBestAttempt(bestAttempt, { failures })
            : shouldAcceptRepairCandidate(bestAttempt.parsedScene, parsedScene))

        if (shouldTakeCandidate) {
          bestAttempt = {
            parsedScene,
            rawText: result.text,
            promptLength: attemptRequest.prompt.length,
            failures
          }
        }

        if (failures.length === 0) {
          break
        }
      }

      // Compute final quality stats from the same source as quality gate.
      // thin/fat is determined by final scene charCount vs. contract for that scene count.
      // No second measurement source — this is the single source of truth.
      const finalQualityReport = inspectScreenplayQualityEpisode(bestAttempt!.parsedScene)
      const finalCharCount = finalQualityReport.charCount
      const finalSceneCount =
        bestAttempt!.parsedScene.screenplayScenes?.length ||
        parseScreenplayScenes(finalQualityReport.screenplay).length ||
        2
      const charMin =
        typeof EPISODE_CHAR_COUNT.min === 'function'
          ? EPISODE_CHAR_COUNT.min(finalSceneCount)
          : EPISODE_CHAR_COUNT.min
      const isThin = finalCharCount < charMin
      const isFat = finalCharCount > EPISODE_CHAR_COUNT.max
      const didRewrite = episodeAttemptCount > 1

      // Write final episode-level stats (one per episode, not per attempt).
      // These are the single source of truth for passRate, thin/fat counts, attempt totals.
      // All downstream reporting (summary files, quality gates, archive) must read from here.
      if (process.env.E2E_CASE_ID) {
        writeEpisodeSummaryStatsIfEnabled(episode.episodeNo, {
          attemptCount: episodeAttemptCount,
          qualityCharCount: finalCharCount,
          pass: finalQualityReport.pass,
          thin: isThin,
          fat: isFat,
          rewrite: didRewrite,
          sceneCount: finalSceneCount
        })
      }

      if (!bestAttempt) {
        throw new Error('script_generation_episode_missing_attempt')
      }

      const phaseARepairResult = enableImmediateRepair
        ? await repairScriptSceneWithAgents({
            generationInput: {
              ...input.generationInput,
              existingScript: [...input.generationInput.existingScript, ...generatedScenes]
            },
            runtimeConfig: input.runtimeConfig,
            scene: bestAttempt.parsedScene,
            generateText
          })
        : {
            repairedScene: bestAttempt.parsedScene,
            appliedAgents: [] as string[]
          }

      generatedScenes.push(phaseARepairResult.repairedScene)
      board = advanceScriptGenerationState(board, {
        type: 'episode_completed',
        episodeNo: episode.episodeNo,
        reason:
          phaseARepairResult.appliedAgents.length === 0
            ? `已生成并收成当前最佳稿，使用 ${episode.lane}`
            : `已生成并完成首轮 Agent 收口（${phaseARepairResult.appliedAgents.join(' -> ')}），使用 ${episode.lane}`
      })
      input.onProgress?.({
        phase: 'generate_batch',
        detail: `第${episode.episodeNo}集生成完成`,
        board
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'unknown_error')
      board = advanceScriptGenerationState(board, {
        type: 'episode_failed',
        episodeNo: episode.episodeNo,
        reason: `批次失败：${errorMessage}`
      })
      input.onProgress?.({
        phase: 'generate_batch',
        detail: `第${episode.episodeNo}集生成失败`,
        board
      })
      return {
        board,
        generatedScenes,
        rawTexts,
        failure: {
          episodeNo: episode.episodeNo,
          message: errorMessage
        }
      }
    }
  }

  return {
    board,
    generatedScenes,
    rawTexts
  }
}
