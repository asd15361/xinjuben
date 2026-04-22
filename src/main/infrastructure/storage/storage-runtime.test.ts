import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'node:path'

import {
  FORMAL_USER_DATA_DIRNAME,
  resolveFormalUserDataPath,
  resolveStorageRuntime
} from './storage-runtime.ts'

const appDataPath = 'C:/Users/test/AppData/Roaming'
const formalUserDataPath = path.join(appDataPath, FORMAL_USER_DATA_DIRNAME)

test('resolveFormalUserDataPath pins normal app launches to the formal xinjuben store', () => {
  assert.equal(resolveFormalUserDataPath(appDataPath), formalUserDataPath)
})

test('resolveStorageRuntime keeps normal app launch on the formal userData path by default', () => {
  assert.deepStrictEqual(resolveStorageRuntime({}, appDataPath), {
    mode: 'app',
    userDataPath: formalUserDataPath,
    ignoredOverride: null
  })
})

test('resolveStorageRuntime ignores E2E_USER_DATA_DIR without explicit e2e mode', () => {
  assert.deepStrictEqual(
    resolveStorageRuntime(
      {
        E2E_USER_DATA_DIR: 'D:/tmp/test-userdata'
      },
      appDataPath
    ),
    {
      mode: 'app',
      userDataPath: formalUserDataPath,
      ignoredOverride: 'D:/tmp/test-userdata'
    }
  )
})

test('resolveStorageRuntime allows isolated userData only in explicit e2e mode', () => {
  assert.deepStrictEqual(
    resolveStorageRuntime(
      {
        XINJUBEN_APP_MODE: 'e2e',
        E2E_USER_DATA_DIR: 'D:/tmp/test-userdata'
      },
      appDataPath
    ),
    {
      mode: 'e2e',
      userDataPath: 'D:/tmp/test-userdata',
      ignoredOverride: null
    }
  )
})
