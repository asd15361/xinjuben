import type { AiGenerateRequestDto, AiGenerateResponseDto } from '../../../shared/contracts/ai.ts'
import type { RuntimeProviderConfig } from '../../infrastructure/runtime-env/provider-config.ts'
import { resolveLaneRuntime } from './ai-lane-runtime.ts'
import { mockAiEnabled, createMockResponse } from './ai-mock-response.ts'
import { invokeDeepSeek, invokeOpenRouter } from './ai-provider-invoke.ts'
import {
  decideRuntimeRoute,
  resolveLaneSystemInstruction,
  shouldFallbackForError
} from './model-router.ts'

export async function generateTextWithRuntimeRouter(
  request: AiGenerateRequestDto,
  runtimeConfig: RuntimeProviderConfig,
  options?: { signal?: AbortSignal }
): Promise<AiGenerateResponseDto> {
  if (mockAiEnabled()) {
    return createMockResponse(request)
  }

  const decision = decideRuntimeRoute(request, runtimeConfig)
  const laneOrder = decision.primary
  if (laneOrder.length === 0) {
    throw new Error('no_available_ai_lane')
  }

  let lastError: unknown

  for (let index = 0; index < laneOrder.length; index += 1) {
    const lane = laneOrder[index]
    const laneRuntime = resolveLaneRuntime(lane, runtimeConfig)
    const systemInstruction =
      resolveLaneSystemInstruction(lane, runtimeConfig) || request.systemInstruction

    try {
      const result =
        lane === 'deepseek'
          ? await invokeDeepSeek({
              request,
              laneRuntime,
              systemInstruction,
              parentSignal: options?.signal
            })
          : await invokeOpenRouter({
              request,
              laneRuntime,
              systemInstruction,
              parentSignal: options?.signal
            })

      return {
        ...result,
        usedFallback: index > 0,
        routeReasonCodes: decision.reasonCodes
      }
    } catch (error) {
      lastError = error
      if (
        request.allowFallback === false ||
        index === laneOrder.length - 1 ||
        !shouldFallbackForError(error)
      ) {
        break
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(String(lastError || 'ai_generation_failed'))
}
