/**
 * 充值页面
 *
 * 功能：
 * - 显示当前积分余额
 * - 展示充值套餐
 * - 发起支付宝支付
 * - 轮询订单状态
 */
import { useState, useEffect, useCallback } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

interface CreditPackage {
  id: string
  amount: number
  credits: number
  label: string
}

interface Balance {
  balance: number
  frozenBalance: number
}

interface OrderStatus {
  status: string
  credits?: number
}

// 获取 Token
function getToken(): string | null {
  return localStorage.getItem('xinjuben_token')
}

// API 请求封装
async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'unknown' }))
    throw new Error(err.error || res.statusText)
  }

  return res.json()
}

export function CreditsTopupPage(): JSX.Element {
  const [balance, setBalance] = useState<Balance | null>(null)
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingOrder, setPendingOrder] = useState<string | null>(null)

  // 加载余额和套餐
  useEffect(() => {
    async function loadData(): Promise<void> {
      try {
        const [balanceRes, packagesRes] = await Promise.all([
          apiRequest<{ balance: number; frozenBalance: number }>('/api/credits/balance'),
          apiRequest<{ packages: CreditPackage[] }>('/api/pay/packages')
        ])
        setBalance(balanceRes)
        setPackages(packagesRes.packages)
      } catch (err) {
        console.error('Failed to load data:', err)
        setError('加载数据失败，请刷新页面重试')
      }
    }
    loadData()
  }, [])

  // 轮询订单状态
  const pollOrderStatus = useCallback(async (outTradeNo: string): Promise<void> => {
    try {
      const result: OrderStatus = await apiRequest(`/api/pay/order/${outTradeNo}`)
      if (result.status === 'paid') {
        setPendingOrder(null)
        // 刷新余额
        const newBalance = await apiRequest<{ balance: number; frozenBalance: number }>(
          '/api/credits/balance'
        )
        setBalance(newBalance)
        alert(`充值成功！已到账 ${result.credits} 积分`)
        return
      }
      // 继续轮询
      setTimeout(() => pollOrderStatus(outTradeNo), 3000)
    } catch (err) {
      console.error('Poll order status failed:', err)
      setTimeout(() => pollOrderStatus(outTradeNo), 3000)
    }
  }, [])

  // 发起支付
  async function handlePay(): Promise<void> {
    if (!selectedPackage) {
      setError('请选择充值套餐')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await apiRequest<{ outTradeNo: string; payUrl: string }>('/api/pay/create', {
        method: 'POST',
        body: JSON.stringify({ packageId: selectedPackage })
      })

      // 打开支付链接
      window.open(result.payUrl, '_blank')

      // 开始轮询
      setPendingOrder(result.outTradeNo)
      pollOrderStatus(result.outTradeNo)
    } catch (err) {
      console.error('Create order failed:', err)
      setError(err instanceof Error ? err.message : '创建订单失败')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="credits-topup-page">
      {/* 余额展示 */}
      <div className="balance-section">
        <h2>我的积分</h2>
        {balance ? (
          <div className="balance-display">
            <span className="balance-number">{balance.balance}</span>
            <span className="balance-unit">积分</span>
          </div>
        ) : (
          <div className="balance-loading">加载中...</div>
        )}
      </div>

      {/* 套餐选择 */}
      <div className="packages-section">
        <h3>选择充值套餐</h3>
        <div className="packages-grid">
          {packages.map((pkg) => (
            <div
              key={pkg.id}
              className={`package-card ${selectedPackage === pkg.id ? 'selected' : ''}`}
              onClick={() => setSelectedPackage(pkg.id)}
            >
              <div className="package-credits">{pkg.label}</div>
              <div className="package-price">¥{pkg.amount}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 错误提示 */}
      {error && <div className="error-message">{error}</div>}

      {/* 支付按钮 */}
      <div className="action-section">
        <button
          className="pay-button"
          onClick={handlePay}
          disabled={loading || !selectedPackage || !!pendingOrder}
        >
          {loading ? '处理中...' : pendingOrder ? '等待支付完成...' : '去支付宝付款'}
        </button>
      </div>

      {/* 简单样式 */}
      <style>{`
        .credits-topup-page {
          max-width: 600px;
          margin: 0 auto;
          padding: 24px;
        }
        .balance-section {
          text-align: center;
          margin-bottom: 32px;
        }
        .balance-display {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 8px;
        }
        .balance-number {
          font-size: 48px;
          font-weight: bold;
          color: #1890ff;
        }
        .balance-unit {
          font-size: 16px;
          color: #666;
        }
        .packages-section {
          margin-bottom: 24px;
        }
        .packages-section h3 {
          margin-bottom: 16px;
        }
        .packages-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }
        .package-card {
          border: 2px solid #e8e8e8;
          border-radius: 8px;
          padding: 16px;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .package-card:hover {
          border-color: #1890ff;
        }
        .package-card.selected {
          border-color: #1890ff;
          background: #e6f7ff;
        }
        .package-credits {
          font-size: 18px;
          font-weight: bold;
          margin-bottom: 8px;
        }
        .package-price {
          font-size: 24px;
          color: #ff4d4f;
        }
        .error-message {
          color: #ff4d4f;
          text-align: center;
          margin-bottom: 16px;
        }
        .action-section {
          text-align: center;
        }
        .pay-button {
          background: #1890ff;
          color: white;
          border: none;
          padding: 12px 48px;
          font-size: 16px;
          border-radius: 4px;
          cursor: pointer;
        }
        .pay-button:disabled {
          background: #d9d9d9;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}

export default CreditsTopupPage
