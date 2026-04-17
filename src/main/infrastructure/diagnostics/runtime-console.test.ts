import test from 'node:test'
import assert from 'node:assert/strict'

import { shouldPrintRuntimeConsole } from './runtime-console.ts'

test('shouldPrintRuntimeConsole is disabled by default', () => {
  assert.equal(shouldPrintRuntimeConsole({}), false)
  assert.equal(shouldPrintRuntimeConsole({ NODE_ENV: 'development' }), false)
  assert.equal(shouldPrintRuntimeConsole({ NODE_ENV: 'production' }), false)
})

test('shouldPrintRuntimeConsole only enables stdout on explicit opt-in', () => {
  assert.equal(shouldPrintRuntimeConsole({ XINJUBEN_ENABLE_RUNTIME_STDOUT: '1' }), true)
  assert.equal(shouldPrintRuntimeConsole({ XINJUBEN_ENABLE_RUNTIME_STDOUT: 'true' }), true)
  assert.equal(shouldPrintRuntimeConsole({ XINJUBEN_ENABLE_RUNTIME_STDOUT: 'on' }), true)
  assert.equal(shouldPrintRuntimeConsole({ XINJUBEN_ENABLE_RUNTIME_STDOUT: '0' }), false)
})
