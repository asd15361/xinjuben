/**
 * src/main/application/workspace/orchestrate-parallel-agents.ts
 *
 * 并行 Agent 调度器。
 *
 * 职责：
 * 1. 并行调用七问 Agent 和人物小传 Agent
 * 2. 两者都只依赖真源(storyIntent)，互不依赖
 * 3. 返回两者结果供粗纲 Agent 使用
 *
 * 【架构说明】
 *
 * 重构前：
 *   storyIntent → 粗纲 → 人物小传 → 七问（串行）
 *
 * 重构后：
 *   storyIntent
 *       ├──→ 七问 Agent ──────────────┐
 *       │                             ↓
 *       └──→ 人物小传 Agent ─→ 粗纲 Agent ─→ 详细大纲
 *                   │                    │
 *                   ↓                    ↓
 *             RAG/图谱/背景         用户确认 → 落盘
 *
 * 七问和人物小传并行执行：
 * - 七问：真源 → 结构化（把散乱的真源整理成固定七问格式）
 * - 人物小传：真源 → 图谱/关系/背景（作为 RAG 底料）
 */

import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { appendRuntimeDiagnosticLog } from '../../infrastructure/diagnostics/runtime-diagnostic-log.ts'
import { generateTextWithRuntimeRouter } from '../ai/generate-text.ts'
import { resolveAiStageTimeoutMs } from '../ai/resolve-ai-stage-timeout.ts'
import type { StoryIntentPackageDto } from '../../../shared/contracts/intake.ts'
import type { CharacterDraftDto } from '../../../shared/contracts/workflow.ts'
import {
  buildSevenQuestionsAgentPrompt,
  parseSevenQuestionsResponse,
  type SevenQuestionsResult
} from './generate-seven-questions-prompt.ts'
import {
  buildCharacterProfileAgentPrompt,
  parseCharacterProfileResponse,
  type CharacterProfileResult
} from './generate-character-profile-prompt.ts'

const SEVEN_QUESTIONS_MAX_OUTPUT_TOKENS = 2000
const CHARACTER_PROFILE_MAX_OUTPUT_TOKENS = 3000

/**
 * 并行 Agent 输入
 */
export interface ParallelAgentsInput {
  /** 真源（StoryIntent） */
  storyIntent: StoryIntentPackageDto
  /** 集数（从用户输入获取） */
  totalEpisodes: number
  /** 运行时配置 */
  runtimeConfig: RuntimeProviderConfig
  /** 中断信号 */
  signal?: AbortSignal
}

/**
 * 并行 Agent 结果
 */
export interface ParallelAgentsResult {
  /** 七问结果 */
  sevenQuestions: SevenQuestionsResult
  /** 人物小传结果 */
  characterProfiles: CharacterProfileResult
}

/**
 * 并行调用七问 Agent。
 */
async function invokeSevenQuestionsAgent(
  input: ParallelAgentsInput
): Promise<SevenQuestionsResult> {
  const prompt = buildSevenQuestionsAgentPrompt({
    storyIntent: input.storyIntent,
    totalEpisodes: input.totalEpisodes
  })

  const timeoutMs = resolveAiStageTimeoutMs('seven_questions')
  const startedAt = Date.now()

  await appendRuntimeDiagnosticLog(
    'seven_questions',
    `parallel_start storyIntentChars=${input.storyIntent.generationBriefText?.length || 0} totalEpisodes=${input.totalEpisodes} promptChars=${prompt.length} timeoutMs=${timeoutMs}`
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
          totalEpisodes: input.totalEpisodes,
          strictness: 'strict'
        }
      },
      input.runtimeConfig,
      { signal: input.signal }
    )

    const parsed = parseSevenQuestionsResponse(result.text)
    const parsedOk = Boolean(parsed)
    const normalizedResponsePreview = result.text.replace(/\s+/g, ' ').trim()

    await appendRuntimeDiagnosticLog(
      'seven_questions',
      `parallel_finish elapsedMs=${Date.now() - startedAt} lane=${result.lane} model=${result.model} finishReason=${result.finishReason || 'unknown'} responseChars=${result.text.length} parsed=${parsedOk ? 'yes' : 'no'} responseHead=${normalizedResponsePreview.slice(0, 200)} responseTail=${normalizedResponsePreview.slice(-200)}`
    )

    if (!parsedOk) {
      throw new Error('seven_questions_parse_failed')
    }

    return parsed!
  } catch (error) {
    await appendRuntimeDiagnosticLog(
      'seven_questions',
      `parallel_fail elapsedMs=${Date.now() - startedAt} error=${error instanceof Error ? error.message : String(error)}`
    )
    throw error instanceof Error ? error : new Error(String(error || 'seven_questions_failed'))
  }
}

