import { randomUUID } from 'crypto'
import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { dirname, join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { API_PORT, attachRendererStatic, startServer } from './server'
import {
  clearHistory,
  fileExists,
  readHistory,
  removeRecord,
  upsertRecord,
  type DownloadRecord,
  type DownloadStatus,
} from './downloadHistory'

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

  const emitDownload = (sender: Electron.WebContents, rec: DownloadRecord) => {
    upsertRecord(rec)
    if (!sender.isDestroyed()) sender.send('download:changed', rec)
  }

  ipcMain.handle('download:list', () => readHistory())
  ipcMain.handle('download:clear', () => clearHistory())
  ipcMain.handle('download:remove', (_e, id: string) => removeRecord(String(id || '')))
  ipcMain.handle('download:show', (_e, id: string) => {
    const rec = readHistory().find((x) => x.id === id)
    if (!rec?.filePath) return { ok: false }
    if (fileExists(rec.filePath)) {
      shell.showItemInFolder(rec.filePath)
      return { ok: true }
    }
    shell.openPath(dirname(rec.filePath))
    return { ok: true, missing: true }
  })
  ipcMain.handle('download:open', async (_e, id: string) => {
    const rec = readHistory().find((x) => x.id === id)
    if (!rec?.filePath) return { ok: false }
    if (!fileExists(rec.filePath)) return { ok: false, missing: true }
    const err = await shell.openPath(rec.filePath)
    return { ok: !err, error: err || undefined }
  })

  type PendingDownload = {
    id: string
    filename: string
    filePath: string
    startedAt: number
    sender: Electron.WebContents
  }
  const pendingDownloads: PendingDownload[] = []
  const hookedSessions = new WeakSet<Electron.Session>()

  const hookSession = (ses: Electron.Session) => {
    if (hookedSessions.has(ses)) return
    hookedSessions.add(ses)
    ses.on('will-download', (_e, item) => {
      const job = pendingDownloads.shift()
      if (!job) return
      item.setSavePath(job.filePath)
      const push = (status: DownloadStatus, extra?: Partial<DownloadRecord>) => {
        const received = item.getReceivedBytes()
        const total = item.getTotalBytes()
        const percent = total > 0 ? Math.min(100, Math.round((received / total) * 100)) : -1
        emitDownload(job.sender, {
          id: job.id,
          filename: job.filename,
          filePath: job.filePath,
          received,
          total,
          percent,
          status,
          startedAt: job.startedAt,
          finishedAt: status === 'progress' ? undefined : Date.now(),
          ...extra,
        })
      }
      push('progress')
      item.on('updated', (_ev, state) => {
        if (state === 'interrupted') push('interrupted', { error: '下载中断' })
        else push('progress')
      })
      item.on('done', (_ev, state) => {
        if (state === 'completed') push('completed')
        else if (state === 'cancelled') push('cancelled', { error: '已取消' })
        else push('interrupted', { error: '下载失败' })
      })
    })
  }

  ipcMain.handle(
    'download:url',
    async (event, url: string, filename: string) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { ok: false }
      const { filePath, canceled } = await dialog.showSaveDialog(win, {
        defaultPath: filename || 'download',
        title: '保存文件',
      })
      if (canceled || !filePath) return { ok: false, canceled: true }

      const id = randomUUID()
      const startedAt = Date.now()
      const rec: DownloadRecord = {
        id,
        filename: filename || 'download',
        filePath,
        received: 0,
        total: 0,
        percent: 0,
        status: 'progress',
        startedAt,
      }
      emitDownload(event.sender, rec)
      hookSession(win.webContents.session)
      pendingDownloads.push({
        id,
        filename: rec.filename,
        filePath,
        startedAt,
        sender: event.sender,
      })
      win.webContents.downloadURL(String(url || ''))
      return { ok: true, id, filePath }
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
