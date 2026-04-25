/**
 * 生成路由
 *
 * 所有 AI 生成接口，需要认证和积分扣费
 */
import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { CreditService } from '../../services/credit-service'
import {
  loadRuntimeProviderConfig,
  hasValidApiKey
} from '../../infrastructure/runtime-env/provider-config'
import { generateTextWithRouter } from '../../application/ai/generate-text'
import {
  buildSevenQuestionsPrompt,
  parseSevenQuestionsResponse,
  type SevenQuestionCandidate,
  type ValidatedCandidate
} from '../../application/workspace/seven-questions-agent'
import { resolveProjectEpisodeCount } from '@shared/domain/workflow/episode-count'
import { resolveProjectMarketPlaybook } from '@shared/domain/market-playbook/playbook-prompt-block'
import { authenticateAdmin, PB_URL, cachedAdminToken } from '../../infrastructure/pocketbase/client'
import { MarketPlaybookRepository } from '../../infrastructure/pocketbase/market-playbook-repository'

export const generateRouter = Router()

const creditService = new CreditService()
const runtimeConfig = loadRuntimeProviderConfig()
const marketPlaybookRepository = new MarketPlaybookRepository()

function summarizeSevenQuestionGateFailures(candidates: ValidatedCandidate[]): string {
  if (candidates.length === 0) return '模型没有返回可解析的候选方案'

  const messages = candidates.flatMap((candidate) =>
    (candidate.validationErrors || []).map((error) => `${candidate.title || '未命名方案'}：${error.message}`)
  )

  const uniqueMessages = Array.from(new Set(messages))
  if (uniqueMessages.length === 0) return '候选方案数量不足，至少需要 2 个合格方案'

  return uniqueMessages.slice(0, 4).join('；')
}

function buildSevenQuestionRepairPrompt(input: {
  originalPrompt: string
  failureSummary: string
  candidates: ValidatedCandidate[]
}): string {
  const failureLines = input.candidates.flatMap((candidate) =>
    (candidate.validationErrors || []).map(
      (error) => `- ${candidate.title || '未命名方案'}：${error.field}：${error.message}`
    )
  )

  return [
    input.originalPrompt,
    '',
    '【质量门失败后的强制修稿】',
    '上一版七问没有通过质量门，不能原样返回。你必须根据以下失败原因重新生成完整 candidates JSON。',
    `失败摘要：${input.failureSummary}`,
    ...failureLines.slice(0, 12),
    '',
    '修稿硬要求：',
    '- 不要解释，不要道歉，只输出完整 JSON。',
    '- 必须返回至少 2 个候选，每个候选都要合格。',
    '- 不得复用上一次违规表达。',
    '- 继续严格遵守“叙事约束锁”“集数硬约束”“男频修仙题材硬约束”。'
  ].join('\n')
}

// 积分扣费中间件
async function deductCreditsMiddleware(
  req: Request,
  res: Response,
  next: () => void
): Promise<void> {
  if (!req.user) {
    res.status(401).json({ error: 'not_authenticated', message: '请先登录' })
    return
  }

  try {
    // 检查余额
    const balance = await creditService.getBalance(req.user.id)
    if (balance.balance < 1) {
      res.status(402).json({
        error: 'insufficient_credits',
        message: '积分不足，请充值后继续使用',
        balance: balance.balance
      })
      return
    }

    // 标记需要扣费
    req.creditDeduction = { userId: req.user.id, amount: 1 }
    next()
  } catch {
    res.status(500).json({ error: 'credit_check_failed', message: '积分检查失败' })
  }
}

