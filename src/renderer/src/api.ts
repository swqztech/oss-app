export type CredsPayload = {
  accessKeyId: string
  accessKeySecret: string
  region: string
  endpoint?: string
}

export type BucketInfo = {
  name: string
  region: string
  creationDate: string | null
  storageClass: string | null
}

export type FolderItem = {
  type: 'folder'
  name: string
  key: string
}

export type FileItem = {
  type: 'file'
  name: string
  key: string
  size: number
  lastModified: string | null
  etag: string | null
  storageClass: string | null
}

export type ObjectItem = FolderItem | FileItem

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = (await res.json()) as T & { ok?: boolean; error?: string }
  if (!res.ok || (data && 'ok' in data && data.ok === false)) {
    throw new Error(
      (data && 'error' in data && data.error) || `请求失败 (${res.status})`,
    )
  }
  return data
}

export async function connect(creds: CredsPayload) {
  return post<{ ok: true; buckets: BucketInfo[] }>('/api/connect', creds)
}

export type SearchHit = FileItem & {
  /** 相对搜索起点的路径 */
  path: string
}

export async function listObjects(
  creds: CredsPayload,
  opts: {
    bucket: string
    bucketRegion?: string
    prefix?: string
    marker?: string
    continuationToken?: string
    maxKeys?: number
  },
) {
  return post<{
    ok: true
    prefix: string
    nextMarker: string | null
    nextContinuationToken: string | null
    isTruncated: boolean
    items: ObjectItem[]
  }>('/api/objects', { ...creds, ...opts })
}

export async function searchObjects(
  creds: CredsPayload,
  opts: {
    bucket: string
    bucketRegion?: string
    query: string
    prefix?: string
    scope?: 'current' | 'bucket'
    marker?: string
    maxMatches?: number
  },
) {
  return post<{
    ok: true
    query: string
    scope: 'current' | 'bucket'
    prefix: string
    items: SearchHit[]
    nextMarker: string | null
    isTruncated: boolean
    meta: {
      scanned: number
      pages: number
      hitLimit: boolean
      scanLimit: boolean
    }
  }>('/api/search', { ...creds, ...opts })
}

export async function signUrl(
  creds: CredsPayload,
  opts: {
    bucket: string
    bucketRegion?: string
    key: string
    expires?: number
    /** OSS 图片处理，如 image/resize,w_480/format,jpg */
    process?: string
  },
) {
  return post<{ ok: true; url: string }>('/api/sign', { ...creds, ...opts })
}

export async function deleteObject(
  creds: CredsPayload,
  opts: {
    bucket: string
    bucketRegion?: string
    key: string
    type: 'file' | 'folder'
  },
) {
  return post<{
    ok: true
    deleted: number
    key: string
    type: 'file' | 'folder'
  }>('/api/delete', { ...creds, ...opts })
}

export async function deleteObjectsBatch(
  creds: CredsPayload,
  opts: {
    bucket: string
    bucketRegion?: string
    items: { key: string; type: 'file' | 'folder' }[]
  },
) {
  return post<{
    ok: true
    deleted: number
    requested: number
    failed: number
    errors: { key: string; error: string }[]
  }>('/api/delete-batch', { ...creds, ...opts })
}
