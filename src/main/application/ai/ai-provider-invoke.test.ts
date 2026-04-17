import test from 'node:test'
import assert from 'node:assert/strict'
import { createAbortSignal } from './ai-lane-runtime.ts'
import {
  invokeDeepSeek,
  invokeOpenRouter,
  normalizeProviderInvokeError,
  resolveRequestTimeoutMs
} from './ai-provider-invoke.ts'

test('resolveRequestTimeoutMs allows stage-specific timeout to exceed provider default', () => {
  const timeoutMs = resolveRequestTimeoutMs(
    {
      task: 'episode_script',
      prompt: 'test',
      timeoutMs: 120_000
    },
    {
      lane: 'deepseek',
      config: {
        apiKey: 'test',
        baseUrl: 'https://example.com',
        model: 'deepseek-chat',
        systemInstruction: '',
        timeoutMs: 45_000
      }
    }
  )

  assert.equal(timeoutMs, 120_000)
})

test('normalizeProviderInvokeError preserves timeout reason from aborted fetch', async () => {
  const signal = createAbortSignal(1)
  await new Promise((resolve) => setTimeout(resolve, 5))

  const error = normalizeProviderInvokeError('ai_request_timeout:1ms', signal)

  assert.equal(error.name, 'TimeoutError')
  assert.equal(error.message, 'ai_request_timeout:1ms')
})

test('invokeDeepSeek forwards maxOutputTokens as max_tokens', async () => {
  const originalFetch = globalThis.fetch
  let requestBody = '' as string
  globalThis.fetch = (async (_input, init) => {
    requestBody = String(init?.body || '')
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: '{"ok":true}' } }]
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }) as typeof fetch

  try {
    await invokeDeepSeek({
      request: {
        task: 'story_intake',
        prompt: 'test',
        maxOutputTokens: 1234,
        responseFormat: 'json_object'
      },
      laneRuntime: {
        lane: 'deepseek',
        config: {
          apiKey: 'test',
          baseUrl: 'https://example.com',
          model: 'deepseek-chat',
          systemInstruction: '',
          timeoutMs: 45_000
        }
      }
    })
  } finally {
    globalThis.fetch = originalFetch
  }

  const parsed = JSON.parse(requestBody) as {
    max_tokens?: number
    response_format?: { type?: string }
  }
  assert.equal(parsed.max_tokens, 1234)
  assert.equal(parsed.response_format?.type, 'json_object')
})

test('invokeOpenRouter posts to chat completions with configured model', async () => {
  const originalFetch = globalThis.fetch
  let requestUrl = ''
  let requestBody = ''
  globalThis.fetch = (async (input, init) => {
    requestUrl = String(input)
    requestBody = String(init?.body || '')
    return new Response(
      JSON.stringify({
        choices: [{ message: { content: 'ok' } }]
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  }) as typeof fetch

  try {
    const result = await invokeOpenRouter({
      request: {
        task: 'story_intake',
        prompt: 'test prompt'
      },
      laneRuntime: {
        lane: 'openrouter_gemini_flash_lite',
        config: {
          apiKey: 'test',
          baseUrl: 'https://openrouter.ai/api/v1',
          model: 'google/gemini-3.1-flash-lite-preview',
          systemInstruction: '',
          timeoutMs: 45_000
        }
      }
    })

    assert.equal(result.text, 'ok')
  } finally {
    globalThis.fetch = originalFetch
  }

  assert.match(requestUrl, /openrouter\.ai\/api\/v1\/chat\/completions/)
  const parsed = JSON.parse(requestBody) as { model?: string }
  assert.equal(parsed.model, 'google/gemini-3.1-flash-lite-preview')
})
