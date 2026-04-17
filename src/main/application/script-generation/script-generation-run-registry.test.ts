import test from 'node:test'
import assert from 'node:assert/strict'
import type { Worker } from 'node:worker_threads'

import {
  clearScriptGenerationRunRegistry,
  getScriptGenerationWorker,
  registerScriptGenerationWorker,
  stopScriptGenerationRun
} from './script-generation-run-registry.ts'

function createWorkerStub() {
  const stub = {
    terminateCalls: 0,
    worker: {
      terminate() {
        stub.terminateCalls += 1
        return Promise.resolve(0)
      }
    } as Worker
  }
  return stub
}

test('script generation run registry returns active worker and clears on stop', () => {
  clearScriptGenerationRunRegistry()
  const stub = createWorkerStub()
  registerScriptGenerationWorker('project-1', stub.worker)

  assert.equal(getScriptGenerationWorker('project-1'), stub.worker)

  const stopped = stopScriptGenerationRun('project-1')

  assert.equal(stopped, true)
  assert.equal(stub.terminateCalls, 1)
  assert.equal(getScriptGenerationWorker('project-1'), null)
})

test('script generation run registry replaces older run for same project', () => {
  clearScriptGenerationRunRegistry()
  const first = createWorkerStub()
  const second = createWorkerStub()
  registerScriptGenerationWorker('project-1', first.worker)
  registerScriptGenerationWorker('project-1', second.worker)

  assert.equal(first.terminateCalls, 1)
  assert.equal(getScriptGenerationWorker('project-1'), second.worker)
})
