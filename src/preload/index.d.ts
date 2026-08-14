import { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      saveDownload: (url: string, filename: string) => Promise<{ ok: boolean }>
    }
  }
}

export {}
