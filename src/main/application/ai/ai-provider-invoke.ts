import type { AiGenerateRequestDto, AiGenerateResponseDto } from '../../../shared/contracts/ai'
import { createAbortSignal, normalizeAbortError, type LaneRuntime } from './ai-lane-runtime.ts'

export function resolveRequestTimeoutMs(
  request: AiGenerateRequestDto,
  laneRuntime: LaneRuntime
): number {
  const requested =
    typeof request.timeoutMs === 'number' && Number.isFinite(request.timeoutMs)
      ? request.timeoutMs
      : 0
  if (requested > 0) {
    return requested
  }
  return laneRuntime.config.timeoutMs
}

function resolveMaxOutputTokens(request: AiGenerateRequestDto): number | undefined {
  const requested =
    typeof request.maxOutputTokens === 'number' && Number.isFinite(request.maxOutputTokens)
      ? Math.floor(request.maxOutputTokens)
      : 0
  return requested > 0 ? requested : undefined
}

function resolveResponseFormat(request: AiGenerateRequestDto): { type: 'json_object' } | undefined {
  if (request.responseFormat === 'json_object') {
    return { type: 'json_object' }
  }
  return undefined
}

export function normalizeProviderInvokeError(error: unknown, signal: AbortSignal): Error {
  if (signal.aborted) {
    const baseError =
      error instanceof Error
        ? error
        : new Error(
            typeof signal.reason === 'string'
              ? signal.reason
              : String(error || 'ai_request_aborted')
          )
    return normalizeAbortError(baseError, signal)
  }

  if (error instanceof Error) return error
  return new Error(String(error || 'ai_generation_failed'))
}

async function invokeChatCompletionsProvider(input: {
  request: AiGenerateRequestDto
  laneRuntime: LaneRuntime
  systemInstruction?: string
  parentSignal?: AbortSignal
  providerName: string
}): Promise<AiGenerateResponseDto> {
  const { request, laneRuntime, systemInstruction, parentSignal, providerName } = input
  const timeoutMs = resolveRequestTimeoutMs(request, laneRuntime)
  const maxOutputTokens = resolveMaxOutputTokens(request)
  const responseFormat = resolveResponseFormat(request)
  const signal = createAbortSignal(timeoutMs, parentSignal)

  const maxRetries = 3
  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      if (attempt > 0) {
        const backoffMs = Math.min(1000 * Math.pow(2, attempt - 1), 8000)
        await new Promise((resolve) => setTimeout(resolve, backoffMs))
      }

      const response = await fetch(
        `${laneRuntime.config.baseUrl.replace(/\/$/, '')}/chat/completions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${laneRuntime.config.apiKey}`
          },
          body: JSON.stringify({
            model: laneRuntime.config.model,
            temperature: request.temperature ?? 0.7,
            ...(maxOutputTokens ? { max_tokens: maxOutputTokens } : {}),
            ...(responseFormat ? { response_format: responseFormat } : {}),
            messages: [
              ...(systemInstruction ||
              laneRuntime.config.systemInstruction ||
              request.systemInstruction
                ? [
                    {
                      role: 'system',
                      content:
                        systemInstruction ||
                        request.systemInstruction ||
                        laneRuntime.config.systemInstruction
                    }
                  ]
                : []),
              {
                role: 'user',
                content: request.prompt
              }
            ]
          }),
          signal
        }
      )

      if (response.status === 429 && attempt < maxRetries) {
        continue
      }

      if (!response.ok) {
        throw new Error(`${providerName}_request_failed:${response.status}`)
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>
      }

      const firstChoice = payload.choices?.[0]
      const text = firstChoice?.message?.content?.trim()
      if (!text) throw new Error(`${providerName}_empty_response`)

      return {
        text,
        lane: laneRuntime.lane,
        model: laneRuntime.config.model,
        usedFallback: false,
        finishReason: firstChoice?.finish_reason,
        routeReasonCodes: []
      }
    } catch (error) {
      if (attempt < maxRetries && error instanceof Error && error.message.includes('429')) {
        continue
      }
      throw normalizeProviderInvokeError(error, signal)
    }
  }

  throw new Error(`${providerName}_request_failed:429_exhausted_retries`)
}

export async function invokeDeepSeek(input: {
  request: AiGenerateRequestDto
  laneRuntime: LaneRuntime
  systemInstruction?: string
  parentSignal?: AbortSignal
}): Promise<AiGenerateResponseDto> {
  return invokeChatCompletionsProvider({
    ...input,
    providerName: 'deepseek'
  })
}

export async function invokeOpenRouter(input: {
  request: AiGenerateRequestDto
  laneRuntime: LaneRuntime
  systemInstruction?: string
  parentSignal?: AbortSignal
}): Promise<AiGenerateResponseDto> {
  return invokeChatCompletionsProvider({
    ...input,
    providerName: 'openrouter'
  })
}
