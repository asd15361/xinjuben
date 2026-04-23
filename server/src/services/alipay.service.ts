/**
 * 支付宝支付服务
 *
 * 职责：
 * - 创建支付订单，生成支付链接
 * - 处理异步回调，验签并完成入账
 *
 * 架构规范：
 * - 订单存储在 payment_orders 表
 * - 钱包使用 user_wallets 表
 * - 流水使用 <appId>_transactions 表
 */
import { AlipaySdk } from 'alipay-sdk'
import {
  authenticateAdmin,
  cachedAdminToken,
  PB_URL,
  APP_ID,
  TABLES
} from '../infrastructure/pocketbase/client'

// 支付宝配置
const ALIPAY_APP_ID = process.env.ALIPAY_APP_ID || ''
const ALIPAY_PRIVATE_KEY = process.env.ALIPAY_PRIVATE_KEY || ''
const ALIPAY_PUBLIC_KEY = process.env.ALIPAY_PUBLIC_KEY || ''
const ALIPAY_GATEWAY = process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do'
const ALIPAY_NOTIFY_URL = process.env.ALIPAY_NOTIFY_URL || ''
const ALIPAY_RETURN_URL = process.env.ALIPAY_RETURN_URL || ''

// 充值套餐配置（测试价：0.01元=1积分）
export const CREDIT_PACKAGES = [
  { id: 'basic', amount: 0.01, credits: 1, label: '1 积分（测试）' },
  { id: 'standard', amount: 100, credits: 200, label: '200 积分' },
  { id: 'premium', amount: 300, credits: 700, label: '700 积分' },
  { id: 'ultimate', amount: 500, credits: 1200, label: '1200 积分' }
] as const

export type CreditPackageId = (typeof CREDIT_PACKAGES)[number]['id']

// 初始化支付宝 SDK
let alipaySdk: AlipaySdk | null = null

function getAlipaySdk(): AlipaySdk {
  if (!alipaySdk) {
    if (!ALIPAY_APP_ID || !ALIPAY_PRIVATE_KEY || !ALIPAY_PUBLIC_KEY) {
      throw new Error('ALIPAY_APP_ID, ALIPAY_PRIVATE_KEY, ALIPAY_PUBLIC_KEY must be set')
    }
    alipaySdk = new AlipaySdk({
      appId: ALIPAY_APP_ID,
      privateKey: ALIPAY_PRIVATE_KEY,
      alipayPublicKey: ALIPAY_PUBLIC_KEY,
      gateway: ALIPAY_GATEWAY
    })
  }
  return alipaySdk
}

/**
 * 生成唯一订单号
 * 格式：APPID + 时间戳 + 随机数
 */
function generateOutTradeNo(): string {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 8).toUpperCase()
  return `${APP_ID}${timestamp}${random}`
}

export interface CreateOrderResult {
  success: boolean
  outTradeNo?: string
  payUrl?: string
  error?: string
}

export interface WebhookProcessResult {
  success: boolean
  outTradeNo?: string
  credits?: number
  error?: string
}

/**
 * 创建支付订单
 */
