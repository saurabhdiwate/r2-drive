import {
  PutObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand
} from '@aws-sdk/client-s3'
import { getR2Client } from '@/lib/r2/client'
import { listAllObjects } from '@/lib/r2/objects'

export interface OperationResult {
  success: number
  failed: number
  errors: string[]
  truncated?: boolean
}

export type ProgressCallback = (progress: { done: number; total: number }) => void

function validateKey(bucket: string, key: string): void {
  if (!bucket || !key) {
    throw new Error('Bucket and object key are required')
  }
  if (key.startsWith('/') || key.includes('\\')) {
    throw new Error('Invalid object key')
  }
}

/** Create a "folder" by storing a zero-byte marker object with a trailing slash. */
export async function createFolder(bucket: string, key: string): Promise<void> {
  validateKey(bucket, key)
  const client = getR2Client()
  const folderKey = key.endsWith('/') ? key : `${key}/`
  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: folderKey,
      Body: new Uint8Array(0),
      ContentType: 'application/x-www-form-urlencoded'
    })
  )
}

export async function copyObject(
  bucket: string,
  sourceKey: string,
  destinationKey: string
): Promise<void> {
  validateKey(bucket, sourceKey)
  validateKey(bucket, destinationKey)
  const client = getR2Client()
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `/${bucket}/${encodeURIComponent(sourceKey)}`,
      Key: destinationKey
    })
  )
}

async function deleteObjectKeys(bucket: string, keys: string[]): Promise<OperationResult> {
  const result: OperationResult = { success: 0, failed: 0, errors: [] }
  const client = getR2Client()

  // DeleteObjects accepts at most 1000 keys per request.
  const chunks: string[][] = []
  for (let i = 0; i < keys.length; i += 1000) {
    chunks.push(keys.slice(i, i + 1000))
  }

  for (const chunk of chunks) {
    try {
      const response = await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: chunk.map((k) => ({ Key: k })), Quiet: true }
        })
      )
      result.success += chunk.length - (response.Errors?.length ?? 0)
      for (const err of response.Errors ?? []) {
        result.failed += 1
        result.errors.push(`${err.Key}: ${err.Message ?? 'failed to delete'}`)
      }
    } catch (error) {
      result.failed += chunk.length
      result.errors.push((error as Error).message)
    }
  }
  return result
}

export async function deleteFile(bucket: string, key: string): Promise<void> {
  validateKey(bucket, key)
  const client = getR2Client()
  await client.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: key })
  )
}

/**
 * Delete a single file or all objects under a folder prefix.
 * Returns a summary of success/failure per object.
 */
export async function deletePath(
  bucket: string,
  key: string,
  onProgress?: ProgressCallback
): Promise<OperationResult> {
  validateKey(bucket, key)

  if (!key.endsWith('/')) {
    await deleteFile(bucket, key)
    return { success: 1, failed: 0, errors: [] }
  }

  const { items, truncated } = await listAllObjects(bucket, key)
  const keys = items.map((item) => item.key)
  const result = await deleteObjectKeys(bucket, keys)
  result.truncated = truncated
  onProgress?.({ done: items.length, total: items.length })
  return result
}

/**
 * Copy a single file or every object under a folder prefix to a new key.
 */
export async function copyPath(
  bucket: string,
  sourceKey: string,
  destinationKey: string,
  onProgress?: ProgressCallback
): Promise<OperationResult> {
  validateKey(bucket, sourceKey)
  validateKey(bucket, destinationKey)

  if (!sourceKey.endsWith('/')) {
    await copyObject(bucket, sourceKey, destinationKey)
    return { success: 1, failed: 0, errors: [] }
  }

  const { items, truncated } = await listAllObjects(bucket, sourceKey)
  const result: OperationResult = { success: 0, failed: 0, errors: [], truncated }
  let done = 0
  for (const item of items) {
    const newKey = destinationKey + item.key.slice(sourceKey.length)
    try {
      await copyObject(bucket, item.key, newKey)
      result.success += 1
    } catch (error) {
      result.failed += 1
      result.errors.push(`${item.key}: ${(error as Error).message}`)
    }
    done += 1
    onProgress?.({ done, total: items.length })
  }
  return result
}

/**
 * Move a single file or every object under a folder prefix (copy then delete).
 */
export async function movePath(
  bucket: string,
  sourceKey: string,
  destinationKey: string,
  onProgress?: ProgressCallback
): Promise<OperationResult> {
  validateKey(bucket, sourceKey)
  validateKey(bucket, destinationKey)

  if (!sourceKey.endsWith('/')) {
    await copyObject(bucket, sourceKey, destinationKey)
    await deleteFile(bucket, sourceKey)
    return { success: 1, failed: 0, errors: [] }
  }

  const { items, truncated } = await listAllObjects(bucket, sourceKey)
  const result: OperationResult = { success: 0, failed: 0, errors: [], truncated }
  const toDelete: string[] = []
  let done = 0
  for (const item of items) {
    const newKey = destinationKey + item.key.slice(sourceKey.length)
    try {
      await copyObject(bucket, item.key, newKey)
      result.success += 1
      toDelete.push(item.key)
    } catch (error) {
      result.failed += 1
      result.errors.push(`${item.key}: ${(error as Error).message}`)
    }
    done += 1
    onProgress?.({ done, total: items.length })
  }
  if (toDelete.length > 0) {
    const del = await deleteObjectKeys(bucket, toDelete)
    result.errors.push(...del.errors)
  }
  return result
}

/** Copy an object in place with a new name (same parent key). */
export async function renamePath(
  bucket: string,
  sourceKey: string,
  newName: string,
  onProgress?: ProgressCallback
): Promise<OperationResult> {
  const isFolder = sourceKey.endsWith('/')
  const base = sourceKey.slice(0, sourceKey.lastIndexOf('/') + 1)
  const destinationKey = `${base}${newName}${isFolder ? '/' : ''}`
  return movePath(bucket, sourceKey, destinationKey, onProgress)
}
