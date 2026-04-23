import type {
  CreateProjectInputDto,
  ProjectSnapshotDto,
  ProjectSummaryDto
} from '../../../shared/contracts/project.ts'
import type {
  ConfirmStoryIntentFromChatInputDto,
  ConfirmStoryIntentFromChatResultDto,
  SaveChatMessagesInputDto,
  SaveCharacterDraftsInputDto,
  SaveConfirmedSevenQuestionsInputDto,
  SaveDetailedOutlineSegmentsInputDto,
  SaveOutlineDraftInputDto,
  SaveScriptDraftInputDto,
  SaveScriptRuntimeStateInputDto,
  SaveStoryIntentInputDto
} from '../../../shared/contracts/workspace.ts'
import type {
  CharacterDraftDto,
  DetailedOutlineSegmentDto,
  OutlineDraftDto,
  ScriptSegmentDto
} from '../../../shared/contracts/workflow.ts'
import type {
  ScriptGenerationFailureResolutionDto,
  ScriptGenerationProgressBoardDto
} from '../../../shared/contracts/script-generation.ts'
import type { ScriptStateLedgerDto } from '../../../shared/contracts/script-ledger.ts'

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

const API_BASE = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE) || 'http://localhost:3001'

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
  code: string
  status: number
  shouldLogin?: boolean

  constructor(
    message: string,
    code: string,
    status: number,
    shouldLogin?: boolean
  ) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
    this.shouldLogin = shouldLogin
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
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
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
    const shouldLogin = error.shouldLogin

    if (res.status === 401) {
      clearToken()
      throw new ApiError('登录已过期，请重新登录', 'TOKEN_EXPIRED', 401)
    }
    if (res.status === 402) {
      throw new ApiError('积分不足，请充值', 'INSUFFICIENT_CREDITS', 402)
    }

    throw new ApiError(errorMsg, errorCode, res.status, shouldLogin)
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
export async function apiGetMe(): Promise<{
  user: User
  credits: { balance: number; frozenBalance: number }
}> {
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

// ========== 项目接口 ==========

export async function apiListProjects(): Promise<{ projects: ProjectSummaryDto[] }> {
  return apiRequest('/api/projects')
}

export async function apiCreateProject(
  input: CreateProjectInputDto
): Promise<{ project: ProjectSnapshotDto }> {
  return apiRequest('/api/projects', {
    method: 'POST',
    body: input
  })
}

export async function apiGetProject(
  projectId: string
): Promise<{ project: ProjectSnapshotDto | null }> {
  return apiRequest(`/api/projects/${projectId}`)
}

export async function apiDeleteProject(projectId: string): Promise<{ ok: boolean }> {
  return apiRequest(`/api/projects/${projectId}`, {
    method: 'DELETE'
  })
}

// ---------------------------------------------------------------------------
// Story Intent
// ---------------------------------------------------------------------------

export async function apiConfirmStoryIntentFromChat(
  input: ConfirmStoryIntentFromChatInputDto
): Promise<ConfirmStoryIntentFromChatResultDto> {
  return apiRequest<ConfirmStoryIntentFromChatResultDto>(
    `/api/projects/${input.projectId}/confirm-story-intent`,
    {
      method: 'POST',
      body: { chatTranscript: input.chatTranscript }
    }
  )
}

export async function apiSaveStoryIntent(
  input: SaveStoryIntentInputDto
): Promise<{ project: ProjectSnapshotDto | null }> {
  return apiRequest(`/api/projects/${input.projectId}/story-intent`, {
    method: 'POST',
    body: input
  })
}

export async function apiSaveChatMessages(
  input: SaveChatMessagesInputDto
): Promise<{ project: ProjectSnapshotDto | null }> {
  return apiRequest(`/api/projects/${input.projectId}/chat-messages`, {
    method: 'POST',
    body: input
  })
}

export async function apiSaveOutlineDraft(
  input: SaveOutlineDraftInputDto
): Promise<{ project: ProjectSnapshotDto | null }> {
  return apiRequest(`/api/projects/${input.projectId}/outline`, {
    method: 'POST',
    body: input
  })
}

export async function apiSaveCharacterDrafts(
  input: SaveCharacterDraftsInputDto
): Promise<{ project: ProjectSnapshotDto | null }> {
  return apiRequest(`/api/projects/${input.projectId}/characters`, {
    method: 'POST',
    body: input
  })
}

export async function apiSaveConfirmedSevenQuestions(
  input: SaveConfirmedSevenQuestionsInputDto
): Promise<{ project: ProjectSnapshotDto | null }> {
  return apiRequest(`/api/projects/${input.projectId}/seven-questions/confirm`, {
    method: 'POST',
    body: input
  })
}

export async function apiSaveDetailedOutlineSegments(
  input: SaveDetailedOutlineSegmentsInputDto
): Promise<{ project: ProjectSnapshotDto | null }> {
  return apiRequest(`/api/projects/${input.projectId}/detailed-outline`, {
    method: 'POST',
    body: input
  })
}

export async function apiSaveScriptDraft(
  input: SaveScriptDraftInputDto
): Promise<{ project: ProjectSnapshotDto | null }> {
  return apiRequest(`/api/projects/${input.projectId}/script`, {
    method: 'POST',
    body: input
  })
}

export async function apiSaveScriptRuntimeState(
  input: SaveScriptRuntimeStateInputDto
): Promise<{ project: ProjectSnapshotDto | null }> {
  return apiRequest(`/api/projects/${input.projectId}/runtime-state`, {
    method: 'POST',
    body: input
  })
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
  project: ProjectSnapshotDto
  outlineDraft: OutlineDraftDto
  characterDrafts: CharacterDraftDto[]
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
  projectId: string
}): Promise<OutlineAndCharactersResponse> {
  return apiRequest<OutlineAndCharactersResponse>('/api/generate/outline-and-characters', {
    method: 'POST',
    body: input
  })
}

