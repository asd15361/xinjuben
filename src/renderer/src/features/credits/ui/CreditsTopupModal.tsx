/**
 * 充值弹窗
 *
 * 在顶部导航栏积分按钮点击后弹出
 */
import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useAuthStore } from '../../../app/store/useAuthStore'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

interface CreditPackage {
  id: string
  amount: number
  credits: number
  label: string
}

interface OrderStatus {
  status: string
  credits?: number
}

function getToken(): string | null {
  return localStorage.getItem('xinjuben_token')
}

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

interface CreditsTopupModalProps {
  isOpen: boolean
  onClose: () => void
}

export function CreditsTopupModal({ isOpen, onClose }: CreditsTopupModalProps): JSX.Element | null {
  const [packages, setPackages] = useState<CreditPackage[]>([])
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingOrder, setPendingOrder] = useState<string | null>(null)
  const refreshCredits = useAuthStore((state) => state.refreshCredits)
  const creditsBalance = useAuthStore((state) => state.creditsBalance)

  // 加载套餐
  useEffect(() => {
    if (isOpen) {
      apiRequest<{ packages: CreditPackage[] }>('/api/pay/packages')
        .then((res) => setPackages(res.packages))
        .catch((err) => console.error('Failed to load packages:', err))
    }
  }, [isOpen])

  // 轮询订单状态
  const pollOrderStatus = async (outTradeNo: string): Promise<void> => {
    try {
      const result: OrderStatus = await apiRequest(`/api/pay/order/${outTradeNo}`)
      if (result.status === 'paid') {
        setPendingOrder(null)
        refreshCredits()
        alert(`充值成功！已到账 ${result.credits} 积分`)
        return
      }
      setTimeout(() => pollOrderStatus(outTradeNo), 3000)
    } catch {
      setTimeout(() => pollOrderStatus(outTradeNo), 3000)
    }
  }

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

      window.open(result.payUrl, '_blank')
      setPendingOrder(result.outTradeNo)
      pollOrderStatus(result.outTradeNo)
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建订单失败')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* 弹窗内容 */}
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors"
        >
          <X size={20} />
        </button>

        {/* 标题 */}
        <h2 className="text-lg font-bold text-white mb-4">充值积分</h2>

        {/* 当前余额 */}
        <div className="flex items-center gap-2 mb-6 px-4 py-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
          <span className="text-sm text-white/60">当前余额</span>
          <span className="text-xl font-bold text-orange-400">{creditsBalance}</span>
          <span className="text-sm text-white/60">积分</span>
        </div>

        {/* 套餐选择 */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          {packages.map((pkg) => (
            <button
              key={pkg.id}
              onClick={() => setSelectedPackage(pkg.id)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedPackage === pkg.id
                  ? 'border-orange-500 bg-orange-500/20'
                  : 'border-white/10 bg-white/5 hover:border-white/20'
              }`}
            >
              <div className="text-lg font-bold text-white">{pkg.label}</div>
              <div className="text-xl font-bold text-orange-400 mt-1">¥{pkg.amount}</div>
            </button>
          ))}
        </div>

        {/* 错误提示 */}
        {error && <div className="mb-4 text-sm text-red-400 text-center">{error}</div>}

        {/* 支付按钮 */}
        <button
          onClick={handlePay}
          disabled={loading || !selectedPackage || !!pendingOrder}
          className="w-full py-3 rounded-xl font-bold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background:
              loading || pendingOrder ? '#52525b' : 'linear-gradient(135deg, #FF7A00, #f97316)'
          }}
        >
          {loading ? '处理中...' : pendingOrder ? '等待支付完成...' : '去支付宝付款'}
        </button>

        {/* 提示 */}
        <p className="mt-4 text-xs text-white/30 text-center">
          支付完成后将自动到账，如有问题请联系客服
        </p>
      </div>
    </div>
  )
}

export default CreditsTopupModal
