/**
 * 登录/注册弹窗组件
 *
 * 功能：
 * - 登录和注册模式切换
 * - 表单验证
 * - 错误提示
 * - 调用 API 并更新全局状态
 */
import { useEffect, useState } from 'react'
import { useAuthStore } from '../app/store/useAuthStore'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { X, Mail, Lock, User, Loader2 } from 'lucide-react'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { login, register, error, clearError } = useAuthStore()

  const resetForm = () => {
    setEmail('')
    setPassword('')
    setPasswordConfirm('')
    setName('')
    clearError()
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    clearError()

    try {
      if (mode === 'register') {
        if (password !== passwordConfirm) {
          set({ error: '两次密码不一致' })
          setIsSubmitting(false)
          return
        }
        await register({ email, password, passwordConfirm, name: name || undefined })
      } else {
        await login({ email, password })
      }
      handleClose()
    } catch {
      // 错误已由 store 处理
    } finally {
      setIsSubmitting(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    clearError()
  }

  useEffect(() => {
    if (!isOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [isOpen])

  if (typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[99999] flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.82)' }}
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: 12 }}
            transition={{ type: 'spring', damping: 22, stiffness: 260 }}
            className="relative w-full max-w-md rounded-2xl border border-white/10 bg-black/90 backdrop-blur-xl p-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors"
            >
              <X size={20} />
            </button>

            {/* 标题 */}
            <div className="text-center mb-8">
              <div
                className="w-12 h-12 rounded-xl mx-auto mb-4 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #FF7A00, #f97316)' }}
              >
                <User size={24} className="text-black" />
              </div>
              <h2 className="text-xl font-bold text-white">
                {mode === 'login' ? '欢迎回来' : '创建账号'}
              </h2>
              <p className="text-sm text-white/40 mt-2">
                {mode === 'login'
                  ? '登录继续你的创作之旅'
                  : '注册送 100 积分，立即开始创作'}
              </p>
            </div>

            {/* 表单 */}
            <div className="space-y-4">
              {mode === 'register' && (
                <div className="relative">
                  <User
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                  />
                  <input
                    type="text"
                    placeholder="用户名（可选）"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-11 text-white placeholder:text-white/30 focus:border-orange-500/50 focus:outline-none transition-colors"
                  />
                </div>
              )}

              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  type="email"
                  placeholder="邮箱"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-11 text-white placeholder:text-white/30 focus:border-orange-500/50 focus:outline-none transition-colors"
                />
              </div>

              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                />
                <input
                  type="password"
                  placeholder="密码"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-11 text-white placeholder:text-white/30 focus:border-orange-500/50 focus:outline-none transition-colors"
                />
              </div>

              {mode === 'register' && (
                <div className="relative">
                  <Lock
                    size={16}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                  />
                  <input
                    type="password"
                    placeholder="确认密码"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 pl-11 text-white placeholder:text-white/30 focus:border-orange-500/50 focus:outline-none transition-colors"
                  />
                </div>
              )}

              {/* 错误提示 */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3"
                >
                  <p className="text-sm text-rose-300">{error}</p>
                </motion.div>
              )}
            </div>

            {/* 提交按钮 */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !email || !password || (mode === 'register' && !passwordConfirm)}
              className="w-full mt-6 rounded-xl py-3 font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: isSubmitting
                  ? 'rgba(255,122,0,0.3)'
                  : 'linear-gradient(135deg, #FF7A00, #f97316)',
                color: isSubmitting ? 'white/60' : 'black'
              }}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  处理中...
                </span>
              ) : mode === 'login' ? (
                '登录'
              ) : (
                '注册'
              )}
            </button>

            {/* 切换模式 */}
            <div className="mt-6 text-center">
              <button
                onClick={switchMode}
                className="text-sm text-white/40 hover:text-white/70 transition-colors"
              >
                {mode === 'login' ? '没有账号？点击注册' : '已有账号？点击登录'}
              </button>
            </div>

            {/* 注册提示 */}
            {mode === 'register' && (
              <p className="mt-4 text-center text-xs text-white/30">
                注册即送 100 积分，每次 AI 生成消耗 1 积分
              </p>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}

// 使用 Zustand 的 set 函数直接设置错误
function set(state: { error: string }) {
  useAuthStore.setState(state)
}