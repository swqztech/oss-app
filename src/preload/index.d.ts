import { ElectronAPI } from '@electron-toolkit/preload'

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

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      saveDownload: (
        url: string,
        filename: string,
      ) => Promise<{ ok: boolean; canceled?: boolean; id?: string; filePath?: string }>
      listDownloads: () => Promise<DownloadRecord[]>
      clearDownloads: () => Promise<DownloadRecord[]>
      removeDownload: (id: string) => Promise<DownloadRecord[]>
      showDownload: (id: string) => Promise<{ ok: boolean; missing?: boolean }>
      openDownload: (id: string) => Promise<{ ok: boolean; missing?: boolean; error?: string }>
      onDownloadChanged: (cb: (rec: DownloadRecord) => void) => () => void
    }
  }
}

export {}
