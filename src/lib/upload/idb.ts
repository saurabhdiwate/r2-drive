import type { UploadPartState, UploadStatus } from '@/lib/types'

export interface StoredUpload {
  id: string
  bucket: string
  key: string
  name: string
  size: number
  status: UploadStatus
  multipart: boolean
  uploadId?: string
  partSize?: number
  parts?: UploadPartState[]
  lastModified: number
  file: Blob
}

const DB_NAME = 'r2fm-uploads'
const DB_VERSION = 1
const STORE = 'items'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB open failed'))
  })
}

export async function idbPut(record: StoredUpload): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).put(record)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed'))
  })
}

export async function idbGetAll(): Promise<StoredUpload[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly')
    const request = tx.objectStore(STORE).getAll()
    request.onsuccess = () => resolve(request.result as StoredUpload[])
    request.onerror = () => reject(request.error ?? new Error('IndexedDB read failed'))
  })
}

export async function idbDelete(id: string): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    tx.objectStore(STORE).delete(id)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed'))
  })
}
