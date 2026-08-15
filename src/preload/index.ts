import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

type DownloadRecord = {
  id: string
  filename: string
  filePath: string
  received: number
  total: number
  percent: number
  status: 'progress' | 'completed' | 'cancelled' | 'interrupted'
  startedAt: number
  finishedAt?: number
  error?: string
}

const api = {
  saveDownload: (
    url: string,
    filename: string,
  ): Promise<{ ok: boolean; canceled?: boolean; id?: string; filePath?: string }> =>
    ipcRenderer.invoke('download:url', url, filename),
  listDownloads: (): Promise<DownloadRecord[]> => ipcRenderer.invoke('download:list'),
  clearDownloads: (): Promise<DownloadRecord[]> => ipcRenderer.invoke('download:clear'),
  removeDownload: (id: string): Promise<DownloadRecord[]> =>
    ipcRenderer.invoke('download:remove', id),
  showDownload: (id: string): Promise<{ ok: boolean; missing?: boolean }> =>
    ipcRenderer.invoke('download:show', id),
  openDownload: (id: string): Promise<{ ok: boolean; missing?: boolean; error?: string }> =>
    ipcRenderer.invoke('download:open', id),
  onDownloadChanged: (cb: (rec: DownloadRecord) => void) => {
    const listener = (_e: unknown, rec: DownloadRecord) => cb(rec)
    ipcRenderer.on('download:changed', listener)
    return () => ipcRenderer.removeListener('download:changed', listener)
  },
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
