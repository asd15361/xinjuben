/**
 * 积分路由
 *
 * 查询积分余额、交易记录
 */
import { Router, Request, Response } from 'express'
import { CreditService } from '../../services/credit-service'
import { authMiddleware } from '../middleware/auth'
import { getUserTransactions } from '../../infrastructure/pocketbase/client'

export const creditsRouter = Router()

const creditService = new CreditService()

/**
 * 获取积分余额
 *
 * GET /api/credits/balance
 * Header: Authorization: Bearer <token>
 */
creditsRouter.get('/balance', authMiddleware, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      error: 'not_authenticated',
      message: '请先登录'
    })
    return
  }

  try {
    const balance = await creditService.getBalance(req.user.id)

    res.json({
      balance: balance.balance,
      frozenBalance: balance.frozenBalance
    })
  } catch (error) {
    console.error('[Credits] Balance query error:', error)
    res.status(500).json({
      error: 'balance_query_failed',
      message: '积分查询失败'
    })
  }
})

/**
 * 获取交易记录
 *
 * GET /api/credits/transactions
 * Header: Authorization: Bearer <token>
 * Query: page, limit
 */
creditsRouter.get('/transactions', authMiddleware, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({
      error: 'not_authenticated',
      message: '请先登录'
    })
    return
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 20, 100)

  try {
    const transactions = await getUserTransactions(req.user.id, limit)

    res.json({
      transactions,
      total: transactions.length
    })
  } catch (error) {
    console.error('[Credits] Transactions query error:', error)
    res.status(500).json({
      error: 'transactions_query_failed',
      message: '交易记录查询失败'
    })
  }
})

/**
 * 充值积分（第三步接入支付宝后实现）
 *
 * POST /api/credits/topup
 * Header: Authorization: Bearer <token>
 * Body: { amount }
 *
 * TODO: 第三步接入支付宝支付
 */