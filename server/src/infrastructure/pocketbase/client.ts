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

export const APP_ID = process.env.APP_ID || 'xinjuben'

export const pb = new PocketBase(PB_URL)
export { PB_URL }

// 表名映射：逻辑名 → 物理表名（带 appId 前缀）
export const TABLES = {
  projects: `${APP_ID}_projects`,
  projectChats: `${APP_ID}_project_chats`,
  projectOutlines: `${APP_ID}_project_outlines`,
  projectCharacters: `${APP_ID}_project_characters`,
  projectDetailedOutlines: `${APP_ID}_project_detailed_outlines`,
  projectScripts: `${APP_ID}_project_scripts`,
  transactions: `${APP_ID}_transactions`,
  userApps: 'user_apps',
  userWallets: 'user_wallets'
} as const

// 管理员认证状态缓存
let adminAuthExpiry = 0
export let cachedAdminToken = ''

const ADMIN_AUTH_ENDPOINTS = [
  '/api/admins/auth-with-password',
  '/api/collections/_superusers/auth-with-password'
] as const

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
    let data: { token: string } | null = null
    let lastErrorText = ''

    for (const endpoint of ADMIN_AUTH_ENDPOINTS) {
      const res = await fetch(`${PB_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identity: ADMIN_EMAIL, password: ADMIN_PASSWORD })
      })

      console.log('[PocketBase] Auth endpoint/status:', endpoint, res.status)

      if (res.ok) {
        data = await res.json()
        break
      }

      lastErrorText = await res.text()
      if (res.status !== 404) {
        console.error('[PocketBase] Auth failed:', lastErrorText)
        throw new Error('Admin auth failed')
      }
    }

    if (!data?.token) {
      console.error('[PocketBase] Auth failed:', lastErrorText)
      throw new Error('Admin auth failed')
    }
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
  } catch {
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
    headers: { Authorization: cachedAdminToken }
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
export async function getUserTransactions(
  userId: string,
  limit: number = 20
): Promise<
  Array<{
    id: string
    type: string
    amount: number
    balanceBefore: number
    balanceAfter: number
    description: string
    createdAt: string
  }>
> {
  await authenticateAdmin()

  const res = await fetch(
    `${PB_URL}/api/collections/${TABLES.transactions}/records?filter=user.id='${userId}'&sort=-created&perPage=${limit}`,
    {
      headers: { Authorization: cachedAdminToken }
    }
  )

  if (!res.ok) {
    return []
  }

  const data = await res.json()

  return (data.items || []).map((record: Record<string, unknown>) => ({
    id: record.id,
    type: record.type,
    amount: record.amount,
    balanceBefore: record.balanceBefore,
    balanceAfter: record.balanceAfter,
    description: record.description || '',
    createdAt: record.created
  }))
}

/**
 * 静默补绑：检查并创建 user_apps 绑定
 * 登录成功后调用，确保用户有当前项目的访问权限
 */
export async function ensureUserAppBinding(userId: string): Promise<void> {
  await authenticateAdmin()

  // 查询是否已有绑定
  const res = await fetch(
    `${PB_URL}/api/collections/${TABLES.userApps}/records?filter=user.id='${userId}' && appId='${APP_ID}'`,
    {
      headers: { Authorization: cachedAdminToken }
    }
  )

  if (!res.ok) {
    console.error('[PocketBase] Failed to query user_apps')
    throw new Error('Failed to query user_apps')
  }

  const data = await res.json()

  if (data.items && data.items.length > 0) {
    // 已有绑定，更新 lastLoginAt
    const existing = data.items[0]
    await pb.collection(TABLES.userApps).update(existing.id, {
      lastLoginAt: new Date().toISOString(),
      updatedBy: 'system'
    })
    console.log('[PocketBase] Updated user_apps lastLoginAt for:', userId)
  } else {
    // 无绑定，创建新绑定
    await pb.collection(TABLES.userApps).create({
      user: userId,
      appId: APP_ID,
      role: 'member',
      status: 'active',
      firstLoginAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      createdBy: 'system',
      updatedBy: 'system'
    })
    console.log('[PocketBase] Created user_apps binding for:', userId)
  }
}

/**
 * 静默开户：检查并创建 user_wallets 钱包
 * 注册或首次登录时调用，确保用户有当前项目的积分账户
 */
export async function ensureUserWallet(
  userId: string,
  initialBalance: number = 100
): Promise<number> {
  await authenticateAdmin()

  // 查询是否已有钱包
  const res = await fetch(
    `${PB_URL}/api/collections/${TABLES.userWallets}/records?filter=user.id='${userId}' && appId='${APP_ID}'`,
    {
      headers: { Authorization: cachedAdminToken }
    }
  )

  if (!res.ok) {
    console.error('[PocketBase] Failed to query user_wallets')
    throw new Error('Failed to query user_wallets')
  }

  const data = await res.json()

  if (data.items && data.items.length > 0) {
    // 已有钱包，返回余额
    return data.items[0].balance
  } else {
    // 无钱包，创建新钱包
    await pb.collection(TABLES.userWallets).create({
      user: userId,
      appId: APP_ID,
      balance: initialBalance
    })
    console.log('[PocketBase] Created user_wallets for:', userId, 'with balance:', initialBalance)
    return initialBalance
  }
}

/**
 * 获取用户钱包余额
 */
export async function getUserWalletBalance(userId: string): Promise<number> {
  await authenticateAdmin()

  const res = await fetch(
    `${PB_URL}/api/collections/${TABLES.userWallets}/records?filter=user.id='${userId}' && appId='${APP_ID}'`,
    {
      headers: { Authorization: cachedAdminToken }
    }
  )

  if (!res.ok) {
    return 0
  }

  const data = await res.json()

  if (data.items && data.items.length > 0) {
    return data.items[0].balance
  }

  return 0
}
