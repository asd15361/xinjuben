import test from 'node:test'
import assert from 'node:assert/strict'
import { decideRuntimeRoute, shouldFallbackForError } from './model-router.ts'

test('shouldFallbackForError retries on explicit ai request timeouts', () => {
  assert.equal(shouldFallbackForError(new Error('ai_request_timeout:120000ms')), true)
})

test('shouldFallbackForError does not retry when the parent explicitly aborted the request', () => {
  assert.equal(shouldFallbackForError(new Error('ai_request_aborted_by_parent')), false)
})

test('decideRuntimeRoute exposes openrouter lanes before deepseek when configured', () => {
  const decision = decideRuntimeRoute(
    {
      task: 'episode_script',
      prompt: 'test'
    },
    {
      deepseek: {
        apiKey: 'deepseek-key',
        baseUrl: 'https://api.deepseek.com',
        model: 'deepseek-chat',
        systemInstruction: '',
        timeoutMs: 45_000
      },
      openrouterGeminiFlashLite: {
        apiKey: 'or-key',
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'google/gemini-3.1-flash-lite-preview',
        systemInstruction: '',
        timeoutMs: 45_000
      },
      openrouterQwenFree: {
        apiKey: 'or-key',
        baseUrl: 'https://openrouter.ai/api/v1',
        model: 'qwen/qwen3.6-plus-preview:free',
        systemInstruction: '',
        timeoutMs: 45_000
      },
      lanes: {
        deepseek: true,
        openrouterGeminiFlashLite: true,
        openrouterQwenFree: true
      },
      runtimeFetchTimeoutMs: 15000
    }
  )

  assert.deepEqual(decision.primary, [
    'openrouter_gemini_flash_lite',
    'openrouter_qwen_free',
    'deepseek'
  ])
})
