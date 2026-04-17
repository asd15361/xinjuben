/**
 * 粗纲和人物生成路由
 *
 * POST /api/generate/outline-and-characters
 *
 * 需要认证，扣 3 积分（比七问贵，体现价值）
 */

import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { CreditService } from '../../services/credit-service'
import { hasValidApiKey, loadRuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'
import { generateOutlineAndCharactersSimple } from '../../application/workspace/outline-characters-service'

export const outlineCharactersRouter = Router()

const creditService = new CreditService()

// 积分扣费中间件（扣 3 积分）
async function deductCreditsMiddleware(req: Request, res: Response, next: Function) {
  if (!req.user) {
    res.status(401).json({ error: 'not_authenticated', message: '请先登录' })
    return
  }

  try {
    const balance = await creditService.getBalance(req.user.id)
    const requiredCredits = 3 // 粗纲+人物更贵

    if (balance.balance < requiredCredits) {
      res.status(402).json({
        error: 'insufficient_credits',
        message: `积分不足，生成粗纲和人物需要 ${requiredCredits} 积分，当前余额 ${balance.balance}`,
        balance: balance.balance,
        required: requiredCredits
      })
      return
    }

    req.creditDeduction = { userId: req.user.id, amount: requiredCredits }
    next()
  } catch (error) {
    res.status(500).json({ error: 'credit_check_failed', message: '积分检查失败' })
  }
}

// 执行扣费
async function executeDeduction(req: Request, success: boolean, metadata: {
  task: string
  lane: string
  model: string
  durationMs: number
  errorMessage?: string
}) {
  if (!req.creditDeduction) return

  const userId = req.creditDeduction.userId
  const amount = req.creditDeduction.amount

  if (success) {
    await creditService.deductCredits(userId, amount, {
      task: metadata.task,
      projectId: '',
      lane: metadata.lane,
      model: metadata.model,
      durationMs: metadata.durationMs
    })
  } else {
    // 失败只记录日志，不扣费
    console.log(`[OutlineCharacters] Failed: userId=${userId} task=${metadata.task} error=${metadata.errorMessage}`)
  }
}

/**
 * POST /api/generate/outline-and-characters
 *
 * Body: { storyIntent, sevenQuestions, totalEpisodes }
 */
outlineCharactersRouter.post(
  '/outline-and-characters',
  authMiddleware,
  deductCreditsMiddleware,
  async (req: Request, res: Response) => {
    if (!hasValidApiKey(loadRuntimeProviderConfig())) {
      res.status(500).json({
        error: 'ai_not_configured',
        message: '服务器未配置 AI API Key'
      })
      return
    }

    const { storyIntent, sevenQuestions, totalEpisodes } = req.body

    if (!storyIntent) {
      res.status(400).json({
        error: 'missing_story_intent',
        message: '请提供故事意图'
      })
      return
    }

    if (!sevenQuestions) {
      res.status(400).json({
        error: 'missing_seven_questions',
        message: '请提供已确认的七问'
      })
      return
    }

    const startedAt = Date.now()

    try {
      const result = await generateOutlineAndCharactersSimple({
        storyIntent,
        sevenQuestions,
        totalEpisodes: totalEpisodes || 10
      })

      await executeDeduction(req, true, {
        task: 'outline_and_characters',
        lane: 'deepseek',
        model: 'deepseek-chat',
        durationMs: Date.now() - startedAt
      })

      const newBalance = await creditService.getBalance(req.user!.id)

      res.json({
        success: true,
        outlineDraft: result.outlineDraft,
        characterDrafts: result.characterDrafts,
        creditsRemaining: newBalance.balance
      })
    } catch (error) {
      const durationMs = Date.now() - startedAt
      const errorMessage = error instanceof Error ? error.message : 'unknown_error'

      await executeDeduction(req, false, {
        task: 'outline_and_characters',
        lane: 'deepseek',
        model: 'deepseek-chat',
        durationMs,
        errorMessage
      })

      console.error('[OutlineCharacters] Generation failed:', error)

      res.status(500).json({
        error: 'generation_failed',
        message: errorMessage
      })
    }
  }
)