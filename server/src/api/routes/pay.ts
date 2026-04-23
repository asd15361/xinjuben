/**
 * 支付路由
 *
 * 创建充值订单、支付宝回调、查询订单状态
 */
import { Router, Request, Response } from 'express'
import { authMiddleware } from '../middleware/auth'
import {
  createPaymentOrder,
  processAlipayWebhook,
  queryOrderStatus,
  CREDIT_PACKAGES,
  type CreditPackageId
} from '../../services/alipay.service'

export const payRouter = Router()

/**
 * 获取充值套餐列表
 *
 * GET /api/pay/packages
 */
payRouter.get('/packages', (_req: Request, res: Response) => {
  res.json({ packages: CREDIT_PACKAGES })
})

/**
 * 创建充值订单
 *
 * POST /api/pay/create
 * Header: Authorization: Bearer <token>
 * Body: { packageId: 'basic' | 'standard' | 'premium' | 'ultimate' }
 */
payRouter.post('/create', authMiddleware, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'not_authenticated', message: '请先登录' })
    return
  }

  const { packageId } = req.body as { packageId: string }

  if (!packageId || !CREDIT_PACKAGES.find((p) => p.id === packageId)) {
    res.status(400).json({ error: 'invalid_package', message: '无效的充值套餐' })
    return
  }

  try {
    const result = await createPaymentOrder(req.user.id, packageId as CreditPackageId)

    if (!result.success) {
      res.status(500).json({ error: result.error, message: '创建订单失败' })
      return
    }

    res.json({
      outTradeNo: result.outTradeNo,
      payUrl: result.payUrl
    })
  } catch (error) {
    console.error('[Pay] Create order error:', error)
    res.status(500).json({ error: 'order_create_failed', message: '创建订单失败' })
  }
})

/**
 * 支付宝异步回调
 *
 * POST /api/pay/webhook/alipay
 * Content-Type: application/x-www-form-urlencoded
 *
 * 支付宝服务器调用，不需要 auth 中间件
 */
payRouter.post('/webhook/alipay', async (req: Request, res: Response) => {
  console.log('[Pay] Alipay webhook received')

  try {
    const result = await processAlipayWebhook(req.body as Record<string, string>)

    if (result.success) {
      // 支付宝要求返回 success 字符串
      res.type('text/plain').send('success')
    } else {
      console.error('[Pay] Webhook process failed:', result.error)
      res.type('text/plain').send('fail')
    }
  } catch (error) {
    console.error('[Pay] Webhook error:', error)
    res.type('text/plain').send('fail')
  }
})

/**
 * 查询订单状态（前端轮询）
 *
 * GET /api/pay/order/:outTradeNo
 * Header: Authorization: Bearer <token>
 */
payRouter.get('/order/:outTradeNo', authMiddleware, async (req: Request, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'not_authenticated', message: '请先登录' })
    return
  }

  const { outTradeNo } = req.params

  try {
    const result = await queryOrderStatus(outTradeNo)
    res.json(result)
  } catch (error) {
    console.error('[Pay] Order query error:', error)
    res.status(500).json({ error: 'order_query_failed', message: '查询订单失败' })
  }
})
