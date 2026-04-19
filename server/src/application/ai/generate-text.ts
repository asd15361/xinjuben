/**
 * AI 调用服务
 *
 * 支持 DeepSeek 和 OpenRouter 两条通道，自动 fallback
 */
import type { AiGenerateRequestDto, AiGenerateResponseDto } from '../../shared/contracts/ai'
import type { ProviderFamilyConfig, RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config'

type LaneName = 'deepseek' | 'openrouterGeminiFlashLite' | 'openrouterQwenFree'

/**
 * 调用 DeepSeek API
 */
async function invokeDeepSeek(
  request: AiGenerateRequestDto,
  laneConfig: ProviderFamilyConfig,
  systemInstruction?: string,
  parentSignal?: AbortSignal
): Promise<AiGenerateResponseDto> {
  const startedAt = Date.now()

  const body = {
    model: laneConfig.model,
    messages: [
      ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
      { role: 'user', content: request.prompt }
    ],
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxOutputTokens ?? 2000,
    ...(request.responseFormat === 'json_object' ? { response_format: { type: 'json_object' } } : {})
  }

  const timeoutSignal = AbortSignal.timeout(request.timeoutMs ?? laneConfig.timeoutMs)
  const res = await fetch(`${laneConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${laneConfig.apiKey}`
    },
    body: JSON.stringify(body),
    signal: parentSignal ? AbortSignal.any([timeoutSignal, parentSignal]) : timeoutSignal
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`DeepSeek error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''

  return {
    text,
    lane: 'deepseek',
    model: laneConfig.model,
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
    usedFallback: false,
    durationMs: Date.now() - startedAt
  }
}

/**
 * 调用 OpenRouter API
 */
async function invokeOpenRouter(
  request: AiGenerateRequestDto,
  laneConfig: ProviderFamilyConfig,
  systemInstruction?: string,
  parentSignal?: AbortSignal
): Promise<AiGenerateResponseDto> {
  const startedAt = Date.now()

  const body = {
    model: laneConfig.model,
    messages: [
      ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
      { role: 'user', content: request.prompt }
    ],
    temperature: request.temperature ?? 0.7,
    max_tokens: request.maxOutputTokens ?? 2000
  }

  const timeoutSignal = AbortSignal.timeout(request.timeoutMs ?? laneConfig.timeoutMs)
  const res = await fetch(`${laneConfig.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${laneConfig.apiKey}`,
      'HTTP-Referer': 'https://xinjuben.com',
      'X-Title': 'Xinjuben'
    },
    body: JSON.stringify(body),
    signal: parentSignal ? AbortSignal.any([timeoutSignal, parentSignal]) : timeoutSignal
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`OpenRouter error ${res.status}: ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const text = data.choices?.[0]?.message?.content || ''

  return {
    text,
    lane: 'openrouter',
    model: laneConfig.model,
    inputTokens: data.usage?.prompt_tokens,
    outputTokens: data.usage?.completion_tokens,
    usedFallback: false,
    durationMs: Date.now() - startedAt
  }
}

/**
 * 决定通道顺序
 */
function decideLaneOrder(
  request: AiGenerateRequestDto,
  config: RuntimeProviderConfig
): LaneName[] {
  const lanes: LaneName[] = []

  // 根据任务类型选择主通道
  if (request.task === 'seven_questions' || request.task === 'story_intake') {
    // 七问和故事摄入优先用 DeepSeek
    if (config.lanes.deepseek && config.deepseek.apiKey) {
      lanes.push('deepseek')
    }
  }

  // 添加所有可用通道
  if (config.lanes.deepseek && config.deepseek.apiKey && !lanes.includes('deepseek')) {
    lanes.push('deepseek')
  }
  if (config.lanes.openrouterGeminiFlashLite && config.openrouterGeminiFlashLite.apiKey) {
    lanes.push('openrouterGeminiFlashLite')
  }
  if (config.lanes.openrouterQwenFree && config.openrouterQwenFree.apiKey) {
    lanes.push('openrouterQwenFree')
  }

  return lanes
}

/**
 * 判断是否应该 fallback
 */
function shouldFallback(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message.toLowerCase()
  return msg.includes('429') || msg.includes('502') || msg.includes('503') || msg.includes('timeout')
}

/**
 * 获取通道配置
 */
function getLaneConfig(lane: LaneName, config: RuntimeProviderConfig): ProviderFamilyConfig {
  switch (lane) {
    case 'deepseek':
      return config.deepseek
    case 'openrouterGeminiFlashLite':
      return config.openrouterGeminiFlashLite
    case 'openrouterQwenFree':
      return config.openrouterQwenFree
    default:
      return config.deepseek
  }
}

/**
 * 多通道 AI 调用路由器
 *
 * 自动选择通道，失败时 fallback
 */
export async function generateTextWithRouter(
  request: AiGenerateRequestDto,
  config: RuntimeProviderConfig,
  options?: { signal?: AbortSignal }
): Promise<AiGenerateResponseDto> {
  const laneOrder = decideLaneOrder(request, config)

  if (laneOrder.length === 0) {
    throw new Error('no_available_ai_lane: 请配置 DEEPSEEK_API_KEY 或 OPENROUTER_API_KEY')
  }

  let lastError: unknown

  for (let i = 0; i < laneOrder.length; i++) {
    const lane = laneOrder[i]
    const laneConfig = getLaneConfig(lane, config)
    const systemInstruction = laneConfig.systemInstruction || request.systemInstruction

    try {
      const result =
        lane === 'deepseek'
          ? await invokeDeepSeek(request, laneConfig, systemInstruction, options?.signal)
          : await invokeOpenRouter(request, laneConfig, systemInstruction, options?.signal)

      return {
        ...result,
        usedFallback: i > 0
      }
    } catch (error) {
      lastError = error
      console.error(`[AI] Lane ${lane} failed:`, error instanceof Error ? error.message : error)

      // 如果不允许 fallback 或是最后一个通道，抛出错误
      if (request.allowFallback === false || i === laneOrder.length - 1 || !shouldFallback(error)) {
        break
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('ai_generation_failed')
}

export async function generateTextWithRuntimeRouter(
  request: AiGenerateRequestDto,
  config: RuntimeProviderConfig,
  options?: { signal?: AbortSignal }
): Promise<AiGenerateResponseDto> {
  return generateTextWithRouter(request, config, options)
}
