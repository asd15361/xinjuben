import type { AiGenerateRequestDto, AiGenerateResponseDto } from '../../../shared/contracts/ai'
import { createAbortSignal, type LaneRuntime } from './ai-lane-runtime'

function resolveRequestTimeoutMs(request: AiGenerateRequestDto, laneRuntime: LaneRuntime): number {
  const requested = typeof request.timeoutMs === 'number' && Number.isFinite(request.timeoutMs) ? request.timeoutMs : 0
  if (requested > 0) {
    return Math.min(requested, laneRuntime.config.timeoutMs)
  }
  return laneRuntime.config.timeoutMs
}

export async function invokeDeepSeek(input: {
  request: AiGenerateRequestDto
  laneRuntime: LaneRuntime
  systemInstruction?: string
}): Promise<AiGenerateResponseDto> {
  const { request, laneRuntime, systemInstruction } = input
  const timeoutMs = resolveRequestTimeoutMs(request, laneRuntime)
  const response = await fetch(`${laneRuntime.config.baseUrl.replace(/\/$/, '')}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${laneRuntime.config.apiKey}`
    },
    body: JSON.stringify({
      model: laneRuntime.config.model,
      temperature: request.temperature ?? 0.7,
      messages: [
        ...(systemInstruction || laneRuntime.config.systemInstruction || request.systemInstruction
          ? [
              {
                role: 'system',
                content: systemInstruction || request.systemInstruction || laneRuntime.config.systemInstruction
              }
            ]
          : []),
        {
          role: 'user',
          content: request.prompt
        }
      ]
    }),
    signal: createAbortSignal(timeoutMs)
  })

  if (!response.ok) {
    throw new Error(`deepseek_request_failed:${response.status}`)
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const text = payload.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('deepseek_empty_response')

  return {
    text,
    lane: laneRuntime.lane,
    model: laneRuntime.config.model,
    usedFallback: false,
    routeReasonCodes: []
  }
}

export async function invokeGemini(input: {
  request: AiGenerateRequestDto
  laneRuntime: LaneRuntime
  systemInstruction?: string
}): Promise<AiGenerateResponseDto> {
  const { request, laneRuntime, systemInstruction } = input
  const timeoutMs = resolveRequestTimeoutMs(request, laneRuntime)
  const response = await fetch(
    `${laneRuntime.config.baseUrl.replace(/\/$/, '')}/v1beta/models/${laneRuntime.config.model}:generateContent?key=${laneRuntime.config.apiKey}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        systemInstruction:
          systemInstruction || request.systemInstruction || laneRuntime.config.systemInstruction
            ? {
                parts: [
                  {
                    text: systemInstruction || request.systemInstruction || laneRuntime.config.systemInstruction
                  }
                ]
              }
            : undefined,
        generationConfig: {
          temperature: request.temperature ?? 0.7
        },
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: request.prompt
              }
            ]
          }
        ]
      }),
      signal: createAbortSignal(timeoutMs)
    }
  )

  if (!response.ok) {
    throw new Error(`gemini_request_failed:${response.status}`)
  }

  const payload = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }

  const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim()
  if (!text) throw new Error('gemini_empty_response')

  return {
    text,
    lane: laneRuntime.lane,
    model: laneRuntime.config.model,
    usedFallback: false,
    routeReasonCodes: []
  }
}
