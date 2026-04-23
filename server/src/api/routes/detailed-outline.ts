/**
 * 详细大纲生成路由
 *
 * POST /api/generate/detailed-outline
 *
 * 需要认证，扣 5 积分（比粗纲贵，体现价值）
 */

import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import { CreditService } from '../../services/credit-service'
import {
  hasValidApiKey,
  loadRuntimeProviderConfig
} from '../../infrastructure/runtime-env/provider-config'
import { generateDetailedOutlineForProject } from '../../application/workspace/detailed-outline-service'

export const detailedOutlineRouter = Router()

const creditService = new CreditService()

// 积分扣费中间件（扣 5 积分）
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
    const balance = await creditService.getBalance(req.user.id)
    const requiredCredits = 5

    if (balance.balance < requiredCredits) {
      res.status(402).json({
        error: 'insufficient_credits',
        message: `积分不足，生成详细大纲需要 ${requiredCredits} 积分，当前余额 ${balance.balance}`,
        balance: balance.balance,
        required: requiredCredits
      })
      return
    }

    req.creditDeduction = { userId: req.user.id, amount: requiredCredits }
    next()
  } catch {
    res.status(500).json({ error: 'credit_check_failed', message: '积分检查失败' })
  }
}

// 执行扣费
async function executeDeduction(
  req: Request,
  success: boolean,
  metadata: {
    task: string
    projectId: string
    lane: string
    model: string
    durationMs: number
    errorMessage?: string
  }
): Promise<void> {
  if (!req.creditDeduction) return

  const userId = req.creditDeduction.userId
  const amount = req.creditDeduction.amount

  if (success) {
    await creditService.deductCredits(userId, amount, {
      task: metadata.task,
      projectId: metadata.projectId,
      lane: metadata.lane,
      model: metadata.model,
      durationMs: metadata.durationMs
    })
  } else {
    console.log(
      `[DetailedOutline] Failed: userId=${userId} task=${metadata.task} error=${metadata.errorMessage}`
    )
  }
}

/**
 * POST /api/generate/detailed-outline
 *
 * Body: { projectId }
 */
detailedOutlineRouter.post(
  '/detailed-outline',
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

    const { projectId } = req.body

    if (!projectId || typeof projectId !== 'string') {
      res.status(400).json({
        error: 'missing_project_id',
        message: '请提供项目 ID'
      })
      return
    }

    const startedAt = Date.now()

    try {
      const result = await generateDetailedOutlineForProject({
        userId: req.user!.id,
        projectId
      })

      await executeDeduction(req, true, {
        task: 'detailed_outline',
        projectId,
        lane: 'deepseek',
        model: 'deepseek-chat',
        durationMs: Date.now() - startedAt
      })

      const newBalance = await creditService.getBalance(req.user!.id)

      res.json({
        success: true,
        project: result.project,
        detailedOutlineSegments: result.detailedOutlineSegments,
        creditsRemaining: newBalance.balance
      })
    } catch (error) {
      const durationMs = Date.now() - startedAt
      const errorMessage = error instanceof Error ? error.message : 'unknown_error'

      await executeDeduction(req, false, {
        task: 'detailed_outline',
        projectId,
        lane: 'deepseek',
        model: 'deepseek-chat',
        durationMs,
        errorMessage
      })

      console.error('[DetailedOutline] Generation failed:', error)

      res.status(500).json({
        error: 'generation_failed',
        message: errorMessage
      })
    }
  }
)
