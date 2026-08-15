import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

export type DownloadStatus = 'progress' | 'completed' | 'cancelled' | 'interrupted'

export type DownloadRecord = {
  id: string
  filename: string
  filePath: string
  received: number
  total: number
  percent: number
  status: DownloadStatus
  startedAt: number
  finishedAt?: number
  error?: string
}

const MAX = 80

function historyPath() {
  return join(app.getPath('userData'), 'download-history.json')
}

export function readHistory(): DownloadRecord[] {
  try {
    const raw = readFileSync(historyPath(), 'utf8')
    const list = JSON.parse(raw) as DownloadRecord[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export function writeHistory(list: DownloadRecord[]) {
  const file = historyPath()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(list.slice(0, MAX), null, 2), 'utf8')
}

export function upsertRecord(rec: DownloadRecord): DownloadRecord[] {
  const list = readHistory().filter((x) => x.id !== rec.id)
  list.unshift(rec)
  writeHistory(list)
  return list
}

export function removeRecord(id: string): DownloadRecord[] {
  const list = readHistory().filter((x) => x.id !== id)
  writeHistory(list)
  return list
}

export function clearHistory(): DownloadRecord[] {
  writeHistory([])
  return []
}

export function fileExists(filePath: string) {
  try {
    return Boolean(filePath) && existsSync(filePath)
  } catch {
    return false
  }
}
