import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { API_PORT, attachRendererStatic, startServer } from './server'

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 960,
    minHeight: 640,
    show: false,
    autoHideMenuBar: true,
    title: 'OSS Desk',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
    },
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadURL(`http://127.0.0.1:${API_PORT}`)
  }
}

app.whenReady().then(async () => {
  electronApp.setAppUserModelId('com.codes.oss-desk')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.handle(
    'download:url',
    async (event, url: string, filename: string) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { ok: false }
      const { filePath, canceled } = await dialog.showSaveDialog(win, {
        defaultPath: filename || 'download',
        title: '保存文件',
      })
      if (canceled || !filePath) return { ok: false }
      const ses = win.webContents.session
      const once = (fn: (item: Electron.DownloadItem) => void) => {
        const handler = (_e: Electron.Event, item: Electron.DownloadItem) => {
          ses.off('will-download', handler)
          fn(item)
        }
        ses.on('will-download', handler)
      }
      once((item) => {
        item.setSavePath(filePath)
      })
      win.webContents.downloadURL(String(url || ''))
      return { ok: true }
    },
  )

  if (!is.dev) {
    attachRendererStatic(join(__dirname, '../renderer'))
  }

  await startServer()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
