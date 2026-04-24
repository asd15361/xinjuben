/**
 * 全局认证状态管理
 *
 * 使用 Zustand 管理：
 * - 用户登录状态
 * - 用户信息
 * - 积分余额
 * - 自动校验 Token
 */
import { create } from 'zustand'
import {
  apiGetMe,
  apiLogin,
  apiRegister,
  apiGetCreditsBalance,
  clearToken,
  storeToken,
  hasLocalToken,
  type User,
  type LoginInput,
  type RegisterInput
} from '../../services/api-client.ts'

interface AuthState {
  // 状态
  isLoggedIn: boolean
  isInitializing: boolean
  user: User | null
  creditsBalance: number
  frozenBalance: number
  error: string | null

  // 操作
  initialize: () => Promise<void>
  login: (input: LoginInput & { rememberMe?: boolean }) => Promise<void>
  register: (input: RegisterInput & { rememberMe?: boolean }) => Promise<void>
  logout: () => void
  refreshCredits: () => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set, get) => ({
  // 初始状态
  isLoggedIn: false,
  isInitializing: true,
  user: null,
  creditsBalance: 0,
  frozenBalance: 0,
  error: null,

  // 初始化：检查本地 Token 是否有效
  initialize: async () => {
    set({ isInitializing: true, error: null })

    // 检查本地是否有 Token
    if (!hasLocalToken()) {
      set({ isLoggedIn: false, isInitializing: false, user: null })
      return
    }

    try {
      // 用 Token 获取用户信息，验证有效性
      const result = await apiGetMe()
      set({
        isLoggedIn: true,
        isInitializing: false,
        user: result.user,
        creditsBalance: result.credits.balance,
        frozenBalance: result.credits.frozenBalance
      })
    } catch (err) {
      // 只有 401 Token 无效/过期才清除；网络错误保留 Token，下次再试
      if (err instanceof Error && err.message.includes('过期')) {
        clearToken()
      }
      set({
        isLoggedIn: false,
        isInitializing: false,
        user: null,
        creditsBalance: 0,
        frozenBalance: 0
      })
    }
  },

  // 登录
  login: async (input: LoginInput & { rememberMe?: boolean }) => {
    set({ error: null })
    try {
      const result = await apiLogin(input)
      storeToken(result.token, input.rememberMe !== false)
      set({
        isLoggedIn: true,
        user: result.user,
        creditsBalance: result.credits.balance,
        frozenBalance: 0
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '登录失败'
      set({ error: message })
      throw err
    }
  },

  // 注册
  register: async (input: RegisterInput & { rememberMe?: boolean }) => {
    set({ error: null })
    try {
      const result = await apiRegister(input)
      storeToken(result.token, input.rememberMe !== false)
      set({
        isLoggedIn: true,
        user: result.user,
        creditsBalance: result.credits.balance,
        frozenBalance: 0
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : '注册失败'
      set({ error: message })
      throw err
    }
  },

  // 退出登录
  logout: () => {
    clearToken()
    set({
      isLoggedIn: false,
      user: null,
      creditsBalance: 0,
      frozenBalance: 0,
      error: null
    })
  },

  // 刷新积分余额
  refreshCredits: async () => {
    if (!get().isLoggedIn) return

    try {
      const balance = await apiGetCreditsBalance()
      set({
        creditsBalance: balance.balance,
        frozenBalance: balance.frozenBalance
      })
    } catch {
      // 忽略刷新失败，不改变状态
    }
  },

  // 清除错误
  clearError: () => set({ error: null })
}))
