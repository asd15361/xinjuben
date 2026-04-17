# 前端改造指南

## 目标

把 Electron 客户端从直接调用 AI（IPC）改为请求 Node.js 后端服务。

**核心变化：**
- 原来：渲染进程 → IPC → 主进程 → AI SDK
- 现在：渲染进程 → HTTP → Node.js 后端 → AI SDK → 扣积分

**关键原则：** preload 层接口签名不变，渲染进程代码几乎不改，只改底层实现。

---

## 改造步骤

### 第一步：创建 HTTP 客户端

在 `src/renderer/src/services/` 创建 `api-client.ts`：

```typescript
/**
 * src/renderer/src/services/api-client.ts
 * HTTP API 客户端封装
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

// Token 管理
function getStoredToken(): string | null {
  return localStorage.getItem('xinjuben_token')
}

export function storeToken(token: string): void {
  localStorage.setItem('xinjuben_token', token)
}

export function clearToken(): void {
  localStorage.removeItem('xinjuben_token')
}

// 通用请求封装
async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    body?: any
    requireAuth?: boolean
  } = {}
): Promise<T> {
  const { method = 'GET', body, requireAuth = true } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (requireAuth) {
    const token = getStoredToken()
    if (!token) throw new Error('NOT_AUTHENTICATED')
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  if (!res.ok) {
    const error = await res.json()
    if (res.status === 401) {
      clearToken()
      throw new Error('TOKEN_EXPIRED')
    }
    if (res.status === 402) {
      throw new Error('INSUFFICIENT_CREDITS')
    }
    throw new Error(error.message || error.error || 'API_ERROR')
  }

  return res.json()
}

// ========== 认证 ==========

export async function apiRegister(input: {
  email: string
  password: string
  passwordConfirm: string
  name?: string
}) {
  const result = await apiRequest<any>('/api/auth/register', {
    method: 'POST', body: input, requireAuth: false
  })
  storeToken(result.token)
  return result
}

export async function apiLogin(input: {
  email: string
  password: string
}) {
  const result = await apiRequest<any>('/api/auth/login', {
    method: 'POST', body: input, requireAuth: false
  })
  storeToken(result.token)
  return result
}

export async function apiGetMe() {
  return apiRequest<any>('/api/auth/me')
}

// ========== 积分 ==========

export async function apiGetCreditsBalance() {
  return apiRequest<{ balance: number; frozenBalance: number }>('/api/credits/balance')
}

// ========== 生成 ==========

export async function apiGenerateSevenQuestions(input: {
  storyIntent: any
  totalEpisodes?: number
}) {
  return apiRequest<any>('/api/generate/seven-questions', {
    method: 'POST', body: input
  })
}
```

---

### 第二步：创建登录组件

在 `src/renderer/src/components/` 创建 `LoginModal.tsx`：

```tsx
import { useState } from 'react'
import { apiRegister, apiLogin } from '../services/api-client'

interface Props {
  onSuccess: () => void
  onClose: () => void
}

export function LoginModal({ onSuccess, onClose }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    setError('')
    try {
      if (mode === 'register') {
        if (password !== passwordConfirm) {
          setError('两次密码不一致')
          return
        }
        await apiRegister({ email, password, passwordConfirm })
      } else {
        await apiLogin({ email, password })
      }
      onSuccess()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-modal">
      <h2>{mode === 'login' ? '登录' : '注册'}</h2>
      <input type="email" placeholder="邮箱" value={email}
        onChange={(e) => setEmail(e.target.value)} />
      <input type="password" placeholder="密码" value={password}
        onChange={(e) => setPassword(e.target.value)} />
      {mode === 'register' && (
        <input type="password" placeholder="确认密码" value={passwordConfirm}
          onChange={(e) => setPasswordConfirm(e.target.value)} />
      )}
      {error && <div className="error">{error}</div>}
      <button onClick={handleSubmit} disabled={loading}>
        {loading ? '处理中...' : (mode === 'login' ? '登录' : '注册')}
      </button>
      <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? '没有账号？注册' : '已有账号？登录'}
      </button>
      <button onClick={onClose}>关闭</button>
    </div>
  )
}
```

---

### 第三步：改造七问生成调用

**原来（IPC）：**
```typescript
const result = await window.api.workspace.generateSevenQuestionsDraft({
  projectId, storyIntent
})
```

**改为（HTTP）：**
```typescript
import { apiGenerateSevenQuestions } from '../../services/api-client'

async function handleGenerate() {
  try {
    const result = await apiGenerateSevenQuestions({
      storyIntent,
      totalEpisodes: 10
    })

    if (result.success) {
      setSevenQuestions(result.sevenQuestions)
      // 更新积分显示
      setCreditsRemaining(result.creditsRemaining)
    }
  } catch (err: any) {
    if (err.message === 'INSUFFICIENT_CREDITS') {
      alert('积分不足，请充值')
    } else if (err.message === 'NOT_AUTHENTICATED') {
      setShowLoginModal(true)
    }
  }
}
```

---

### 第四步：App 入口添加登录检查

```tsx
import { useState, useEffect } from 'react'
import { apiGetMe, clearToken } from './services/api-client'
import { LoginModal } from './components/LoginModal'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [credits, setCredits] = useState(0)
  const [showLogin, setShowLogin] = useState(false)

  useEffect(() => { checkAuth() }, [])

  async function checkAuth() {
    try {
      const result = await apiGetMe()
      setIsLoggedIn(true)
      setCredits(result.credits.balance)
    } catch {
      setIsLoggedIn(false)
      clearToken()
      setShowLogin(true)
    }
  }

  if (!isLoggedIn) {
    return showLogin ? (
      <LoginModal
        onSuccess={() => { setShowLogin(false); checkAuth() }}
        onClose={() => setShowLogin(false)}
      />
    ) : null
  }

  return (
    <div>
      <header>积分: {credits}</header>
      {/* 正常应用内容 */}
    </div>
  )
}
```

---

## 改造优先级

| 优先级 | 改造内容 | 难度 |
|--------|----------|------|
| 1 | 七问生成 | 简单 — 一个接口 |
| 2 | 大纲+人物生成 | 中等 — 类似流程 |
| 3 | 详细大纲生成 | 中等 — 超时处理 |
| 4 | 剧本生成 | 复杂 — 流式响应 |

---

## 错误处理

| HTTP 状态码 | 错误码 | 处理 |
|-------------|--------|------|
| 401 | invalid_token / token_expired | 清除 token，显示登录弹窗 |
| 402 | insufficient_credits | 提示充值 |
| 500 | ai_not_configured | 提示联系管理员 |
| 500 | generation_failed | 提示重试 |