import { BrowserWindow, screen, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'
import icon from '../../../../resources/icon.png?asset'

export function createWindow(): BrowserWindow {
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
  const workArea = display.workArea
  const width = Math.min(1600, Math.max(1280, Math.floor(workArea.width * 0.92)))
  const height = Math.min(980, Math.max(820, Math.floor(workArea.height * 0.9)))
  const initialWidth = Math.min(width, workArea.width)
  const initialHeight = Math.min(height, workArea.height)
  const shouldMaximize = workArea.width < 1360 || workArea.height < 860

  const mainWindow = new BrowserWindow({
    width: initialWidth,
    height: initialHeight,
    minWidth: Math.min(1180, workArea.width),
    minHeight: Math.min(760, workArea.height),
    x: workArea.x + Math.max(0, Math.floor((workArea.width - initialWidth) / 2)),
    y: workArea.y + Math.max(0, Math.floor((workArea.height - initialHeight) / 2)),
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    if (shouldMaximize) {
      mainWindow.maximize()
    }
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}
