/**
 * 积分服务（使用 HTTP API）
 *
 * 管理用户积分余额、扣费、充值
 */
import { authenticateAdmin, getUserCredits, cachedAdminToken, PB_URL } from '../infrastructure/pocketbase/client'

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

export class CreditService {
  /**
   * 获取用户积分余额
   */
  async getBalance(userId: string): Promise<CreditBalance> {
    const credits = await getUserCredits(userId)
    return {
      balance: credits.balance,
      frozenBalance: credits.frozenBalance
    }
  }

  /**
   * 扣减积分
   */
  async deductCredits(
    userId: string,
    amount: number,
    metadata: ApiCallMetadata
  ): Promise<TransactionResult> {
    await authenticateAdmin()

    // 获取当前积分
    const credits = await getUserCredits(userId)
    const balanceBefore = credits.balance

    if (balanceBefore < amount) {
      return {
        success: false,
        newBalance: balanceBefore,
        transactionId: '',
        error: 'insufficient_credits'
      }
    }

    const balanceAfter = balanceBefore - amount

    // 更新积分余额
    const updateRes = await fetch(`${PB_URL}/api/collections/credits/records/${credits.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cachedAdminToken
      },
      body: JSON.stringify({
        balance: balanceAfter,
        frozenBalance: credits.frozenBalance
      })
    })

    if (!updateRes.ok) {
      return {
        success: false,
        newBalance: balanceBefore,
        transactionId: '',
        error: 'update_failed'
      }
    }

    // 记录交易
    const transRes = await fetch(`${PB_URL}/api/collections/transactions/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cachedAdminToken
      },
      body: JSON.stringify({
        user: userId,
        type: 'api_call',
        amount: -amount,
        balanceBefore,
        balanceAfter,
        description: `AI调用: ${metadata.task}`
      })
    })

    const transData = await transRes.json()

    // 记录 API 调用日志
    await fetch(`${PB_URL}/api/collections/api_call_logs/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cachedAdminToken
      },
      body: JSON.stringify({
        user: userId,
        project: metadata.projectId,
        task: metadata.task,
        lane: metadata.lane,
        model: metadata.model,
        costCredits: amount,
        success: true
      })
    })

    return {
      success: true,
      newBalance: balanceAfter,
      transactionId: transData.id || ''
    }
  }

  /**
   * 增加积分
   */
  async addCredits(
    userId: string,
    amount: number,
    type: 'payment' | 'admin_adjust' | 'register_bonus',
    description: string
  ): Promise<number> {
    await authenticateAdmin()

    const credits = await getUserCredits(userId)
    const balanceBefore = credits.balance
    const balanceAfter = balanceBefore + amount

    // 更新积分
    await fetch(`${PB_URL}/api/collections/credits/records/${credits.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cachedAdminToken
      },
      body: JSON.stringify({ balance: balanceAfter })
    })

    // 记录交易
    await fetch(`${PB_URL}/api/collections/transactions/records`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cachedAdminToken
      },
      body: JSON.stringify({
        user: userId,
        type,
        amount,
        balanceBefore,
        balanceAfter,
        description
      })
    })

    return balanceAfter
  }

  /**
   * 冻结积分
   */
  async freezeCredits(userId: string, amount: number): Promise<{ success: boolean }> {
    await authenticateAdmin()

    const credits = await getUserCredits(userId)

    if (credits.balance < amount) {
      return { success: false }
    }

    await fetch(`${PB_URL}/api/collections/credits/records/${credits.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cachedAdminToken
      },
      body: JSON.stringify({
        balance: credits.balance - amount,
        frozenBalance: (credits.frozenBalance || 0) + amount
      })
    })

    return { success: true }
  }

  /**
   * 解冻积分
   */
  async unfreezeCredits(userId: string, amount: number): Promise<void> {
    await authenticateAdmin()

    const credits = await getUserCredits(userId)

    await fetch(`${PB_URL}/api/collections/credits/records/${credits.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': cachedAdminToken
      },
      body: JSON.stringify({
        balance: credits.balance + amount,
        frozenBalance: Math.max(0, (credits.frozenBalance || 0) - amount)
      })
    })
  }
}