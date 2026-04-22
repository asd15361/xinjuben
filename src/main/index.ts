import { app, BrowserWindow } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'
import { createWindow } from './app/bootstrap/create-window.ts'
import { registerIpcHandlers } from './app/bootstrap/register-ipc.ts'
import { loadRuntimeEnv } from './infrastructure/runtime-env/load-runtime-env.ts'
import { loadRuntimeProviderConfig } from './infrastructure/runtime-env/provider-config.ts'
import { resolveStorageRuntime } from './infrastructure/storage/storage-runtime.ts'
import {
  appendRuntimeDiagnosticLog,
  getRuntimeDiagnosticLogPath
} from './infrastructure/diagnostics/runtime-diagnostic-log.ts'
import {
  runtimeConsoleError,
  runtimeConsoleWarn,
  runtimeConsoleLog
} from './infrastructure/diagnostics/runtime-console.ts'

process.on('uncaughtException', (error) => {
  void appendRuntimeDiagnosticLog(
    'main',
    `uncaughtException ${error instanceof Error ? error.stack || error.message : String(error)}`
  )
  runtimeConsoleError('[main] uncaughtException', error)
})

process.on('unhandledRejection', (reason) => {
  void appendRuntimeDiagnosticLog(
    'main',
    `unhandledRejection ${reason instanceof Error ? reason.stack || reason.message : String(reason)}`
  )
  runtimeConsoleError('[main] unhandledRejection', reason)
})

loadRuntimeEnv()
const runtimeProviderConfig = loadRuntimeProviderConfig()
const storageRuntime = resolveStorageRuntime(process.env, app.getPath('appData'))
app.setPath('userData', storageRuntime.userDataPath)

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  void appendRuntimeDiagnosticLog(
    'main',
    `app ready mode=${storageRuntime.mode} userData=${app.getPath('userData')} log=${getRuntimeDiagnosticLogPath()}`
  )
  if (storageRuntime.ignoredOverride) {
    void appendRuntimeDiagnosticLog(
      'main',
      `ignored_e2e_user_data_dir_outside_e2e_mode path=${storageRuntime.ignoredOverride}`
    )
    runtimeConsoleWarn(
      '[main] ignored E2E_USER_DATA_DIR outside e2e mode',
      storageRuntime.ignoredOverride
    )
  }
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.xinjuben.app')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
    void appendRuntimeDiagnosticLog('main', 'browser-window-created')
    runtimeConsoleLog('[main] browser-window-created')
  })

  app.on('render-process-gone', (_, webContents, details) => {
    void appendRuntimeDiagnosticLog(
      'main',
      `render-process-gone reason=${details.reason} exitCode=${details.exitCode} url=${webContents.getURL()}`
    )
    runtimeConsoleError('[main] render-process-gone', {
      url: webContents.getURL(),
      reason: details.reason,
      exitCode: details.exitCode
    })
  })

  app.on('child-process-gone', (_, details) => {
    void appendRuntimeDiagnosticLog('main', `child-process-gone ${JSON.stringify(details)}`)
    runtimeConsoleError('[main] child-process-gone', details)
  })

  registerIpcHandlers({
    runtimeProviderConfig,
    getVersion: () => app.getVersion()
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
