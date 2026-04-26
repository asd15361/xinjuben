import type { RuntimeProviderConfig } from '../../../infrastructure/runtime-env/provider-config'
import { generateTextWithRuntimeRouter } from '../../ai/generate-text'
import type {
  CharacterDraftDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '@shared/contracts/workflow'
import type { AiGenerateRequestDto } from '@shared/contracts/ai'
import type {
  ScriptGenerationProgressBoardDto,
  StartScriptGenerationInputDto,
  StartScriptGenerationResultDto
} from '@shared/contracts/script-generation'
import { advanceScriptGenerationState } from '../state-machine'
import { createScriptGenerationPrompt } from '../prompt/create-script-generation-prompt'
import { resolveProjectMarketPlaybook } from '@shared/domain/market-playbook/playbook-prompt-block'
import { buildFirstDraftSystemPrompt } from '../prompt/first-draft-system-prompt'
import { parseGeneratedScene } from './parse-generated-scene'
import { selectBatchEpisodesForRun } from './select-script-generation-batch'
import { resolveAiStageTimeoutMs } from '../../ai/resolve-ai-stage-timeout'
import {
  collectEpisodeGuardFailures,
  shouldAcceptRepairCandidate,
  shouldReplaceBestAttempt,
  type EpisodeGuardFailure
} from '@shared/domain/script/screenplay-repair-guard'
import { inspectScreenplayQualityEpisode } from '@shared/domain/script/screenplay-quality'
import {
  inspectContentQualityEpisode,
  buildContentRepairSignals,
  type ContentRepairSignal,
  type ContentQualitySignal
} from '@shared/domain/script/screenplay-content-quality'
import { parseScreenplayScenes } from '@shared/domain/script/screenplay-format'
import { EPISODE_CHAR_COUNT } from '@shared/domain/workflow/contract-thresholds'
import {
  detectStrategyContamination,
  resolveGenerationStrategy
} from '@shared/domain/generation-strategy/generation-strategy'

/** 内容质量低分项阈值 */
const CONTENT_REPAIR_THRESHOLD = 50

/** 定向修稿提示：按低分项生成（问题清单式） */
export function buildContentRepairPrompt(
  scene: ScriptSegmentDto,
  signals: ContentRepairSignal[],
  signal?: ContentQualitySignal
): string {
  const lines: string[] = [
    `你正在修第${scene.sceneNo}集短剧剧本。只输出修完后的纯剧本，不要输出修稿说明。`,
    '',
    `【本集市场定位】`
  ]

  if (signal?.marketQuality) {
    const laneLabel = signal.marketQuality.audienceLane === 'male' ? '男频' : '女频'
    lines.push(`${laneLabel}：${signal.marketQuality.subgenre}`)
    const highDims = signal.marketQuality.dimensions
      .filter((d) => d.score >= 50)
      .map((d) => d.label)
    if (highDims.length > 0) {
      lines.push(`核心爽点：${highDims.join('、')}`)
    }
  } else {
    lines.push('（无市场定位信息）')
  }
  lines.push('')

  lines.push('【必须修复的问题】')
  for (let i = 0; i < signals.length; i += 1) {
    const s = signals[i]
    lines.push(`${i + 1}. 问题：${s.title}`)
    lines.push(`   - 当前分：${s.score}，低于${CONTENT_REPAIR_THRESHOLD}分线`)
    if (s.evidence.length > 0) {
      lines.push(`   - 证据：${s.evidence.slice(0, 2).join('；')}`)
    }
    lines.push(`   - 修复要求：${s.repairInstruction}`)
    lines.push('')
  }

  lines.push('【不可破坏】')
  lines.push('- 保留本集原本的剧情事实')
  lines.push('- 保留已建立的人物关系')
  lines.push('- 不新增无法承接的设定')
  if (signal?.marketQuality) {
    const laneLabel = signal.marketQuality.audienceLane === 'male' ? '男频' : '女频'
    lines.push(`- 保持${laneLabel}风格，不偏离定位`)
  }
  lines.push('- 不输出修稿说明')
  lines.push('')
  lines.push('只输出修完后的纯剧本正文。')
  lines.push('禁止输出"以下是修稿说明""修改点如下"等内容。')
  lines.push('')
  lines.push('【当前成稿】')
  lines.push(scene.screenplay || '')

  return lines.join('\n')
}

/** 修后回退判断：新质量不下滑才采纳 */
export function shouldAcceptRepair(
  original: ContentQualitySignal,
  repaired: ContentQualitySignal
): boolean {
  if (repaired.overallScore < original.overallScore) return false

  if (original.marketQuality && repaired.marketQuality) {
    if (repaired.marketQuality.score < original.marketQuality.score - 5) return false
  }

  return true
}

const MAX_EPISODE_GENERATION_ATTEMPTS = 2

export { collectEpisodeGuardFailures, shouldAcceptRepairCandidate, shouldReplaceBestAttempt }

function buildSceneStrategyText(scene: ScriptSegmentDto): string {
  const parts: Array<string | undefined> = [
    scene.screenplay,
    scene.action,
    scene.dialogue,
    scene.emotion,
    scene.screenplayScenes
      ?.map((item) =>
        [
          item.sceneCode,
          item.sceneHeading,
          ...(item.characterRoster || []),
          item.body
        ].join('\n')
      )
      .join('\n')
  ]

  return parts
    .filter((part): part is string => typeof part === 'string' && part.trim().length > 0)
    .join('\n')
}

export function collectGenerationStrategyEpisodeGuardFailures(input: {
  scene: ScriptSegmentDto
  generationInput: StartScriptGenerationInputDto
  outline: OutlineDraftDto
}): EpisodeGuardFailure[] {
  const resolution = resolveGenerationStrategy({
    marketProfile: input.generationInput.storyIntent?.marketProfile,
    genre: input.outline.genre,
    storyIntentGenre: [
      input.generationInput.mainConflict,
      input.outline.mainConflict,
      input.outline.summary
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .join('\n'),
    title: input.outline.title || input.generationInput.outlineTitle
  })
  const seen = new Set<string>()

  return detectStrategyContamination(resolution.strategy, buildSceneStrategyText(input.scene))
    .filter((issue) => {
      if (seen.has(issue.term)) return false
      seen.add(issue.term)
      return true
    })
    .map((issue) => ({
      code: 'strategy_contamination',
      detail: `题材串味：当前题材策略「${resolution.strategy.label}」不应出现「${issue.term}」。`
    }))
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
      '上一版发现了（画外音）/旁白/OS。未进场人物的声音必须改成动作描述，例如：△门外传来某人的喊声："……"；不能继续写成角色对白行。'
    )
  }

  if (failures.some((failure) => failure.code === 'strategy_contamination')) {
    extraInstructions.push(
      '上一版出现当前题材禁用词。必须改回当前题材世界里的机构、身份、道具和冲突，不准保留串题材词。'
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
  return (
    previousScene.screenplayScenes?.length ||
    parseScreenplayScenes(previousScene.screenplay || '').length ||
    2
  )
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
  const issueLines = failures.map(
    (failure, index) => `${index + 1}. [${failure.code}] ${failure.detail}`
  )
  const guidance: string[] = []

  if (failures.some((failure) => failure.code === 'template_pollution')) {
    guidance.push('- 清掉待补、模板、伪剧本壳和重复假场头，只保留真实可拍的动作和对白。')
  }
  if (failures.some((failure) => failure.code === 'strategy_contamination')) {
    guidance.push(
      '- 题材串味。只保留当前题材里的机构、身份、道具和冲突；把禁用题材词改成当前题材可用表达。'
    )
  }
  if (failures.some((failure) => failure.code === 'scene_count')) {
    guidance.push('- 场次数没过。严格按上一版原有场数和场号改，不准新增场、拆场、并场。')
  }
  if (
    failures.some((failure) =>
      [
        'missing_roster',
        'missing_action',
        'insufficient_dialogue',
        'thin_scene_body',
        'truncated_body'
      ].includes(failure.code)
    )
  ) {
    guidance.push(
      '- 把缺的人物表、△动作、对白和残句补齐，但只补硬内容，不准顺手改掉已成立的剧情推进。'
    )
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
      (failure) =>
        failure.code === 'scene_count' ||
        failure.code === 'template_pollution' ||
        failure.code === 'strategy_contamination'
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
    generatedScenes: ScriptSegmentDto[]
  }) => void
  generateText?: typeof generateTextWithRuntimeRouter
  enableImmediateRepair?: boolean
}): Promise<{
  board: ScriptGenerationProgressBoardDto
  generatedScenes: StartScriptGenerationResultDto['generatedScenes']
  rawTexts?: Array<{ episodeNo: number; text: string; promptLength: number }>
  failure?: {
    episodeNo: number
    message: string
  }
}> {
  let board = input.board
  const readyEpisodes = selectBatchEpisodesForRun(input.generationInput.plan, board)
  const generatedScenes: StartScriptGenerationResultDto['generatedScenes'] = []
  const rawTexts: Array<{ episodeNo: number; text: string; promptLength: number }> = []
  const generateText = input.generateText ?? generateTextWithRuntimeRouter
  const enableImmediateRepair = input.enableImmediateRepair !== false

  // 解析 MarketPlaybook（B 层），整个批次共用同一个 playbook
  const marketPlaybook = resolveProjectMarketPlaybook({
    marketPlaybookSelection: input.generationInput.marketPlaybookSelection,
    audienceLane: input.generationInput.storyIntent?.marketProfile?.audienceLane,
    subgenre: input.generationInput.storyIntent?.marketProfile?.subgenre,
    customPlaybooks: input.generationInput.customMarketPlaybooks
  })

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
    // Note: Don't persist scriptDraft during episode_started - generatedScenes is still empty
    // Only persist board state, not script content
    if (input.onProgress) {
      await input.onProgress({
        phase: 'generate_batch',
        detail: `第${episode.episodeNo}集开始生成`,
        board,
        generatedScenes: [...generatedScenes]
      })
    }

    try {
      const basePromptText = createScriptGenerationPrompt(
        {
          ...input.generationInput,
          existingScript: [...input.generationInput.existingScript, ...generatedScenes]
        },
        input.outline,
        input.characters,
        episode.episodeNo,
        generatedScenes,
        marketPlaybook
      )

      let bestAttempt: {
        parsedScene: ScriptSegmentDto
        rawText: string
        promptLength: number
        failures: EpisodeGuardFailure[]
      } | null = null

      for (let attempt = 1; attempt <= MAX_EPISODE_GENERATION_ATTEMPTS; attempt += 1) {
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
        const failures = [
          ...collectEpisodeGuardFailures(parsedScene),
          ...collectGenerationStrategyEpisodeGuardFailures({
            scene: parsedScene,
            generationInput: input.generationInput,
            outline: input.outline
          })
        ]

        const shouldTakeCandidate =
          !bestAttempt ||
          (attempt === 1
            ? shouldReplaceBestAttempt(bestAttempt, { failures })
            : shouldAcceptRepairCandidate(bestAttempt.parsedScene, parsedScene, {
                originalFailures: bestAttempt.failures,
                candidateFailures: failures
              }))

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

      if (!bestAttempt) {
        throw new Error('script_generation_episode_missing_attempt')
      }

      // Phase 8.2: 内容质量定向修稿
      let finalScene = bestAttempt.parsedScene
      const appliedAgents: string[] = []

      if (enableImmediateRepair && bestAttempt.failures.length === 0) {
        const marketProfile = input.generationInput.storyIntent?.marketProfile
        const contentSignal = inspectContentQualityEpisode(finalScene, {
          protagonistName: input.outline.protagonist || input.generationInput.storyIntent?.protagonist,
          antagonistName: input.generationInput.storyIntent?.antagonist,
          marketProfile,
          playbook: marketPlaybook
        })
        const repairSignals = buildContentRepairSignals(contentSignal, marketProfile)

        if (repairSignals.length > 0) {
          const repairPrompt = buildContentRepairPrompt(finalScene, repairSignals, contentSignal)
          try {
            const repairResult = await generateText(
              {
                task: 'episode_rewrite',
                prompt: repairPrompt,
                systemInstruction: buildFirstDraftSystemPrompt(),
                preferredLane: episode.lane,
                allowFallback: false,
                temperature: 0.45,
                timeoutMs: resolveAiStageTimeoutMs('episode_rewrite'),
                runtimeHints: { ...episode.runtimeHints, recoveryMode: 'retry_runtime', strictness: 'strict', isRewriteMode: true }
              },
              input.runtimeConfig
            )
            rawTexts.push({
              episodeNo: episode.episodeNo,
              text: repairResult.text,
              promptLength: repairPrompt.length
            })
            const repairedScene = parseGeneratedScene(repairResult.text, episode.episodeNo)
            const repairGuardFailures = [
              ...collectEpisodeGuardFailures(repairedScene),
              ...collectGenerationStrategyEpisodeGuardFailures({
                scene: repairedScene,
                generationInput: input.generationInput,
                outline: input.outline
              })
            ]

            if (repairGuardFailures.length === 0) {
              const repairedSignal = inspectContentQualityEpisode(repairedScene, {
                protagonistName: input.outline.protagonist || input.generationInput.storyIntent?.protagonist,
                antagonistName: input.generationInput.storyIntent?.antagonist,
                marketProfile,
                playbook: marketPlaybook
              })
              // 修后质量不下滑才采纳
              if (shouldAcceptRepair(contentSignal, repairedSignal)) {
                finalScene = repairedScene
                appliedAgents.push(`content_repair:${repairSignals.map(s => s.title).join(',')}`)
              }
            }
          } catch {
            // 修稿失败不阻断，保留原稿
          }
        }
      }

      generatedScenes.push(finalScene)
      board = advanceScriptGenerationState(board, {
        type: 'episode_completed',
        episodeNo: episode.episodeNo,
        reason: `已生成并收成当前最佳稿，使用 ${episode.lane}`
      })
      if (input.onProgress) {
        await input.onProgress({
          phase: 'generate_batch',
          detail: `第${episode.episodeNo}集生成完成`,
          board,
          generatedScenes: [...generatedScenes]
        })
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error || 'unknown_error')
      board = advanceScriptGenerationState(board, {
        type: 'episode_failed',
        episodeNo: episode.episodeNo,
        reason: `批次失败：${errorMessage}`
      })
      if (input.onProgress) {
        await input.onProgress({
          phase: 'generate_batch',
          detail: `第${episode.episodeNo}集生成失败`,
          board,
          generatedScenes: [...generatedScenes]
        })
      }
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