// ========== 详细大纲生成接口 ==========

export interface DetailedOutlineResponse {
  success: boolean
  project: ProjectSnapshotDto
  detailedOutlineSegments: DetailedOutlineSegmentDto[]
  creditsRemaining: number
}

/**
 * 生成详细大纲
 *
 * 需要 5 积分（比粗纲贵）
 */
export async function apiGenerateDetailedOutline(input: {
  projectId: string
}): Promise<DetailedOutlineResponse> {
  return apiRequest<DetailedOutlineResponse>('/api/generate/detailed-outline', {
    method: 'POST',
    body: input
  })
}

// ========== 剧本生成接口 ==========

export interface ScriptGenerationStartResponse {
  success: boolean
  taskId: string
  board: unknown
  status: 'running' | 'paused' | 'stopped' | 'completed' | 'failed'
  message: string
}

export interface ScriptGenerationStatusResponse {
  projectId: string
  userId: string
  status: 'running' | 'paused' | 'stopped' | 'completed' | 'failed'
  totalEpisodes: number
  completedEpisodes: number
  startedAt: string
  board: unknown
  progress: string
  // 完整生成结果（renderer 收到后写本地 content store）
  generatedScenes?: ScriptSegmentDto[]
  failure?: ScriptGenerationFailureResolutionDto | null
  ledger?: ScriptStateLedgerDto | null
}

/**
 * 启动剧本生成
 */
export async function apiStartScriptGeneration(input: {
  projectId: string
  targetEpisodes?: number
  mode?: 'fresh_start' | 'resume'
}): Promise<ScriptGenerationStartResponse> {
  return apiRequest<ScriptGenerationStartResponse>('/api/script-generation/start', {
    method: 'POST',
    body: input
  })
}

/**
 * 查询剧本生成状态（轮询用）
 */
export async function apiGetScriptGenerationStatus(
  projectId: string
): Promise<ScriptGenerationStatusResponse> {
  return apiRequest<ScriptGenerationStatusResponse>(`/api/script-generation/status/${projectId}`)
}

