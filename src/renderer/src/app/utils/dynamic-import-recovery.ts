import { useEffect } from 'react'

const DYNAMIC_IMPORT_RELOAD_FLAG = 'xinjuben.dynamic-import-reload-attempted'

type DynamicImportRecoveryEventWindow = Pick<Window, 'addEventListener' | 'removeEventListener'>
type DynamicImportRecoveryReadStorage = Pick<Storage, 'getItem'>
type DynamicImportRecoveryWriteStorage = Pick<Storage, 'getItem' | 'setItem'>
type DynamicImportRecoveryAckStorage = Pick<Storage, 'getItem' | 'removeItem'>

export type DynamicImportRecoveryAttemptResult = 'ignored' | 'reloaded' | 'suppressed'

export const STABLE_RENDERER_ASSET_NAMES = [
  'index.js',
  'index.css',
  'HomeShell.js',
  'ProjectShell.js',
  'ChatStage.js',
  'OutlineStage.js',
  'CharacterStage.js',
  'DetailedOutlineStage.js',
  'ScriptStage.js',
  'home-ui.js',
  'detailed-outline-ui.js',
  'script-plan-service.js',
  'WorkspaceCommons.js',
  'ProjectGenerationBanner.js',
  'AppHeader.js',
  'icons.js',
  'motion.js',
  'react-vendor.js'
] as const

export function isDynamicImportFailure(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  return /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError/i.test(
    message
  )
}

export function canRecoverDynamicImportFailure(storage: DynamicImportRecoveryReadStorage): boolean {
  return storage.getItem(DYNAMIC_IMPORT_RELOAD_FLAG) !== '1'
}

export function markDynamicImportReloadAttempt(storage: Pick<Storage, 'setItem'>): void {
  storage.setItem(DYNAMIC_IMPORT_RELOAD_FLAG, '1')
}

function clearDynamicImportReloadAttempt(storage: Pick<Storage, 'removeItem'>): void {
  storage.removeItem(DYNAMIC_IMPORT_RELOAD_FLAG)
}

export function acknowledgeDynamicImportRecoverySuccess(
  storage: DynamicImportRecoveryAckStorage
): boolean {
  if (canRecoverDynamicImportFailure(storage)) {
    return false
  }

  clearDynamicImportReloadAttempt(storage)
  return true
}

export function useDynamicImportRecoverySuccessAck(
  ackKey: string | null,
  storage?: DynamicImportRecoveryAckStorage | null
): void {
  useEffect(() => {
    const ackStorage = storage ?? (typeof window === 'undefined' ? null : window.sessionStorage)

    if (!ackKey || !ackStorage) {
      return
    }

    acknowledgeDynamicImportRecoverySuccess(ackStorage)
  }, [ackKey, storage])
}

export function buildDynamicImportRecoveryMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `检测到资源版本错位：${message}`
}

export function deriveDynamicImportErrorState(error: unknown): {
  errorStr: string
  importMismatch: boolean
} {
  const importMismatch = isDynamicImportFailure(error)
  return {
    importMismatch,
    errorStr: importMismatch
      ? buildDynamicImportRecoveryMessage(error)
      : error instanceof Error
        ? error.message
        : String(error)
  }
}

export function attemptDynamicImportRecovery(input: {
  error: unknown
  storage: DynamicImportRecoveryWriteStorage
  reload: () => void
}): DynamicImportRecoveryAttemptResult {
  if (!isDynamicImportFailure(input.error)) {
    return 'ignored'
  }
  if (!canRecoverDynamicImportFailure(input.storage)) {
    return 'suppressed'
  }
  markDynamicImportReloadAttempt(input.storage)
  input.reload()
  return 'reloaded'
}

export function reloadCurrentRendererResources(): void {
  window.location.reload()
}

export function installDynamicImportRecoveryLifecycle(input: {
  window: DynamicImportRecoveryEventWindow
  storage: DynamicImportRecoveryWriteStorage
  reload: () => void
}): () => void {
  const handleWindowError = (event: Event): void => {
    const errorEvent = event as ErrorEvent
    const error = errorEvent.error ?? errorEvent.message

    attemptDynamicImportRecovery({
      error,
      storage: input.storage,
      reload: input.reload
    })
  }

  const handleUnhandledRejection = (event: Event): void => {
    const rejectionEvent = event as PromiseRejectionEvent
    const reason = rejectionEvent.reason

    attemptDynamicImportRecovery({
      error: reason,
      storage: input.storage,
      reload: input.reload
    })
  }

  input.window.addEventListener('error', handleWindowError)
  input.window.addEventListener('unhandledrejection', handleUnhandledRejection)

  return () => {
    input.window.removeEventListener('error', handleWindowError)
    input.window.removeEventListener('unhandledrejection', handleUnhandledRejection)
  }
}
