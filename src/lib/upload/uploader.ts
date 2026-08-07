import { apiFetch, ApiClientError } from '@/lib/api'
import type {
  UploadPartState,
  UploadQueueItem,
  UploadStatus
} from '@/lib/types'
import { formatErrorMessage, joinKey, uid } from '@/lib/utils'
import { idbDelete, idbGetAll, idbPut, type StoredUpload } from '@/lib/upload/idb'

export const PART_SIZE = 8 * 1024 * 1024
export const SIMPLE_UPLOAD_THRESHOLD = 8 * 1024 * 1024
const MAX_CONCURRENT_ITEMS = 2
const PARTS_CONCURRENCY = 3
const SAVE_THROTTLE_MS = 500

export interface UploadInput {
  file: Blob
  name: string
  bucket: string
  targetPrefix: string
}

export interface DroppedFile {
  file: File
  /** relative path within a dropped folder, or just the file name */
  relativePath: string
}

/** Collect files from a drag/drop or input, flattening folders where possible. */
export async function collectDroppedFiles(
  dataTransfer: DataTransfer
): Promise<DroppedFile[]> {
  const items = Array.from(dataTransfer.items ?? [])
  const entries = items
    .map((item) => item.webkitGetAsEntry?.())
    .filter((entry): entry is FileSystemEntry => Boolean(entry))

  if (entries.length > 0 && entries.every((e) => e.isDirectory)) {
    const files: DroppedFile[] = []
    await Promise.all(
      entries.map((entry) => walkEntry(entry, '', files))
    )
    return files
  }

  return Array.from(dataTransfer.files ?? []).map((file) => ({
    file,
    relativePath: file.webkitRelativePath || file.name
  }))
}

async function walkEntry(
  entry: FileSystemEntry,
  path: string,
  out: DroppedFile[]
): Promise<void> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry
    const file = await new Promise<File>((resolve, reject) =>
      fileEntry.file(resolve, reject)
    )
    out.push({ file, relativePath: path ? `${path}/${file.name}` : file.name })
  } else if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry
    const reader = dirEntry.createReader()
    const readBatch = (): Promise<FileSystemEntry[]> =>
      new Promise((resolve, reject) => reader.readEntries(resolve, reject))

    let batch = await readBatch()
    while (batch.length > 0) {
      await Promise.all(
        batch.map((child) => walkEntry(child, `${path}/${entry.name}`, out))
      )
      batch = await readBatch()
    }
  }
}

interface AbortState {
  controller: AbortController
  signal: AbortSignal
}

type Listener = () => void

/**
 * Client-side upload engine.
 *
 * - Small files use single-shot presigned PUT uploads.
 * - Large files use R2 multipart uploads with concurrent parts.
 * - Progress, speed and resumable state are persisted to IndexedDB so an
 *   interrupted upload can be resumed after a browser reload.
 */
class UploadManager {
  private itemsById = new Map<string, UploadQueueItem>()
  private filesById = new Map<string, Blob>()
  private aborts = new Map<string, AbortController>()
  private active = new Set<string>()
  private listeners = new Set<Listener>()
  private initialized = false
  private lastSavedAt = new Map<string, number>()
  private speedState = new Map<string, { lastBytes: number; lastTime: number }>()

  getItems(): UploadQueueItem[] {
    return Array.from(this.itemsById.values()).sort(
      (a, b) => b.lastModified - a.lastModified
    )
  }

