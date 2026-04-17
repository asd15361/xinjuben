import test from 'node:test'
import assert from 'node:assert/strict'
import { appendRuntimeFailureHistory, resetRuntimeFailureHistory } from './failure-history-queue.ts'

test('appendRuntimeFailureHistory appends new failures and caps queue length', () => {
  const result = appendRuntimeFailureHistory(
    [
      'runtime_interrupted',
      'parse_interrupted',
      'draft_coverage_insufficient',
      'runtime_interrupted',
      'parse_interrupted'
    ],
    'draft_coverage_insufficient'
  )

  assert.deepEqual(result, [
    'parse_interrupted',
    'draft_coverage_insufficient',
    'runtime_interrupted',
    'parse_interrupted',
    'draft_coverage_insufficient'
  ])
})

test('appendRuntimeFailureHistory does not duplicate consecutive same failure', () => {
  const result = appendRuntimeFailureHistory(['runtime_interrupted'], 'runtime_interrupted')
  assert.deepEqual(result, ['runtime_interrupted'])
})

test('resetRuntimeFailureHistory clears history', () => {
  assert.deepEqual(resetRuntimeFailureHistory(), [])
})
