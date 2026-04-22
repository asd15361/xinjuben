import test from 'node:test'
import assert from 'node:assert/strict'

import {
  acknowledgeDynamicImportRecoverySuccess,
  attemptDynamicImportRecovery,
  buildDynamicImportRecoveryMessage,
  canRecoverDynamicImportFailure,
  deriveDynamicImportErrorState,
  installDynamicImportRecoveryLifecycle,
  isDynamicImportFailure,
  reloadCurrentRendererResources,
  STABLE_RENDERER_ASSET_NAMES,
  markDynamicImportReloadAttempt
} from './dynamic-import-recovery.ts'

type LifecycleEventName = 'error' | 'load' | 'unhandledrejection'
type LifecycleListener = (event?: unknown) => void
type LifecycleReadyState = 'complete' | 'interactive' | 'loading'

function createStorage(): {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
} {
  const values = new Map<string, string>()
  return {
    getItem(key: string) {
      return values.get(key) ?? null
    },
    setItem(key: string, value: string) {
      values.set(key, value)
    },
    removeItem(key: string) {
      values.delete(key)
    }
  }
}

function createLifecycleWindow(readyState: LifecycleReadyState = 'loading'): {
  document: { readyState: LifecycleReadyState }
  addEventListener: (eventName: LifecycleEventName, listener: LifecycleListener) => void
  dispatchEvent: (eventName: LifecycleEventName, event?: unknown) => void
} {
  const listeners = new Map<LifecycleEventName, Set<LifecycleListener>>()

  const windowLike = {
    document: {
      readyState
    },
    addEventListener(eventName: LifecycleEventName, listener: LifecycleListener) {
      const eventListeners = listeners.get(eventName) ?? new Set<LifecycleListener>()
      eventListeners.add(listener)
      listeners.set(eventName, eventListeners)
    },
    removeEventListener(eventName: LifecycleEventName, listener: LifecycleListener) {
      listeners.get(eventName)?.delete(listener)
    }
  }

  return {
    window: windowLike as unknown as Pick<Window, 'addEventListener' | 'removeEventListener'> & {
      document: Pick<Document, 'readyState'>
    },
    dispatch(eventName: LifecycleEventName, event: unknown = {}) {
      for (const listener of listeners.get(eventName) ?? []) {
        listener(event)
      }
    },
    listenerCount(eventName: LifecycleEventName) {
      return listeners.get(eventName)?.size ?? 0
    }
  }
}

test('isDynamicImportFailure detects chunk drift failures', () => {
  assert.equal(
    isDynamicImportFailure(
      new Error('Failed to fetch dynamically imported module: file:///old-chunk.js')
    ),
    true
  )
  assert.equal(isDynamicImportFailure(new Error('ChunkLoadError: Loading chunk 42 failed.')), true)
  assert.equal(isDynamicImportFailure(new Error('ordinary render error')), false)
})

test('dynamic import recovery only allows one reload until success ACK clears the prior attempt', () => {
  const storage = createStorage()

  assert.equal(canRecoverDynamicImportFailure(storage), true)
  markDynamicImportReloadAttempt(storage)
  assert.equal(canRecoverDynamicImportFailure(storage), false)
  assert.equal(acknowledgeDynamicImportRecoverySuccess(storage), true)
  assert.equal(canRecoverDynamicImportFailure(storage), true)
})

test('buildDynamicImportRecoveryMessage explains resource drift', () => {
  const message = buildDynamicImportRecoveryMessage(
    new Error('Failed to fetch dynamically imported module')
  )

  assert.match(message, /资源版本错位/)
  assert.match(message, /Failed to fetch dynamically imported module/)
})

test('deriveDynamicImportErrorState marks import mismatch only for chunk drift failures', () => {
  const importState = deriveDynamicImportErrorState(
    new Error('Failed to fetch dynamically imported module: file:///assets/ScriptStage-old.js')
  )
  const ordinaryState = deriveDynamicImportErrorState(new Error('ordinary render error'))

  assert.equal(importState.importMismatch, true)
  assert.match(importState.errorStr, /资源版本错位/)
  assert.equal(ordinaryState.importMismatch, false)
  assert.equal(ordinaryState.errorStr, 'ordinary render error')
})