  getItem(id: string): UploadQueueItem | undefined {
    return this.itemsById.get(id)
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  isActive(): boolean {
    return this.active.size > 0
  }

  async init(): Promise<void> {
    if (this.initialized) return
    this.initialized = true
    try {
      const stored = await idbGetAll()
      for (const record of stored) {
        if (this.isTerminal(record.status)) continue
        this.itemsById.set(record.id, this.toItem(record))
        this.filesById.set(record.id, record.file)
      }
      // Auto-resume interrupted uploads.
      for (const item of this.getItems()) {
        this.schedule()
      }
      this.emit()
    } catch {
      // IndexedDB may be unavailable; uploads still work for the session.
    }
  }

  private isTerminal(status: UploadStatus): boolean {
    return status === 'completed' || status === 'cancelled'
  }

  private toItem(record: StoredUpload): UploadQueueItem {
    return {
      id: record.id,
      bucket: record.bucket,
      key: record.key,
      name: record.name,
      size: record.size,
      status: record.status === 'uploading' ? 'queued' : record.status,
      progress: this.computeProgress(record),
      uploadedBytes: 0,
      speedBps: 0,
      multipart: record.multipart,
      uploadId: record.uploadId,
      partSize: record.partSize,
      parts: record.parts,
      lastModified: record.lastModified
    }
  }

  private computeProgress(record: {
    size: number
    parts?: UploadPartState[]
    multipart: boolean
  }): number {
    if (record.size === 0) return 0
    if (record.multipart && record.parts) {
      const uploaded = record.parts
        .filter((p) => p.uploaded)
        .reduce((sum, p) => sum + p.size, 0)
      return Math.min(100, Math.round((uploaded / record.size) * 100))
    }
    return 0
  }

  addFiles(inputs: UploadInput[]): string[] {
    const ids: string[] = []
    for (const input of inputs) {
      const id = uid()
      const multipart = input.file.size >= SIMPLE_UPLOAD_THRESHOLD
      const item: UploadQueueItem = {
        id,
        bucket: input.bucket,
        key: joinKey(input.targetPrefix, input.name),
        name: input.name,
        size: input.file.size,
        status: 'queued',
        progress: 0,
        uploadedBytes: 0,
        speedBps: 0,
        multipart,
        lastModified: Date.now()
      }
      this.itemsById.set(id, item)
      this.filesById.set(id, input.file)
      ids.push(id)
      void this.persist(id)
    }
    this.emit()
    this.schedule()
    return ids
  }

  pause(id: string): void {
    const item = this.itemsById.get(id)
    if (!item) return
    this.aborts.get(id)?.abort()
    if (item.status === 'uploading' || item.status === 'queued') {
      item.status = 'paused'
    }
    this.emit()
    void this.persist(id)
  }

  resume(id: string): void {
    const item = this.itemsById.get(id)
    if (!item) return
    if (item.status === 'paused' || item.status === 'failed') {
      item.status = 'queued'
      item.error = undefined
    }
    this.emit()
    this.schedule()
  }

  retry(id: string): void {
    const item = this.itemsById.get(id)
    if (!item) return
    item.status = 'queued'
    item.error = undefined
    this.emit()
    this.schedule()
  }

  cancel(id: string): void {
    const item = this.itemsById.get(id)
    if (!item) return
    const controller = this.aborts.get(id)
    this.aborts.get(id)?.abort()

    item.status = 'cancelled'
    item.speedBps = 0
    this.active.delete(id)

    // Best-effort server-side cleanup of the multipart upload.
    if (item.multipart && item.uploadId) {
      void apiFetch('/api/multipart/abort', {
        method: 'POST',
        body: {
          bucket: item.bucket,
          key: item.key,
          uploadId: item.uploadId
        }
      }).catch(() => undefined)
    }
    this.filesById.delete(id)
    void idbDelete(id)
    this.aborts.delete(id)
    void controller
    this.emit()
    this.schedule()
  }

  clearCompleted(): void {
    for (const [id, item] of this.itemsById) {
      if (item.status === 'completed' || item.status === 'cancelled') {
        this.itemsById.delete(id)
        this.filesById.delete(id)
        void idbDelete(id)
      }
    }
    this.emit()
  }

  private schedule(): void {
    const queued = this.getItems().filter(
      (item) =>
        item.status === 'queued' &&
        !this.active.has(item.id) &&
        this.filesById.has(item.id)
    )
    const slots = MAX_CONCURRENT_ITEMS - this.active.size
    for (const item of queued.slice(0, Math.max(0, slots))) {
      void this.run(item)
    }
  }

  private async run(item: UploadQueueItem): Promise<void> {
    if (this.active.has(item.id)) return
    this.active.add(item.id)
    const controller = new AbortController()
    this.aborts.set(item.id, controller)

    item.status = 'uploading'
    this.emit()

    try {
      if (item.multipart) {
        await this.runMultipart(item, controller.signal)
      } else {
        await this.runSimple(item, controller.signal)
      }
      item.status = 'completed'
      item.progress = 100
      item.uploadedBytes = item.size
      item.speedBps = 0
      this.filesById.delete(item.id)
      void this.persist(item)
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        // Aborted by pause/cancel; do not mark failed.
        const status = item.status as UploadStatus
        if (status !== 'cancelled' && status !== 'paused') {
          item.status = 'paused'
        }
      } else {
        item.status = 'failed'
        item.error = formatErrorMessage(error, 'Upload failed')
      }
    } finally {
      this.active.delete(item.id)
      this.aborts.delete(item.id)
      this.emit()
      this.schedule()
    }
  }

