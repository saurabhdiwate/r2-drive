import { listBuckets } from '@/lib/r2/buckets'
import { listAllObjects } from '@/lib/r2/objects'
import type {
  BucketStorage,
  R2ObjectSummary,
  StorageSummary
} from '@/lib/types'

const DEFAULT_MAX_SCAN = 25_000

export interface StorageOptions {
  bucket?: string
  maxScanned?: number
}

interface Accumulator {
  buckets: BucketStorage[]
  totalObjects: number
  totalBytes: number
  byType: Record<string, { count: number; bytes: number }>
  largestFiles: R2ObjectSummary[]
  recentModified: R2ObjectSummary[]
  scannedObjects: number
  estimated: boolean
  maxScanned: number
}

function keepTopBySize(list: R2ObjectSummary[], item: R2ObjectSummary, limit: number) {
  list.push(item)
  list.sort((a, b) => b.size - a.size)
  if (list.length > limit) list.length = limit
}

function keepRecent(list: R2ObjectSummary[], item: R2ObjectSummary, limit: number) {
  list.push(item)
  list.sort((a, b) =>
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  )
  if (list.length > limit) list.length = limit
}

async function scanBucket(
  name: string,
  acc: Accumulator,
  maxPerBucket: number
): Promise<void> {
  const bucketStats: BucketStorage = { name, objectCount: 0, bytes: 0, truncated: false }
  const { items, truncated } = await listAllObjects(name, '', maxPerBucket)
  bucketStats.truncated = truncated
  acc.buckets.push(bucketStats)
  acc.estimated = acc.estimated || truncated

  for (const item of items) {
    bucketStats.objectCount += 1
    bucketStats.bytes += item.size
    acc.totalObjects += 1
    acc.totalBytes += item.size
    acc.scannedObjects += 1

    const typeBucket = (acc.byType[item.type] ??= { count: 0, bytes: 0 })
    typeBucket.count += 1
    typeBucket.bytes += item.size

    keepTopBySize(acc.largestFiles, item, 25)
    keepRecent(acc.recentModified, item, 25)
  }
}

export async function getStorageSummary(
  options: StorageOptions = {}
): Promise<StorageSummary> {
  const maxScanned = options.maxScanned ?? DEFAULT_MAX_SCAN
  const acc: Accumulator = {
    buckets: [],
    totalObjects: 0,
    totalBytes: 0,
    byType: {},
    largestFiles: [],
    recentModified: [],
    scannedObjects: 0,
    estimated: false,
    maxScanned
  }

  let bucketNames: string[] = []
  if (options.bucket) {
    bucketNames = [options.bucket]
  } else {
    const buckets = await listBuckets()
    bucketNames = buckets.map((b) => b.name)
  }

  for (const name of bucketNames) {
    if (acc.scannedObjects >= maxScanned) {
      acc.estimated = true
      break
    }
    const remaining = maxScanned - acc.scannedObjects
    try {
      await scanBucket(name, acc, remaining)
    } catch {
      // A bucket that fails to list is reported with a truncated flag.
      acc.estimated = true
    }
  }

  return {
    buckets: acc.buckets,
    totalObjects: acc.totalObjects,
    totalBytes: acc.totalBytes,
    byType: acc.byType,
    largestFiles: acc.largestFiles,
    recentModified: acc.recentModified,
    estimated: acc.estimated,
    scannedObjects: acc.scannedObjects,
    maxScanned
  }
}

export async function getRecentFiles(
  options: StorageOptions = {},
  limit = 50
): Promise<{ items: R2ObjectSummary[]; estimated: boolean }> {
  const maxScanned = options.maxScanned ?? DEFAULT_MAX_SCAN
  const recent: R2ObjectSummary[] = []
  let scanned = 0
  let estimated = false

  let bucketNames: string[] = []
  if (options.bucket) {
    bucketNames = [options.bucket]
  } else {
    const buckets = await listBuckets()
    bucketNames = buckets.map((b) => b.name)
  }

  for (const name of bucketNames) {
    if (scanned >= maxScanned) {
      estimated = true
      break
    }
    const { items, truncated } = await listAllObjects(
      name,
      '',
      maxScanned - scanned
    )
    estimated = estimated || truncated
    scanned += items.length
    for (const item of items) keepRecent(recent, item, limit)
  }

  return { items: recent, estimated }
}
