import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getEstimatedSeconds,
  getGenerationTimingLabel,
  getTimingStats,
  recordGenerationDuration
} from './generation-timing-service.ts'

function installLocalStorageMock(): void {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value)
      },
      removeItem: (key: string) => {
        store.delete(key)
      },
      clear: () => {
        store.clear()
      }
    },
    configurable: true
  })
}

test('generation timing uses fallback first, then persists local average per task', () => {
  installLocalStorageMock()

  assert.equal(getEstimatedSeconds('seven_questions', 60), 60)
  assert.deepEqual(getTimingStats('seven_questions'), { count: 0, avgSeconds: null })
  assert.match(getGenerationTimingLabel('seven_questions'), /首次生成/)

  recordGenerationDuration('seven_questions', 40_000)
  recordGenerationDuration('seven_questions', 80_000)

  assert.equal(getEstimatedSeconds('seven_questions', 60), 60)
  assert.deepEqual(getTimingStats('seven_questions'), { count: 2, avgSeconds: 60 })
  assert.match(getGenerationTimingLabel('seven_questions'), /本地均值 60 秒/)
})
