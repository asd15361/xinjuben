import { motion } from 'framer-motion'
import { Coins, LogOut, Plus, User } from 'lucide-react'
import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { CreditsTopupModal } from '../../features/credits/ui/CreditsTopupModal'

interface AppIdentityBadgeProps {
  appName: string
  onLoginClick: () => void
}

export function AppIdentityBadge({ appName, onLoginClick }: AppIdentityBadgeProps) {
  const isLoggedIn = useAuthStore((state) => state.isLoggedIn)
  const creditsBalance = useAuthStore((state) => state.creditsBalance)
  const user = useAuthStore((state) => state.user)
  const logout = useAuthStore((state) => state.logout)
  const [showTopup, setShowTopup] = useState(false)

  // 已登录：显示积分和退出按钮
  if (isLoggedIn) {
    return (
      <>
        <div className="flex items-center gap-4">
          {/* 积分显示 + 充值按钮 */}
          <button
            onClick={() => setShowTopup(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 hover:bg-orange-500/20 transition-colors cursor-pointer"
          >
            <Coins size={14} style={{ color: '#FF7A00' }} />
            <span className="text-xs font-bold text-orange-300">{creditsBalance} 积分</span>
            <Plus size={10} className="text-orange-400" />
          </button>

          {/* 用户名 */}
          {user?.name && (
            <span className="text-xs text-white/50">{user.name}</span>
          )}

          {/* 退出按钮 */}
          <button
            onClick={logout}
            className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/25 hover:text-white/70 transition-colors"
          >
            <LogOut size={12} className="opacity-70 group-hover:opacity-100 transition-opacity" />
            退出
          </button>
        </div>
        {/* 充值弹窗 */}
        <CreditsTopupModal isOpen={showTopup} onClose={() => setShowTopup(false)} />
      </>
    )
  }

  // 未登录：显示登录按钮
  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onLoginClick}
      className="flex items-center gap-3 cursor-pointer"
    >
      <div className="text-right">
        <p className="text-[10px] font-black text-white">{appName}</p>
        <p className="text-[8px] text-white/30 font-bold tracking-widest uppercase">创作台</p>
      </div>
      <div className="w-10 h-10 rounded-xl p-[1px]" style={{ background: 'linear-gradient(135deg, #FF7A00, #f97316)' }}>
        <div className="w-full h-full rounded-[11px] bg-black flex items-center justify-center gap-1">
          <User size={14} style={{ color: '#FF7A00' }} />
          <span className="text-[10px] font-bold text-orange-400">登录</span>
        </div>
      </div>
    </motion.button>
  )
}