// 执行扣费（调用成功后）
async function executeDeduction(
  req: Request,
  success: boolean,
  metadata: {
    task: string
    lane: string
    model: string
    durationMs: number
    inputTokens?: number
    outputTokens?: number
    errorMessage?: string
  }
): Promise<void> {
  if (!req.creditDeduction) return

  const userId = req.creditDeduction.userId
  const amount = req.creditDeduction.amount

  if (success) {
    // 成功：扣费并记录日志
    await creditService.deductCredits(userId, amount, {
      task: metadata.task,
      projectId: '',
      lane: metadata.lane,
      model: metadata.model,
      inputTokens: metadata.inputTokens,
      outputTokens: metadata.outputTokens,
      durationMs: metadata.durationMs
    })
  } else {
    // 失败：只记录日志，不扣费
    await authenticateAdmin()
    await fetch(`${PB_URL}/api/collections/api_call_logs/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: cachedAdminToken
      },
      body: JSON.stringify({
        user: userId,
        task: metadata.task,
        lane: metadata.lane,
        model: metadata.model,
        costCredits: 0,
        durationMs: metadata.durationMs,
        success: false,
        errorMessage: metadata.errorMessage || ''
      })
    })
  }
}

/**
 * 生成七问
 *
 * POST /api/generate/seven-questions
 * Header: Authorization: Bearer <token>
 * Body: { storyIntent, totalEpisodes }
 */
generateRouter.post(
  '/seven-questions',
  authMiddleware,
  deductCreditsMiddleware,
  async (req: Request, res: Response) => {
    // 验证 API Key 配置
    if (!hasValidApiKey(runtimeConfig)) {
      res.status(500).json({
        error: 'ai_not_configured',
        message: '服务器未配置 AI API Key，请联系管理员'
      })
      return
    }

    const { storyIntent, totalEpisodes, marketPlaybookSelection } = req.body

    if (!storyIntent) {
      res.status(400).json({
        error: 'missing_story_intent',
        message: '请提供故事意图'
      })
      return
    }

    const startedAt = Date.now()

    // 解析 MarketPlaybook（B 层）
    const customPlaybooks = await marketPlaybookRepository.listActivePlaybooks(req.user!.id)
    const marketPlaybook = resolveProjectMarketPlaybook({
      marketPlaybookSelection,
      audienceLane: storyIntent.marketProfile?.audienceLane,
      subgenre: storyIntent.marketProfile?.subgenre,
      customPlaybooks
    })

    try {
      const resolvedTotalEpisodes = resolveProjectEpisodeCount({
        storyIntent,
        fallbackCount: Number(totalEpisodes) || 10
      })

      // 构建七问 Prompt
      const prompt = buildSevenQuestionsPrompt(storyIntent, resolvedTotalEpisodes, marketPlaybook)

      // 调用 AI
      let result = await generateTextWithRouter(
        {
          task: 'seven_questions',
          prompt,
          temperature: 0.4,
          maxOutputTokens: 3200,
          responseFormat: 'json_object',
          timeoutMs: 120000
        },
        runtimeConfig
      )

      // 解析结果
      let parsed = parseSevenQuestionsResponse(result.text, resolvedTotalEpisodes, storyIntent)
      let validCandidates: SevenQuestionCandidate[] = parsed.candidates.filter(
        (candidate) => candidate.isValid
      )

      if (validCandidates.length < 2) {
        const firstFailureSummary = summarizeSevenQuestionGateFailures(parsed.candidates)
        console.warn('[Generate] Seven questions quality gate retrying:', {
          expectedEpisodes: resolvedTotalEpisodes,
          validCount: validCandidates.length,
          candidateCount: parsed.candidates.length,
          summary: firstFailureSummary
        })

        const repairResult = await generateTextWithRouter(
          {
            task: 'seven_questions',
            prompt: buildSevenQuestionRepairPrompt({
              originalPrompt: prompt,
              failureSummary: firstFailureSummary,
              candidates: parsed.candidates
            }),
            temperature: 0.25,
            maxOutputTokens: 3200,
            responseFormat: 'json_object',
            timeoutMs: 120000
          },
          runtimeConfig
        )

        result = {
          ...repairResult,
          durationMs:
            (result.durationMs || Date.now() - startedAt) + (repairResult.durationMs || 0),
          inputTokens: (result.inputTokens || 0) + (repairResult.inputTokens || 0),
          outputTokens: (result.outputTokens || 0) + (repairResult.outputTokens || 0)
        }
        parsed = parseSevenQuestionsResponse(repairResult.text, resolvedTotalEpisodes, storyIntent)
        validCandidates = parsed.candidates.filter((candidate) => candidate.isValid)
      }

      if (validCandidates.length < 2) {
        const failureSummary = summarizeSevenQuestionGateFailures(parsed.candidates)
        console.warn('[Generate] Seven questions quality gate failed:', {
          expectedEpisodes: resolvedTotalEpisodes,
          validCount: validCandidates.length,
          candidateCount: parsed.candidates.length,
          failures: parsed.candidates.map((candidate) => ({
            title: candidate.title,
            errors: candidate.validationErrors
          }))
        })

        await executeDeduction(req, false, {
          task: 'seven_questions',
          lane: result.lane,
          model: result.model,
          durationMs: result.durationMs || Date.now() - startedAt,
          errorMessage: 'quality_gate_failed'
        })

        res.status(500).json({
          error: 'quality_gate_failed',
          message: `七问没有通过质量门：${failureSummary}`,
          details: {
            expectedEpisodes: resolvedTotalEpisodes,
            validCount: validCandidates.length,
            candidateCount: parsed.candidates.length,
            failures: parsed.candidates.map((candidate) => ({
              title: candidate.title,
              validationErrors: candidate.validationErrors
            }))
          }
        })
        return
      }

      // 成功：扣费
      await executeDeduction(req, true, {
        task: 'seven_questions',
        lane: result.lane,
        model: result.model,
        durationMs: result.durationMs || Date.now() - startedAt,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens
      })

      // 获取新余额
      const newBalance = await creditService.getBalance(req.user!.id)

      // 兼容旧前端：把第一个候选的 result 作为旧 sevenQuestions 返回
      const firstCandidate = validCandidates[0]
      const legacySevenQuestions = firstCandidate ? firstCandidate.result : null

      res.json({
        success: true,
        sevenQuestions: legacySevenQuestions,
        candidates: validCandidates,
        needsMoreCandidates: validCandidates.length < 2,
        lane: result.lane,
        model: result.model,
        durationMs: result.durationMs || Date.now() - startedAt,
        creditsRemaining: newBalance.balance
      })
    } catch (error) {
      const durationMs = Date.now() - startedAt
      const errorMessage = error instanceof Error ? error.message : 'unknown_error'

      await executeDeduction(req, false, {
        task: 'seven_questions',
        lane: 'unknown',
        model: 'unknown',
        durationMs,
        errorMessage
      })

      console.error('[Generate] Seven questions failed:', error)

      res.status(500).json({
        error: 'generation_failed',
        message: errorMessage.includes('no_available') ? 'AI 服务未配置' : '生成失败，请重试'
      })
    }
  }
)

/**
 * 通用生成接口（未来扩展其他 Agent）
 *
 * POST /api/generate
 * Header: Authorization: Bearer <token>
 * Body: { task, prompt, ... }
 */
generateRouter.post(
  '/',
  authMiddleware,
  deductCreditsMiddleware,
  async (req: Request, res: Response) => {
    if (!hasValidApiKey(runtimeConfig)) {
      res.status(500).json({
        error: 'ai_not_configured',
        message: '服务器未配置 AI API Key'
      })
      return
    }

    const { task, prompt, temperature, maxOutputTokens, responseFormat } = req.body

    if (!prompt) {
      res.status(400).json({
        error: 'missing_prompt',
        message: '请提供生成提示'
      })
      return
    }

    const startedAt = Date.now()

    try {
      const result = await generateTextWithRouter(
        {
          task: task || 'general',
          prompt,
          temperature: temperature ?? 0.7,
          maxOutputTokens: maxOutputTokens ?? 2000,
          responseFormat: responseFormat || 'text',
          timeoutMs: 120000
        },
        runtimeConfig
      )

      await executeDeduction(req, true, {
        task: task || 'general',
        lane: result.lane,
        model: result.model,
        durationMs: result.durationMs || Date.now() - startedAt,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens
      })

      const newBalance = await creditService.getBalance(req.user!.id)

      res.json({
        success: true,
        text: result.text,
        lane: result.lane,
        model: result.model,
        durationMs: result.durationMs || Date.now() - startedAt,
        creditsRemaining: newBalance.balance
      })
    } catch (error) {
      const durationMs = Date.now() - startedAt
      const errorMessage = error instanceof Error ? error.message : 'unknown_error'

      await executeDeduction(req, false, {
        task: task || 'general',
        lane: 'unknown',
        model: 'unknown',
        durationMs,
        errorMessage
      })

      res.status(500).json({
        error: 'generation_failed',
        message: errorMessage
      })
    }
  }
)
