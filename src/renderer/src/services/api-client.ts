/**
 * src/renderer/src/services/api-client.ts
 * HTTP API 客户端封装 - 前后端分离改造第一步
 *
 * 功能：
 * - Token 管理（localStorage 存储 JWT）
 * - 通用请求封装（带认证头的 fetch）
 * - 认证接口（注册、登录、获取用户信息）
 * - 积分接口（查询余额）
 * - 生成接口（七问生成）
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

// ========== Token 管理 ==========

/**
 * 从 localStorage 获取存储的 JWT Token
 */
function getStoredToken(): string | null {
  return localStorage.getItem('xinjuben_token')
}

/**
 * 存储 JWT Token 到 localStorage
 */
export function storeToken(token: string): void {
  localStorage.setItem('xinjuben_token', token)
}

/**
 * 清除 localStorage 中的 JWT Token
 */
export function clearToken(): void {
  localStorage.removeItem('xinjuben_token')
}

// ========== 通用请求封装 ==========

/**
 * API 错误类型
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public code: string,
    public status: number
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * 通用 API 请求封装
 *
 * @param path API 路径（如 /api/auth/login）
 * @param options 请求选项
 * @returns 响应数据
 * @throws ApiError 当请求失败时
 */
async function apiRequest<T>(
  path: string,
  options: {
    method?: 'GET' | 'POST'
    body?: unknown
    requireAuth?: boolean
  } = {}
): Promise<T> {
  const { method = 'GET', body, requireAuth = true } = options

  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  }

  if (requireAuth) {
    const token = getStoredToken()
    if (!token) {
      throw new ApiError('未登录，请先登录', 'NOT_AUTHENTICATED', 401)
    }
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  })

  if (!res.ok) {
    const error = await res.json()
    const errorCode = error.error || 'API_ERROR'
    const errorMsg = error.message || '请求失败'

    if (res.status === 401) {
      clearToken()
      throw new ApiError('登录已过期，请重新登录', 'TOKEN_EXPIRED', 401)
    }
    if (res.status === 402) {
      throw new ApiError('积分不足，请充值', 'INSUFFICIENT_CREDITS', 402)
    }

    throw new ApiError(errorMsg, errorCode, res.status)
  }

  return res.json()
}

// ========== 认证接口 ==========

export interface RegisterInput {
  email: string
  password: string
  passwordConfirm: string
  name?: string
}

export interface LoginInput {
  email: string
  password: string
}

export interface User {
  id: string
  email: string
  name?: string
  created: string
  updated: string
}

export interface AuthResult {
  user: User
  token: string
  credits: { balance: number }
}

/**
 * 用户注册
 * 注册成功自动送 100 积分
 */
export async function apiRegister(input: RegisterInput): Promise<AuthResult> {
  const result = await apiRequest<AuthResult>('/api/auth/register', {
    method: 'POST',
    body: input,
    requireAuth: false
  })
  storeToken(result.token)
  return result
}

/**
 * 用户登录
 */
export async function apiLogin(input: LoginInput): Promise<AuthResult> {
  const result = await apiRequest<AuthResult>('/api/auth/login', {
    method: 'POST',
    body: input,
    requireAuth: false
  })
  storeToken(result.token)
  return result
}

/**
 * 获取当前用户信息
 */
export async function apiGetMe(): Promise<{ user: User; credits: { balance: number; frozenBalance: number } }> {
  return apiRequest('/api/auth/me')
}

// ========== 积分接口 ==========

export interface CreditsBalance {
  balance: number
  frozenBalance: number
}

/**
 * 查询积分余额
 */
export async function apiGetCreditsBalance(): Promise<CreditsBalance> {
  return apiRequest<CreditsBalance>('/api/credits/balance')
}

// ========== 生成接口 ==========

export interface StoryIntent {
  titleHint?: string
  genre?: string
  tone?: string
  protagonist?: string
  antagonist?: string
  coreConflict?: string
  endingDirection?: string
}

export interface SevenQuestionsResult {
  needsSections: boolean
  sectionCount: number
  sectionCountReason: string
  sections: Array<{
    sectionNo: number
    sectionTitle: string
    startEpisode: number
    endEpisode: number
    sevenQuestions: {
      goal: string
      obstacle: string
      effort: string
      result: string
      twist: string
      turnaround: string
      ending: string
    }
  }>
}

export interface GenerateSevenQuestionsResponse {
  success: boolean
  sevenQuestions: SevenQuestionsResult
  lane: string
  model: string
  durationMs: number
  creditsRemaining: number
}

/**
 * 生成七问
 */
export async function apiGenerateSevenQuestions(input: {
  storyIntent: StoryIntent
  totalEpisodes?: number
}): Promise<GenerateSevenQuestionsResponse> {
  return apiRequest<GenerateSevenQuestionsResponse>('/api/generate/seven-questions', {
    method: 'POST',
    body: input
  })
}

/**
 * 通用文本生成（未来扩展）
 */
export async function apiGenerateText(input: {
  task?: string
  prompt: string
  temperature?: number
  maxOutputTokens?: number
  responseFormat?: 'text' | 'json_object'
}): Promise<{
  success: boolean
  text: string
  lane: string
  model: string
  durationMs: number
  creditsRemaining: number
}> {
  return apiRequest('/api/generate', {
    method: 'POST',
    body: input
  })
}

// ========== 粗纲+人物生成接口 ==========

export interface OutlineAndCharactersResponse {
  success: boolean
  outlineDraft: {
    title: string
    genre: string
    theme: string
    protagonist: string
    mainConflict: string
    summary: string
    summaryEpisodes: Array<{ episodeNo: number; summary: string }>
    outlineBlocks?: Array<{
      blockNo: number
      label: string
      startEpisode: number
      endEpisode: number
      summary: string
      episodes: Array<{ episodeNo: number; summary: string }>
      sectionTitle?: string
      sevenQuestions?: SevenQuestionsDto
    }>
    facts: Array<{
      id: string
      label: string
      description: string
    }>
  }
  characterDrafts: Array<{
    name: string
    biography: string
    goal: string
    advantage: string
    weakness: string
    arc: string
    publicMask: string
    hiddenPressure: string
    fear: string
    protectTarget: string
    conflictTrigger: string
    appearance?: string
    personality?: string
    identity?: string
    values?: string
    plotFunction?: string
    depthLevel?: 'core' | 'mid' | 'extra'
  }>
  creditsRemaining: number
}

export interface SevenQuestionsDto {
  goal: string
  obstacle: string
  effort: string
  result: string
  twist: string
  turnaround: string
  ending: string
}

/**
 * 生成粗纲和人物
 *
 * 需要 3 积分（比七问贵）
 */
export async function apiGenerateOutlineAndCharacters(input: {
  storyIntent: StoryIntent
  sevenQuestions: SevenQuestionsResult
  totalEpisodes?: number
}): Promise<OutlineAndCharactersResponse> {
  return apiRequest<OutlineAndCharactersResponse>('/api/generate/outline-and-characters', {
    method: 'POST',
    body: input
  })
}

// ========== 辅助函数 ==========

/**
 * 检查是否已登录（本地 Token 是否存在）
 */
export function hasLocalToken(): boolean {
  return !!getStoredToken()
}

/**
 * 获取 API Base URL（供调试）
 */
export function getApiBase(): string {
  return API_BASE
}