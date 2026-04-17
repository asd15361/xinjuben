import test from 'node:test'
import assert from 'node:assert/strict'

import { isRetriableStoreFsError } from './project-store-fs.ts'

test('isRetriableStoreFsError recognizes transient Windows file lock codes', () => {
  assert.equal(isRetriableStoreFsError({ code: 'EBUSY' }), true)
  assert.equal(isRetriableStoreFsError({ code: 'EPERM' }), true)
  assert.equal(isRetriableStoreFsError({ code: 'EMFILE' }), true)
  assert.equal(isRetriableStoreFsError({ code: 'ENOENT' }), false)
})