/**
 * 暂停剧本生成
 */
export async function apiPauseScriptGeneration(
  projectId: string
): Promise<{ success: boolean; status: string; message: string }> {
  return apiRequest('/api/script-generation/pause', {
    method: 'POST',
    body: { projectId }
  })
}

/**
 * 恢复剧本生成
 */
export async function apiResumeScriptGeneration(
  projectId: string
): Promise<ScriptGenerationStartResponse> {
  return apiRequest<ScriptGenerationStartResponse>('/api/script-generation/resume', {
    method: 'POST',
    body: { projectId }
  })
}

/**
 * 停止剧本生成
 */
export async function apiStopScriptGeneration(
  projectId: string
): Promise<{ success: boolean; status: string; message: string }> {
  return apiRequest('/api/script-generation/stop', {
    method: 'POST',
    body: { projectId }
  })
}

/**
 * 单集重写
 */
export async function apiRewriteScriptEpisode(input: {
  projectId: string
  episodeNo: number
}): Promise<{
  success: boolean
  message: string
  projectId: string
  episodeNo: number
  durationMs: number
  rewrittenScene?: ScriptSegmentDto
  ledger?: ScriptStateLedgerDto | null
}> {
  return apiRequest('/api/script-generation/rewrite', {
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

// ========== Stage Contract 接口 ==========

import type { InputContractValidationDto } from '../../../shared/contracts/input-contract.ts'
import type { StageContractType } from '../../../shared/contracts/stage-contract.ts'

/**
 * 阶段放行校验
 *
 * POST /api/stage/validate-contract
 */
export async function apiValidateStageContract(input: {
  projectId: string
  targetStage: StageContractType
}): Promise<InputContractValidationDto> {
  return apiRequest<InputContractValidationDto>('/api/stage/validate-contract', {
    method: 'POST',
    body: input
  })
}

// ========== Formal Fact 接口 ==========

import type {
  DeclareFormalFactForProjectInputDto,
  DeclareFormalFactForProjectResultDto,
  ConfirmFormalFactForProjectInputDto,
  ConfirmFormalFactForProjectResultDto,
  RemoveFormalFactForProjectInputDto,
  RemoveFormalFactForProjectResultDto
} from '../../../shared/contracts/workspace.ts'

/**
 * 声明正式事实
 *
 * POST /api/formal-fact/declare
 */
export async function apiDeclareFormalFact(
  input: DeclareFormalFactForProjectInputDto
): Promise<DeclareFormalFactForProjectResultDto & { fact?: unknown }> {
  return apiRequest('/api/formal-fact/declare', {
    method: 'POST',
    body: input
  })
}

/**
 * 确认正式事实
 *
 * POST /api/formal-fact/confirm
 */
export async function apiConfirmFormalFact(
  input: ConfirmFormalFactForProjectInputDto
): Promise<ConfirmFormalFactForProjectResultDto> {
  return apiRequest('/api/formal-fact/confirm', {
    method: 'POST',
    body: input
  })
}

/**
 * 移除正式事实
 *
 * POST /api/formal-fact/remove
 */
export async function apiRemoveFormalFact(
  input: RemoveFormalFactForProjectInputDto
): Promise<RemoveFormalFactForProjectResultDto> {
  return apiRequest('/api/formal-fact/remove', {
    method: 'POST',
    body: input
  })
}

// ========== Script Audit 接口 ==========

import type { ExecuteScriptRepairInputDto } from '../../../shared/contracts/script-audit.ts'

/**
 * 执行剧本修复
 *
 * POST /api/script-audit/execute-repair
 */
export async function apiExecuteScriptRepair(
  input: ExecuteScriptRepairInputDto
): Promise<{ success: boolean; message: string; projectId: string; suggestionCount: number }> {
  return apiRequest('/api/script-audit/execute-repair', {
    method: 'POST',
    body: input
  })
}