test('attemptDynamicImportRecovery returns reloaded, suppressed, and ignored in the expected cases', () => {
  const storage = createStorage()
  let reloadCount = 0
  const reload = (): void => {
    reloadCount += 1
  }

  const first = attemptDynamicImportRecovery({
    error: new Error('ChunkLoadError: Loading chunk 42 failed.'),
    storage,
    reload
  })
  const second = attemptDynamicImportRecovery({
    error: new Error('ChunkLoadError: Loading chunk 42 failed.'),
    storage,
    reload
  })
  const ordinary = attemptDynamicImportRecovery({
    error: new Error('ordinary render error'),
    storage,
    reload
  })

  assert.equal(first, 'reloaded')
  assert.equal(second, 'suppressed')
  assert.equal(ordinary, 'ignored')
  assert.equal(reloadCount, 1)
})

test('acknowledgeDynamicImportRecoverySuccess is the only path that rearms an exhausted reload attempt', () => {
  const storage = createStorage()

  markDynamicImportReloadAttempt(storage)

  assert.equal(canRecoverDynamicImportFailure(storage), false)
  assert.equal(acknowledgeDynamicImportRecoverySuccess(storage), true)
  assert.equal(canRecoverDynamicImportFailure(storage), true)
  assert.equal(acknowledgeDynamicImportRecoverySuccess(storage), false)
})

test('installDynamicImportRecoveryLifecycle does not clear the reload flag on startup or register any load-based rearm', () => {
  const storage = createStorage()
  const lifecycleWindow = createLifecycleWindow('complete')

  markDynamicImportReloadAttempt(storage)

  installDynamicImportRecoveryLifecycle({
    window: lifecycleWindow.window,
    storage,
    reload() {
      throw new Error('reload should not be called in this test')
    }
  })

  assert.equal(canRecoverDynamicImportFailure(storage), false)
  assert.equal(lifecycleWindow.listenerCount('load'), 0)

  lifecycleWindow.dispatch('load')

  assert.equal(canRecoverDynamicImportFailure(storage), false)
})

test('installDynamicImportRecoveryLifecycle suppresses repeated auto-reload until an explicit success ACK rearms it', () => {
  const storage = createStorage()
  const lifecycleWindow = createLifecycleWindow()
  let reloadCount = 0

  installDynamicImportRecoveryLifecycle({
    window: lifecycleWindow.window,
    storage,
    reload() {
      reloadCount += 1
    }
  })

  lifecycleWindow.dispatch('error', {
    error: new Error('ChunkLoadError: Loading chunk 42 failed.')
  })
  lifecycleWindow.dispatch('unhandledrejection', {
    reason: new Error('Failed to fetch dynamically imported module: file:///assets/ScriptStage.js')
  })

  assert.equal(reloadCount, 1)
  assert.equal(canRecoverDynamicImportFailure(storage), false)

  assert.equal(acknowledgeDynamicImportRecoverySuccess(storage), true)
  lifecycleWindow.dispatch('unhandledrejection', {
    reason: new Error('ChunkLoadError: Loading chunk 42 failed.')
  })

  assert.equal(reloadCount, 2)
  assert.equal(canRecoverDynamicImportFailure(storage), false)
})

test('installDynamicImportRecoveryLifecycle keeps ordinary exceptions out of the import-mismatch reload path', () => {
  const storage = createStorage()
  const lifecycleWindow = createLifecycleWindow()
  let reloadCount = 0

  installDynamicImportRecoveryLifecycle({
    window: lifecycleWindow.window,
    storage,
    reload() {
      reloadCount += 1
    }
  })

  lifecycleWindow.dispatch('error', {
    error: new Error('ordinary render error')
  })
  lifecycleWindow.dispatch('unhandledrejection', {
    reason: new Error('ordinary async failure')
  })

  assert.equal(reloadCount, 0)
  assert.equal(canRecoverDynamicImportFailure(storage), true)
})

test('stable renderer asset names include lazy entry chunks', () => {
  assert.ok(STABLE_RENDERER_ASSET_NAMES.includes('HomeShell.js'))
  assert.ok(STABLE_RENDERER_ASSET_NAMES.includes('ProjectShell.js'))
  assert.ok(STABLE_RENDERER_ASSET_NAMES.includes('ScriptStage.js'))
  assert.ok(STABLE_RENDERER_ASSET_NAMES.includes('DetailedOutlineStage.js'))
})

test('reloadCurrentRendererResources calls window.location.reload once', () => {
  let reloadCount = 0
  const originalWindow = globalThis.window
  ;(globalThis as unknown as { window: Window }).window = {
    location: {
      reload() {
        reloadCount += 1
      }
    }
  } as unknown as Window

  try {
    reloadCurrentRendererResources()
    assert.equal(reloadCount, 1)
  } finally {
    ;(globalThis as unknown as { window: Window | undefined }).window = originalWindow
  }
})
