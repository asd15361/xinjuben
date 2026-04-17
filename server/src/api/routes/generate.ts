/**
 * 生成路由
 *
 * 所有 AI 生成接口，需要认证和积分扣费
 */
import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { CreditService } from '../../services/credit-service'
import { loadRuntimeProviderConfig, hasValidApiKey } from '../../infrastructure/runtime-env/provider-config'
import { generateTextWithRouter } from '../../application/ai/generate-text'
import { buildSevenQuestionsPrompt, parseSevenQuestionsResponse } from '../../application/workspace/seven-questions-agent'
import { authenticateAdmin, cachedAdminToken, PB_URL } from '../../infrastructure/pocketbase/client'

export const generateRouter = Router()

const creditService = new CreditService()
const runtimeConfig = loadRuntimeProviderConfig()

// 扩展 Request 类型
declare global {
  namespace Express {
    interface Request {
      creditDeduction?: { userId: string; amount: number }
    }
  }
}

// 积分扣费中间件
async function deductCreditsMiddleware(req: Request, res: Response, next: Function) {
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
  } catch (error) {
    res.status(500).json({ error: 'credit_check_failed', message: '积分检查失败' })
  }
}

// 执行扣费（调用成功后）
async function executeDeduction(req: Request, success: boolean, metadata: {
  task: string
  lane: string
  model: string
  durationMs: number
  inputTokens?: number
  outputTokens?: number
  errorMessage?: string
}) {
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
        'Authorization': cachedAdminToken
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

    const { storyIntent, totalEpisodes } = req.body

    if (!storyIntent) {
      res.status(400).json({
        error: 'missing_story_intent',
        message: '请提供故事意图'
      })
      return
    }

    const startedAt = Date.now()

    try {
      // 构建七问 Prompt
      const prompt = buildSevenQuestionsPrompt(storyIntent, totalEpisodes || 10)

      // 调用 AI
      const result = await generateTextWithRouter(
        {
          task: 'seven_questions',
          prompt,
          temperature: 0.4,
          maxOutputTokens: 2000,
          responseFormat: 'json_object',
          timeoutMs: 120000
        },
        runtimeConfig
      )

      // 解析结果
      const parsed = parseSevenQuestionsResponse(result.text)

      if (!parsed) {
        await executeDeduction(req, false, {
          task: 'seven_questions',
          lane: result.lane,
          model: result.model,
          durationMs: result.durationMs || Date.now() - startedAt,
          errorMessage: 'parse_failed'
        })

        res.status(500).json({
          error: 'parse_failed',
          message: '七问解析失败，请重试'
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

      res.json({
        success: true,
        sevenQuestions: parsed,
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