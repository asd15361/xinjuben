/**
 * PocketBase 客户端封装
 *
 * 提供服务端管理员认证和用户 token 验证
 */
import PocketBase from 'pocketbase'
import dotenv from 'dotenv'

// 确保环境变量已加载
dotenv.config()

const PB_URL = process.env.POCKETBASE_URL || 'http://localhost:8090'
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || ''
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || ''

export const pb = new PocketBase(PB_URL)
export { PB_URL }

// 管理员认证状态缓存
let adminAuthExpiry = 0
export let cachedAdminToken = ''

/**
 * 服务端管理员认证（使用 HTTP API）
 */
export async function authenticateAdmin(): Promise<void> {
  const now = Date.now()

  // 如果 token 还有效（提前 5 分钟刷新），跳过
  if (adminAuthExpiry > now + 5 * 60 * 1000 && cachedAdminToken) {
    pb.authStore.save(cachedAdminToken, null)
    return
  }

  console.log('[PocketBase] Authenticating admin:', ADMIN_EMAIL)

  try {
    const res = await fetch(`${PB_URL}/api/admins/auth-with-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD })
    })

    console.log('[PocketBase] Auth response status:', res.status)

    if (!res.ok) {
      const errText = await res.text()
      console.error('[PocketBase] Auth failed:', errText)
      throw new Error('Admin auth failed')
    }

    const data = await res.json()
    cachedAdminToken = data.token
    adminAuthExpiry = now + 60 * 60 * 1000

    pb.authStore.save(data.token, null)
    console.log('[PocketBase] Admin authenticated successfully')
  } catch (error) {
    console.error('[PocketBase] Admin authentication failed:', error)
    throw new Error('PocketBase admin authentication failed')
  }
}

/**
 * 验证用户 token 并获取用户信息
 *
 * @param token - 用户 JWT token
 * @returns 用户记录
 */
export async function validateUserToken(token: string): Promise<{
  id: string
  email: string
  name: string
}> {
  // 使用临时 authStore 验证 token
  const tempPb = new PocketBase(PB_URL)
  tempPb.authStore.save(token, null)

  if (!tempPb.authStore.isValid) {
    throw new Error('invalid_token')
  }

  try {
    // 刷新用户记录，确保 token 仍然有效
    const user = await tempPb.collection('users').authRefresh()
    return {
      id: user.record.id,
      email: user.record.email,
      name: user.record.name || ''
    }
  } catch (error) {
    throw new Error('token_expired')
  }
}

/**
 * 获取用户积分记录
 */
export async function getUserCredits(userId: string): Promise<{
  id: string
  balance: number
  frozenBalance: number
}> {
  await authenticateAdmin()

  // 使用 HTTP API 直接查询
  const url = `${PB_URL}/api/collections/credits/records?filter=user.id='${userId}'`
  console.log('[PocketBase] Fetching credits:', url)

  const res = await fetch(url, {
    headers: { 'Authorization': cachedAdminToken }
  })

  if (!res.ok) {
    const errText = await res.text()
    console.error('[PocketBase] Credits fetch failed:', res.status, errText)
    throw new Error('Failed to fetch credits')
  }

  const data = await res.json()
  console.log('[PocketBase] Credits data:', JSON.stringify(data))

  if (!data.items || data.items.length === 0) {
    throw new Error('Credits not found for user')
  }

  const record = data.items[0]
  return {
    id: record.id,
    balance: record.balance,
    frozenBalance: record.frozenBalance || 0
  }
}

/**
 * 获取用户交易记录（最近 N 条）
 */
export async function getUserTransactions(userId: string, limit: number = 20): Promise<Array<{
  id: string
  type: string
  amount: number
  balanceBefore: number
  balanceAfter: number
  description: string
  createdAt: string
}>> {
  await authenticateAdmin()

  const res = await fetch(`${PB_URL}/api/collections/transactions/records?filter=user.id='${userId}'&sort=-created&perPage=${limit}`, {
    headers: { 'Authorization': cachedAdminToken }
  })

  if (!res.ok) {
    return []
  }

  const data = await res.json()

  return (data.items || []).map((record: any) => ({
    id: record.id,
    type: record.type,
    amount: record.amount,
    balanceBefore: record.balanceBefore,
    balanceAfter: record.balanceAfter,
    description: record.description || '',
    createdAt: record.created
  }))
}