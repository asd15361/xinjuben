import path from 'node:path'

export type StorageRuntimeMode = 'app' | 'e2e'

export const FORMAL_USER_DATA_DIRNAME = 'xinjuben'

export interface StorageRuntimeResolution {
  mode: StorageRuntimeMode
  userDataPath: string
  ignoredOverride: string | null
}

function normalizePath(value: string | undefined): string | null {
  if (!value) return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export function resolveFormalUserDataPath(appDataPath: string): string {
  return path.join(appDataPath, FORMAL_USER_DATA_DIRNAME)
}

export function resolveStorageRuntime(
  env: NodeJS.ProcessEnv = process.env,
  appDataPath: string = process.env.APPDATA || ''
): StorageRuntimeResolution {
  const e2eUserDataDir = normalizePath(env.E2E_USER_DATA_DIR)
  const appMode = normalizePath(env.XINJUBEN_APP_MODE)
  const formalUserDataPath = resolveFormalUserDataPath(appDataPath)

  if (appMode === 'e2e' && e2eUserDataDir) {
    return {
      mode: 'e2e',
      userDataPath: e2eUserDataDir,
      ignoredOverride: null
    }
  }

  return {
    mode: 'app',
    userDataPath: formalUserDataPath,
    ignoredOverride: e2eUserDataDir
  }
}