/**
 * 并行调用人物小传 Agent。
 */
async function invokeCharacterProfileAgent(
  input: ParallelAgentsInput
): Promise<CharacterProfileResult> {
  const prompt = buildCharacterProfileAgentPrompt({
    storyIntent: input.storyIntent
  })

  const timeoutMs = resolveAiStageTimeoutMs('character_profile')
  const startedAt = Date.now()

  await appendRuntimeDiagnosticLog(
    'character_profile',
    `parallel_start storyIntentChars=${input.storyIntent.generationBriefText?.length || 0} promptChars=${prompt.length} timeoutMs=${timeoutMs}`
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
        maxOutputTokens: CHARACTER_PROFILE_MAX_OUTPUT_TOKENS,
        runtimeHints: {
          totalEpisodes: input.totalEpisodes,
          strictness: 'normal'
        }
      },
      input.runtimeConfig,
      { signal: input.signal }
    )

    const parsed = parseCharacterProfileResponse(result.text)
    const parsedOk = Boolean(parsed?.characters?.length)
    const normalizedResponsePreview = result.text.replace(/\s+/g, ' ').trim()

    await appendRuntimeDiagnosticLog(
      'character_profile',
      `parallel_finish elapsedMs=${Date.now() - startedAt} lane=${result.lane} model=${result.model} finishReason=${result.finishReason || 'unknown'} responseChars=${result.text.length} parsed=${parsedOk ? 'yes' : 'no'} characterCount=${parsed?.characters?.length || 0} responseHead=${normalizedResponsePreview.slice(0, 200)} responseTail=${normalizedResponsePreview.slice(-200)}`
    )

    if (!parsedOk) {
      throw new Error('character_profile_parse_failed')
    }

    return parsed!
  } catch (error) {
    await appendRuntimeDiagnosticLog(
      'character_profile',
      `parallel_fail elapsedMs=${Date.now() - startedAt} error=${error instanceof Error ? error.message : String(error)}`
    )
    throw error instanceof Error ? error : new Error(String(error || 'character_profile_failed'))
  }
}

export async function generateCharacterProfilesFromStoryIntent(
  input: ParallelAgentsInput
): Promise<CharacterProfileResult> {
  return invokeCharacterProfileAgent(input)
}

/**
 * 并行调度器。
 * 同时调用七问 Agent 和人物小传 Agent。
 */
export async function orchestrateParallelAgents(
  input: ParallelAgentsInput
): Promise<ParallelAgentsResult> {
  const startedAt = Date.now()

  await appendRuntimeDiagnosticLog(
    'parallel_agents',
    `orchestrate_start storyIntentId=${input.storyIntent.titleHint || 'untitled'} totalEpisodes=${input.totalEpisodes}`
  )

  // 并行执行两个 Agent
  const [sevenQuestionsResult, characterProfilesResult] = await Promise.all([
    invokeSevenQuestionsAgent(input),
    invokeCharacterProfileAgent(input)
  ])

  const finalCharacters: CharacterDraftDto[] = characterProfilesResult.characters.map((character) => ({
    ...character
  }))

  await appendRuntimeDiagnosticLog(
    'parallel_agents',
    `orchestrate_finish elapsedMs=${Date.now() - startedAt} sectionCount=${sevenQuestionsResult.sectionCount} characterCount=${finalCharacters.length} enrichmentApplied=${finalCharacters.some((c, j) => c.goal !== (characterProfilesResult.characters[j]?.goal || ''))}`
  )

  return {
    sevenQuestions: sevenQuestionsResult,
    characterProfiles: {
      ...characterProfilesResult,
      characters: finalCharacters
    }
  }
}

/**
 * 并行调度器结果包含的所有数据（用于传递给粗纲 Agent）
 */
export interface ParallelAgentsContext {
  /** 七问结果 */
  sevenQuestions: SevenQuestionsResult
  /** 人物小传列表 */
  characterProfiles: CharacterDraftDto[]
  /** 人物小传原始结果 */
  characterProfilesResult: CharacterProfileResult
}

/**
 * 包装并行调度器，返回更多上下文信息。
 */
export async function orchestrateParallelAgentsWithContext(
  input: ParallelAgentsInput
): Promise<ParallelAgentsContext> {
  const result = await orchestrateParallelAgents(input)

  return {
    sevenQuestions: result.sevenQuestions,
    characterProfiles: result.characterProfiles.characters,
    characterProfilesResult: result.characterProfiles
  }
}
