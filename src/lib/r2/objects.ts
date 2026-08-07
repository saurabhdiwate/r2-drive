import {
  ListObjectsV2Command,
  HeadObjectCommand,
  type _Object
} from '@aws-sdk/client-s3'
import { getR2Client } from '@/lib/r2/client'
import type { ListObjectsResult, R2ObjectSummary, SearchResult } from '@/lib/types'
import { basename, classifyFile } from '@/lib/utils'

export interface ListObjectsOptions {
  prefix: string
  continuationToken?: string
  startAfter?: string
  maxKeys?: number
}

function mapObject(
  obj: _Object,
  prefix: string,
  isFolder: boolean
): R2ObjectSummary {
  const key = obj.Key ?? ''
  return {
    key,
    name: isFolder ? basename(key) : basename(key),
    size: obj.Size ?? 0,
    lastModified: obj.LastModified?.toISOString() ?? '',
    etag: obj.ETag,
    storageClass: obj.StorageClass,
    isFolder,
    type: isFolder ? 'other' : classifyFile(key)
  }
}

/**
 * List a "folder" in a bucket using the R2/S3 prefix + delimiter convention.
 * Returns visible files and sub-folders for the given prefix.
 */
export async function listObjects(
  bucket: string,
  options: ListObjectsOptions
): Promise<ListObjectsResult> {
  const client = getR2Client()
  const { prefix, continuationToken, startAfter, maxKeys = 2000 } = options

  const response = await client.send(
    new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      Delimiter: '/',
      ContinuationToken: continuationToken,
      StartAfter: startAfter,
      MaxKeys: maxKeys
    })
  )

  const commonPrefixes = new Set((response.CommonPrefixes ?? []).map((p) => p.Prefix ?? ''))

  const items: R2ObjectSummary[] = []
  for (const folderPrefix of commonPrefixes) {
    items.push(
      mapObject(
        { Key: folderPrefix, Size: 0 } as _Object,
        prefix,
        true
      )
    )
  }

  for (const obj of response.Contents ?? []) {
    const key = obj.Key ?? ''
    if (key === prefix) continue
    if (key.endsWith('/')) {
      if (commonPrefixes.has(key)) continue
      items.push(mapObject(obj, prefix, true))
      continue
    }
    items.push(mapObject(obj, prefix, false))
  }

  return {
    items,
    continuationToken: response.NextContinuationToken,
    truncated: response.IsTruncated === true
  }
}

/**
 * Return every object under a prefix (flattened, files only). Used by
 * folder-wide operations (move/copy/delete). Optionally stops after maxKeys.
 */
export async function listAllObjects(
  bucket: string,
  prefix: string,
  maxKeys?: number
): Promise<{ items: R2ObjectSummary[]; truncated: boolean }> {
  const client = getR2Client()
  const items: R2ObjectSummary[] = []
  let continuationToken: string | undefined
  let truncated = true

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      })
    )
    for (const obj of response.Contents ?? []) {
      const key = obj.Key ?? ''
      if (key.endsWith('/')) continue
      items.push(mapObject(obj, prefix, false))
    }
    truncated = response.IsTruncated === true
    continuationToken = response.NextContinuationToken
    if (maxKeys && items.length >= maxKeys) {
      truncated = true
      break
    }
  } while (truncated && continuationToken)

  return { items, truncated }
}

/**
 * Case-insensitive substring search across an entire bucket's object keys.
 * Efficient enough for personal buckets; stops scanning after maxScanned.
 */
export async function searchObjects(
  bucket: string,
  query: string,
  options: { limit?: number; maxScanned?: number } = {}
): Promise<SearchResult> {
  const client = getR2Client()
  const q = query.toLowerCase()
  const limit = options.limit ?? 200
  const maxScanned = options.maxScanned ?? 20_000

  const items: R2ObjectSummary[] = []
  let scanned = 0
  let continuationToken: string | undefined
  let truncated = false

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: continuationToken,
        MaxKeys: 1000
      })
    )
    for (const obj of response.Contents ?? []) {
      const key = obj.Key ?? ''
      if (key.endsWith('/')) continue
      scanned += 1
      if (key.toLowerCase().includes(q)) {
        items.push(mapObject(obj, '', false))
        if (items.length >= limit) {
          return { items, scanned, truncated: true }
        }
      }
      if (scanned >= maxScanned) {
        return { items, scanned, truncated: true }
      }
    }
    truncated = response.IsTruncated === true
    continuationToken = response.NextContinuationToken
  } while (truncated && continuationToken)

  return { items, scanned, truncated: false }
}

export async function headObject(
  bucket: string,
  key: string
): Promise<{
  key: string
  size: number
  lastModified: string
  etag?: string
  contentType?: string
  storageClass?: string
  metadata?: Record<string, string>
}> {
  const client = getR2Client()
  const response = await client.send(
    new HeadObjectCommand({ Bucket: bucket, Key: key })
  )
  return {
    key,
    size: response.ContentLength ?? 0,
    lastModified: response.LastModified?.toISOString() ?? '',
    etag: response.ETag,
    contentType: response.ContentType,
    storageClass: response.StorageClass,
    metadata: response.Metadata
  }
}
