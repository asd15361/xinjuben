import test from 'node:test'
import assert from 'node:assert/strict'

import { runRoughOutlineStageWithRetries } from './rough-outline-retry-policy.ts'

test('runRoughOutlineStageWithRetries fails fast after three attempts', async () => {
  let attempts = 0

  await assert.rejects(
    () =>
      runRoughOutlineStageWithRetries({
        stage: 'rough_outline_overview',
        logContext: 'unit-test',
        run: async () => {
          attempts += 1
          throw new Error('rough_outline_incomplete:missing_summary')
        }
      }),
    /rough_outline_overview_retry_exhausted:rough_outline_incomplete:missing_summary/
  )

  assert.equal(attempts, 3)
})

test('runRoughOutlineStageWithRetries returns immediately after a successful retry', async () => {
  let attempts = 0

  const result = await runRoughOutlineStageWithRetries({
    stage: 'rough_outline_batch',
    logContext: 'unit-test',
    run: async () => {
      attempts += 1
      if (attempts < 3) {
        throw new Error('rough_outline_batch_parse_failed')
      }
      return { ok: true }
    }
  })

  assert.deepEqual(result, { ok: true })
  assert.equal(attempts, 3)
})
