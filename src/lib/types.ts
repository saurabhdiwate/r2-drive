export interface AuthUser {
  username: string
}

export interface SessionPayload {
  /** username (subject) */
  sub: string
  /** issued at (epoch ms) */
  iat: number
  /** expiry (epoch ms) */
  exp: number
}

export interface ApiResponse<T = unknown> {
  ok: boolean
  data?: T
  error?: string
}

export interface R2BucketInfo {
  name: string
  creationDate?: string
  location?: string
}

export interface R2ObjectSummary {
  /** full object key in the bucket */
  key: string
  /** display name (basename) */
  name: string
  size: number
  lastModified: string
  etag?: string
  storageClass?: string
  contentType?: string
  isFolder: boolean
  /** categorized file type: image|video|audio|document|archive|code|text|other */
  type: string
}

export interface ListObjectsResult {
  /** visible items in the current folder (files + sub-folders) */
  items: R2ObjectSummary[]
  continuationToken?: string
  truncated: boolean
}

export interface ConnectionStatus {
  configured: boolean
  valid: boolean
  error?: string
  bucketCount: number
  lastTested?: string
  endpoint: string
  missing: string[]
}

export interface UploadPartState {
  partNumber: number
  /** number of bytes in this part */
  size: number
  uploaded: boolean
  etag?: string
}

export type UploadStatus =
  | 'queued'
  | 'uploading'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface UploadQueueItem {
  id: string
  bucket: string
  key: string
  name: string
  size: number
  status: UploadStatus
  /** 0-100 */
  progress: number
  uploadedBytes: number
  /** bytes per second (smoothed) */
  speedBps: number
  error?: string
  multipart: boolean
  uploadId?: string
  partSize?: number
  totalParts?: number
  parts?: UploadPartState[]
  /** epoch ms */
  lastModified: number
}

export interface BucketStorage {
  name: string
  objectCount: number
  bytes: number
  truncated: boolean
}

export interface StorageSummary {
  buckets: BucketStorage[]
  totalObjects: number
  totalBytes: number
  byType: Record<string, { count: number; bytes: number }>
  largestFiles: R2ObjectSummary[]
  recentModified: R2ObjectSummary[]
  estimated: boolean
  scannedObjects: number
  maxScanned: number
}

export type FileCategory =
  | 'image'
  | 'video'
  | 'audio'
  | 'document'
  | 'archive'
  | 'code'
  | 'text'
  | 'other'

export type SortField = 'name' | 'size' | 'type' | 'lastModified'
export type SortDir = 'asc' | 'desc'

export interface SortState {
  field: SortField
  dir: SortDir
}

export interface SearchResult {
  items: R2ObjectSummary[]
  scanned: number
  truncated: boolean
}