export async function createPaymentOrder(
  userId: string,
  packageId: CreditPackageId
): Promise<CreateOrderResult> {
  await authenticateAdmin()

  // 查找套餐
  const pkg = CREDIT_PACKAGES.find((p) => p.id === packageId)
  if (!pkg) {
    return { success: false, error: 'invalid_package' }
  }

  const outTradeNo = generateOutTradeNo()

  // 创建订单记录
  const orderRes = await fetch(`${PB_URL}/api/collections/payment_orders/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: cachedAdminToken
    },
    body: JSON.stringify({
      outTradeNo,
      user: userId,
      appId: APP_ID,
      amount: pkg.amount,
      credits: pkg.credits,
      status: 'pending'
    })
  })

  if (!orderRes.ok) {
    const errText = await orderRes.text()
    console.error('[Alipay] Failed to create order:', errText)
    return { success: false, error: 'order_create_failed' }
  }

  // 生成支付链接
  try {
    const sdk = getAlipaySdk()

    const payUrl = sdk.pageExec('alipay.trade.page.pay', {
      notifyUrl: ALIPAY_NOTIFY_URL,
      returnUrl: ALIPAY_RETURN_URL,
      bizContent: {
        out_trade_no: outTradeNo,
        total_amount: pkg.amount.toFixed(2),
        subject: `剧本本充值 - ${pkg.label}`,
        product_code: 'FAST_INSTANT_TRADE_PAY'
      }
    })

    console.log('[Alipay] Created order:', outTradeNo, 'amount:', pkg.amount)

    return {
      success: true,
      outTradeNo,
      payUrl
    }
  } catch (error) {
    console.error('[Alipay] Failed to generate pay URL:', error)
    return { success: false, error: 'pay_url_failed' }
  }
}

/**
 * 处理支付宝异步回调
 *
 * 严格顺序：
 * 1. 验签
 * 2. 查询订单，防重放
 * 3. 更新订单状态
 * 4. 增加积分
 * 5. 记录流水
 */
export async function processAlipayWebhook(
  params: Record<string, string>
): Promise<WebhookProcessResult> {
  await authenticateAdmin()

  const sdk = getAlipaySdk()

  // 1. 验签
  try {
    const signVerified = sdk.checkNotifySign(params)
    if (!signVerified) {
      console.error('[Alipay] Signature verification failed')
      return { success: false, error: 'signature_invalid' }
    }
  } catch (error) {
    console.error('[Alipay] Signature check error:', error)
    return { success: false, error: 'signature_check_failed' }
  }

  const outTradeNo = params.out_trade_no
  const tradeNo = params.trade_no
  const tradeStatus = params.trade_status

  if (!outTradeNo) {
    return { success: false, error: 'missing_out_trade_no' }
  }

  // 只处理支付成功的回调
  if (tradeStatus !== 'TRADE_SUCCESS' && tradeStatus !== 'TRADE_FINISHED') {
    console.log('[Alipay] Trade status not success:', tradeStatus)
    return { success: false, error: 'trade_not_success' }
  }

  // 2. 查询订单，防重放
  const orderQueryRes = await fetch(
    `${PB_URL}/api/collections/payment_orders/records?filter=outTradeNo='${outTradeNo}'`,
    { headers: { Authorization: cachedAdminToken } }
  )

  if (!orderQueryRes.ok) {
    return { success: false, error: 'order_query_failed' }
  }

  const orderData = await orderQueryRes.json()
  if (!orderData.items || orderData.items.length === 0) {
    console.error('[Alipay] Order not found:', outTradeNo)
    return { success: false, error: 'order_not_found' }
  }

  const order = orderData.items[0]

  // 防重放：订单已成功处理
  if (order.status === 'paid') {
    console.log('[Alipay] Order already processed:', outTradeNo)
    return { success: true, outTradeNo, credits: order.credits }
  }

  // 3. 更新订单状态
  const updateRes = await fetch(`${PB_URL}/api/collections/payment_orders/records/${order.id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: cachedAdminToken
    },
    body: JSON.stringify({
      status: 'paid',
      tradeNo
    })
  })

  if (!updateRes.ok) {
    console.error('[Alipay] Failed to update order status')
    return { success: false, error: 'order_update_failed' }
  }

  const userId = order.user
  const credits = order.credits

  // 4. 增加积分到 user_wallets
  const walletQueryRes = await fetch(
    `${PB_URL}/api/collections/${TABLES.userWallets}/records?filter=user.id='${userId}' && appId='${APP_ID}'`,
    { headers: { Authorization: cachedAdminToken } }
  )

  if (!walletQueryRes.ok) {
    console.error('[Alipay] Failed to query wallet')
    return { success: false, error: 'wallet_query_failed' }
  }

  const walletData = await walletQueryRes.json()
  if (!walletData.items || walletData.items.length === 0) {
    console.error('[Alipay] Wallet not found for user:', userId)
    return { success: false, error: 'wallet_not_found' }
  }

  const wallet = walletData.items[0]
  const balanceBefore = wallet.balance
  const balanceAfter = balanceBefore + credits

  // 更新钱包余额
  const walletUpdateRes = await fetch(
    `${PB_URL}/api/collections/${TABLES.userWallets}/records/${wallet.id}`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: cachedAdminToken
      },
      body: JSON.stringify({ balance: balanceAfter })
    }
  )

  if (!walletUpdateRes.ok) {
    console.error('[Alipay] Failed to update wallet balance')
    return { success: false, error: 'wallet_update_failed' }
  }

  // 5. 记录流水到 <appId>_transactions
  await fetch(`${PB_URL}/api/collections/${TABLES.transactions}/records`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: cachedAdminToken
    },
    body: JSON.stringify({
      user: userId,
      type: 'payment',
      amount: credits,
      balanceBefore,
      balanceAfter,
      reference: outTradeNo,
      description: `充值 ${credits} 积分`,
      metadata: {
        tradeNo,
        amount: order.amount,
        packageId: order.packageId
      }
    })
  })

  console.log('[Alipay] Payment processed successfully:', outTradeNo, 'credits:', credits)

  return {
    success: true,
    outTradeNo,
    credits
  }
}

/**
 * 查询订单状态
 */
export async function queryOrderStatus(outTradeNo: string): Promise<{
  status: string
  credits?: number
}> {
  await authenticateAdmin()

  const res = await fetch(
    `${PB_URL}/api/collections/payment_orders/records?filter=outTradeNo='${outTradeNo}'`,
    { headers: { Authorization: cachedAdminToken } }
  )

  if (!res.ok) {
    return { status: 'unknown' }
  }

  const data = await res.json()
  if (!data.items || data.items.length === 0) {
    return { status: 'not_found' }
  }

  return {
    status: data.items[0].status,
    credits: data.items[0].credits
  }
}
