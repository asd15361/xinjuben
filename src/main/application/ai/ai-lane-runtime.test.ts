import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AI_REQUEST_TIMEOUT_PREFIX,
  createAbortSignal,
  normalizeAbortError
} from './ai-lane-runtime.ts'

test('createAbortSignal annotates timeout aborts with a stable reason', async () => {
  const signal = createAbortSignal(10)

  await new Promise((resolve) => setTimeout(resolve, 25))

  assert.equal(signal.aborted, true)
  const normalized = normalizeAbortError(new Error('This operation was aborted'), signal)
  assert.equal(normalized.name, 'TimeoutError')
  assert.equal(normalized.message, `${AI_REQUEST_TIMEOUT_PREFIX}10ms`)
})

test('createAbortSignal preserves parent abort reasons', () => {
  const parent = new AbortController()
  parent.abort(new Error('manual_stop_requested'))

  const signal = createAbortSignal(100, parent.signal)
  const normalized = normalizeAbortError(new Error('This operation was aborted'), signal)

  assert.equal(signal.aborted, true)
  assert.equal(normalized.message, 'manual_stop_requested')
})