  private async runSimple(
    item: UploadQueueItem,
    signal: AbortSignal
  ): Promise<void> {
    const blob = this.filesById.get(item.id)
    if (!blob) throw new Error('File data is no longer available')

    const { url } = await apiFetch<{ url: string }>('/api/upload/presign', {
      method: 'POST',
      body: {
        bucket: item.bucket,
        key: item.key,
        contentType: blob.type || 'application/octet-stream'
      },
      signal
    })

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', url)
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          this.updateSimpleProgress(item, event.loaded)
        }
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve()
        else reject(new Error(`Upload failed (${xhr.status})`))
      }
      xhr.onerror = () => reject(new Error('Upload failed due to a network error'))
      const onAbort = () => {
        xhr.abort()
        reject(new DOMException('Aborted', 'AbortError'))
      }
      signal.addEventListener('abort', onAbort, { once: true })
      xhr.send(blob)
    })
  }

  private async runMultipart(
    item: UploadQueueItem,
    signal: AbortSignal
  ): Promise<void> {
    const blob = this.filesById.get(item.id)
    if (!blob) throw new Error('File data is no longer available')

    if (!item.uploadId) {
      const { uploadId } = await apiFetch<{ uploadId: string }>(
        '/api/multipart/create',
        { method: 'POST', body: { bucket: item.bucket, key: item.key }, signal }
      )
      item.uploadId = uploadId
      item.partSize = PART_SIZE
      item.totalParts = Math.max(1, Math.ceil(item.size / PART_SIZE))
      item.parts = Array.from({ length: item.totalParts }, (_, i) => ({
        partNumber: i + 1,
        size: Math.min(PART_SIZE, item.size - i * PART_SIZE),
        uploaded: false
      }))
      void this.persist(item)
    }

    const parts = item.parts ?? []

    while (parts.some((p) => !p.uploaded)) {
      const pending = parts.filter((p) => !p.uploaded)
      const batch = pending.slice(0, PARTS_CONCURRENCY)
      await Promise.all(
        batch.map((part) => this.uploadPart(item, part, signal))
      )
    }

    await apiFetch('/api/multipart/complete', {
      method: 'POST',
      body: {
        bucket: item.bucket,
        key: item.key,
        uploadId: item.uploadId,
        parts: parts.map((p) => ({ PartNumber: p.partNumber, ETag: p.etag }))
      },
      signal
    })
  }

  private uploadPart(
    item: UploadQueueItem,
    part: UploadPartState,
    signal: AbortSignal
  ): Promise<void> {
    const blob = this.filesById.get(item.id)
    if (!blob) throw new Error('File data is no longer available')

    const partSize = item.partSize ?? PART_SIZE
    const start = (part.partNumber - 1) * partSize
    const slice = blob.slice(start, start + part.size)

    return new Promise<void>((resolve, reject) => {
      void (async () => {
        try {
          const { url } = await apiFetch<{ url: string }>(
            '/api/multipart/part-url',
            {
              method: 'POST',
              body: {
                bucket: item.bucket,
                key: item.key,
                uploadId: item.uploadId,
                partNumber: part.partNumber,
                partSize: part.size
              },
              signal
            }
          )
          const xhr = new XMLHttpRequest()
          xhr.open('PUT', url)
          xhr.responseType = 'text'
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              this.updatePartProgress(item, part, event.loaded)
            }
          }
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const etag = xhr.getResponseHeader('ETag')
              if (!etag) {
                reject(new Error(`Part ${part.partNumber} returned no ETag`))
                return
              }
              part.etag = etag.replace(/^"|"$/g, '')
              part.uploaded = true
              this.updateCommitted(item)
              resolve()
            } else {
              reject(new Error(`Part ${part.partNumber} failed (${xhr.status})`))
            }
          }
          xhr.onerror = () =>
            reject(new Error(`Part ${part.partNumber} failed (network)`))
          const onAbort = () => {
            xhr.abort()
            reject(new DOMException('Aborted', 'AbortError'))
          }
          signal.addEventListener('abort', onAbort, { once: true })
          xhr.send(slice)
        } catch (error) {
          reject(error)
        }
      })()
    })
  }

  private committedBytes(item: UploadQueueItem): number {
    return (
      item.parts
        ?.filter((p) => p.uploaded)
        .reduce((sum, p) => sum + p.size, 0) ?? 0
    )
  }

  private updateCommitted(item: UploadQueueItem): void {
    const committed = this.committedBytes(item)
    item.uploadedBytes = committed
    item.progress =
      item.size === 0 ? 0 : Math.min(100, Math.round((committed / item.size) * 100))
    this.emit()
    void this.persist(item)
  }

  private updateSimpleProgress(item: UploadQueueItem, loaded: number): void {
    item.uploadedBytes = loaded
    item.progress =
      item.size === 0 ? 0 : Math.min(100, Math.round((loaded / item.size) * 100))
    this.updateSpeed(item, loaded)
    this.emit()
    void this.persist(item)
  }

  private updatePartProgress(
    item: UploadQueueItem,
    part: UploadPartState,
    partLoaded: number
  ): void {
    const committed = this.committedBytes(item)
    const uploaded = committed + partLoaded
    item.uploadedBytes = uploaded
    item.progress =
      item.size === 0 ? 0 : Math.min(100, Math.round((uploaded / item.size) * 100))
    this.updateSpeed(item, uploaded)
    this.emit()
    void this.persist(item)
  }

  private updateSpeed(item: UploadQueueItem, uploadedBytes: number): void {
    const now = Date.now()
    const state = this.speedState.get(item.id)
    if (state) {
      const elapsed = now - state.lastTime
      if (elapsed > 0) {
        const instantaneous = ((uploadedBytes - state.lastBytes) * 1000) / elapsed
        item.speedBps = item.speedBps
          ? item.speedBps * 0.7 + instantaneous * 0.3
          : instantaneous
      }
    }
    this.speedState.set(item.id, { lastBytes: uploadedBytes, lastTime: now })
  }

  private persist(target: UploadQueueItem | string): void {
    const item =
      typeof target === 'string' ? this.itemsById.get(target) : target
    if (!item) return
    const now = Date.now()
    const lastSaved = this.lastSavedAt.get(item.id) ?? 0
    if (now - lastSaved < SAVE_THROTTLE_MS) return
    this.lastSavedAt.set(item.id, now)

    const blob = this.filesById.get(item.id)
    if (!blob) return
    const record: StoredUpload = {
      id: item.id,
      bucket: item.bucket,
      key: item.key,
      name: item.name,
      size: item.size,
      status: item.status,
      multipart: item.multipart,
      uploadId: item.uploadId,
      partSize: item.partSize,
      parts: item.parts,
      lastModified: item.lastModified,
      file: blob
    }
    void idbPut(record).catch(() => undefined)
  }

  private emit(): void {
    for (const listener of this.listeners) listener()
  }
}

/** Singleton upload engine shared across the app. */
export const uploadManager = new UploadManager()
