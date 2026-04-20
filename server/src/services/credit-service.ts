/**
 * 积分服务（共享 PocketBase 钱包架构）
 *
 * 使用 user_wallets 表存余额，xinjuben_transactions 表存流水
 */
import { authenticateAdmin, cachedAdminToken, PB_URL, APP_ID, TABLES, getUserWalletBalance } from '../infrastructure/pocketbase/client'

export interface CreditBalance {
  balance: number
  frozenBalance: number
}

export interface TransactionResult {
  success: boolean
  newBalance: number
  transactionId: string
  error?: string
}

export interface ApiCallMetadata {
  task: string
  projectId: string
  lane: string
  model: string
  inputTokens?: number
  outputTokens?: number
  durationMs?: number
}

async function getWalletRecord(userId: string): Promise<{ id: string; balance: number } | null> {
  await authenticateAdmin()

  const res = await fetch(
    `${PB_URL}/api/collections/${TABLES.userWallets}/records?filter=user.id='${userId}' && appId='${APP_ID}'`,
    { headers: { 'Authorization': cachedAdminToken } }
  )

  if (!res.ok) return null

  const data = await res.json()
  if (!data.items || data.items.length === 0) return null

  return { id: data.items[0].id, balance: data.items[0].balance }
}

export class CreditService {
  async getBalance(userId: string): Promise<CreditBalance> {
    const balance = await getUserWalletBalance(userId)
    return { balance, frozenBalance: 0 }
  }

  async deductCredits(
    userId: string,
    amount: number,
    metadata: ApiCallMetadata
  ): Promise<TransactionResult> {
    await authenticateAdmin()

    const wallet = await getWalletRecord(userId)
    if (!wallet) {
      return { success: false, newBalance: 0, transactionId: '', error: 'wallet_not_found' }
    }

    const balanceBefore = wallet.balance

    if (balanceBefore < amount) {
      return { success: false, newBalance: balanceBefore, transactionId: '', error: 'insufficient_credits' }
    }

    const balanceAfter = balanceBefore - amount

    // 更新钱包余额
    const updateRes = await fetch(`${PB_URL}/api/collections/${TABLES.userWallets}/records/${wallet.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': cachedAdminToken },
      body: JSON.stringify({ balance: balanceAfter })
    })

    if (!updateRes.ok) {
      return { success: false, newBalance: balanceBefore, transactionId: '', error: 'update_failed' }
    }

    // 记录流水
    const transRes = await fetch(`${PB_URL}/api/collections/${TABLES.transactions}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': cachedAdminToken },
      body: JSON.stringify({
        user: userId,
        type: 'api_call',
        amount: -amount,
        balanceBefore,
        balanceAfter,
        description: `AI调用: ${metadata.task}`,
        metadata: {
          project: metadata.projectId,
          lane: metadata.lane,
          model: metadata.model,
          inputTokens: metadata.inputTokens ?? 0,
          outputTokens: metadata.outputTokens ?? 0,
          durationMs: metadata.durationMs ?? 0
        }
      })
    })

    const transData = await transRes.json()

    return {
      success: true,
      newBalance: balanceAfter,
      transactionId: transData.id || ''
    }
  }

  async addCredits(
    userId: string,
    amount: number,
    type: 'payment' | 'admin_adjust' | 'register_bonus',
    description: string
  ): Promise<number> {
    await authenticateAdmin()

    const wallet = await getWalletRecord(userId)
    if (!wallet) {
      throw new Error('wallet_not_found')
    }

    const balanceBefore = wallet.balance
    const balanceAfter = balanceBefore + amount

    // 更新钱包
    await fetch(`${PB_URL}/api/collections/${TABLES.userWallets}/records/${wallet.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': cachedAdminToken },
      body: JSON.stringify({ balance: balanceAfter })
    })

    // 记录流水
    await fetch(`${PB_URL}/api/collections/${TABLES.transactions}/records`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': cachedAdminToken },
      body: JSON.stringify({ user: userId, type, amount, balanceBefore, balanceAfter, description })
    })

    return balanceAfter
  }

  async freezeCredits(userId: string, amount: number): Promise<{ success: boolean }> {
    // 钱包架构下冻结逻辑简化：直接扣减
    const wallet = await getWalletRecord(userId)
    if (!wallet || wallet.balance < amount) return { success: false }

    await fetch(`${PB_URL}/api/collections/${TABLES.userWallets}/records/${wallet.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': cachedAdminToken },
      body: JSON.stringify({ balance: wallet.balance - amount })
    })

    return { success: true }
  }

  async unfreezeCredits(userId: string, amount: number): Promise<void> {
    // 钱包架构下解冻 = 加回余额
    const wallet = await getWalletRecord(userId)
    if (!wallet) return

    await fetch(`${PB_URL}/api/collections/${TABLES.userWallets}/records/${wallet.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': cachedAdminToken },
      body: JSON.stringify({ balance: wallet.balance + amount })
    })
  }
}
