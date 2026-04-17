/**
 * src/main/application/workspace/generate-seven-questions-draft.ts
 *
 * 七问初稿生成服务。
 *
 * 职责：
 * - 基于 confirmed storyIntent 生成七问初稿
 * - 只生成初稿，不直接生成粗纲
 * - 初稿需要用户确认后才能写入 outlineBlocks
 *
 * 【七问工作流】
 * storyIntent 已确认
 *   -> generateSevenQuestionsDraft（生成初稿）
 *   -> 前端展示七问（用户修改/确认）
 *   -> saveConfirmedSevenQuestions（写入 outlineBlocks）
 *   -> generateOutlineAndCharactersFromConfirmedSevenQuestions（生成粗纲）
 */

import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { appendRuntimeDiagnosticLog } from '../../infrastructure/diagnostics/runtime-diagnostic-log.ts'
import { generateTextWithRuntimeRouter } from '../ai/generate-text.ts'
import { resolveAiStageTimeoutMs } from '../ai/resolve-ai-stage-timeout.ts'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake'
import type { SevenQuestionsResultDto } from '../../../shared/contracts/workflow'
import {
  buildSevenQuestionsAgentPrompt,
  parseSevenQuestionsResponse
} from './generate-seven-questions-prompt'
import {
  DEFAULT_EPISODE_COUNT,
  extractEpisodeCountFromGenerationBrief
} from '../../../shared/domain/workflow/episode-count'

const SEVEN_QUESTIONS_MAX_OUTPUT_TOKENS = 2000

/**
 * 生成七问初稿。
 *
 * 只生成初稿，不写入存储。
 * 初稿需要用户确认后才能写入 outlineBlocks。
 *
 * @param input.storyIntent - 已确认的真源
 * @param input.runtimeConfig - 运行时配置
 * @param input.signal - 中断信号
 * @returns 七问初稿
 */
export async function generateSevenQuestionsDraft(input: {
  storyIntent: StoryIntentPackageDto
  runtimeConfig: RuntimeProviderConfig
  signal?: AbortSignal
}): Promise<{ sevenQuestions: SevenQuestionsResultDto }> {
  const generationBriefText = input.storyIntent.generationBriefText?.trim()

  if (!generationBriefText) {
    throw new Error('confirmed_story_intent_missing')
  }

  const targetEpisodeCount =
    extractEpisodeCountFromGenerationBrief(generationBriefText) || DEFAULT_EPISODE_COUNT

  const prompt = buildSevenQuestionsAgentPrompt({
    storyIntent: input.storyIntent,
    totalEpisodes: targetEpisodeCount
  })

  const timeoutMs = resolveAiStageTimeoutMs('seven_questions')
  const startedAt = Date.now()

  await appendRuntimeDiagnosticLog(
    'seven_questions',
    `draft_start storyIntentChars=${generationBriefText.length} totalEpisodes=${targetEpisodeCount} promptChars=${prompt.length} timeoutMs=${timeoutMs}`
  )

  try {
    const result = await generateTextWithRuntimeRouter(
      {
        task: 'seven_questions',
        prompt,
        allowFallback: false,
        responseFormat: 'json_object',
        temperature: 0.4,
        timeoutMs,
        maxOutputTokens: SEVEN_QUESTIONS_MAX_OUTPUT_TOKENS,
        runtimeHints: {
          totalEpisodes: targetEpisodeCount,
          strictness: 'strict'
        }
      },
      input.runtimeConfig,
      { signal: input.signal }
    )

    const parsed = parseSevenQuestionsResponse(result.text)
    if (!parsed) {
      throw new Error('seven_questions_parse_failed')
    }

    const normalizedResponsePreview = result.text.replace(/\s+/g, ' ').trim()

    await appendRuntimeDiagnosticLog(
      'seven_questions',
      `draft_finish elapsedMs=${Date.now() - startedAt} lane=${result.lane} model=${result.model} sectionCount=${parsed.sectionCount} responseHead=${normalizedResponsePreview.slice(0, 200)}`
    )

    return { sevenQuestions: parsed }
  } catch (error) {
    await appendRuntimeDiagnosticLog(
      'seven_questions',
      `draft_fail elapsedMs=${Date.now() - startedAt} error=${error instanceof Error ? error.message : String(error)}`
    )
    throw error instanceof Error ? error : new Error(String(error || 'seven_questions_draft_failed'))
  }
}
