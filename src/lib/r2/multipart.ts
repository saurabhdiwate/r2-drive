import {
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  ListMultipartUploadsCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getR2Client } from '@/lib/r2/client'
import type { UploadPartState } from '@/lib/types'

export interface CompletedPart {
  PartNumber: number
  ETag: string
}

export async function createMultipartUpload(
  bucket: string,
  key: string,
  contentType?: string
): Promise<{ uploadId: string }> {
  const client = getR2Client()
  const response = await client.send(
    new CreateMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      ContentType: contentType ?? 'application/octet-stream'
    })
  )
  if (!response.UploadId) throw new Error('Multipart upload could not be initialised')
  return { uploadId: response.UploadId }
}

export async function getMultipartPartUrl(
  bucket: string,
  key: string,
  uploadId: string,
  partNumber: number,
  expiresIn = 3600
): Promise<string> {
  const client = getR2Client()
  const command = new UploadPartCommand({
    Bucket: bucket,
    Key: key,
    UploadId: uploadId,
    PartNumber: partNumber
  })
  return getSignedUrl(client, command, { expiresIn })
}

export async function completeMultipartUpload(
  bucket: string,
  key: string,
  uploadId: string,
  parts: UploadPartState[]
): Promise<{ etag?: string; location?: string }> {
  const client = getR2Client()
  const completedParts: CompletedPart[] = parts.map((part) => ({
    PartNumber: part.partNumber,
    ETag: part.etag ?? ''
  }))
  const response = await client.send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: completedParts }
    })
  )
  return {
    etag: response.ETag,
    location: response.Location
  }
}

export async function abortMultipartUpload(
  bucket: string,
  key: string,
  uploadId: string
): Promise<void> {
  const client = getR2Client()
  await client.send(
    new AbortMultipartUploadCommand({
      Bucket: bucket,
      Key: key,
      UploadId: uploadId
    })
  )
}

/**
 * Best-effort cleanup of abandoned multipart uploads for a bucket.
 * When `prefix` is provided, only uploads under that prefix are considered.
 */
export async function cleanupAbandonedUploads(
  bucket: string,
  prefix?: string,
  olderThanMs = 24 * 60 * 60 * 1000
): Promise<number> {
  const client = getR2Client()
  let aborted = 0
  let keyMarker: string | undefined
  let uploadIdMarker: string | undefined
  let truncated = true

  do {
    const response = await client.send(
      new ListMultipartUploadsCommand({
        Bucket: bucket,
        Prefix: prefix,
        KeyMarker: keyMarker,
        UploadIdMarker: uploadIdMarker
      })
    )
    for (const upload of response.Uploads ?? []) {
      const initiated = upload.Initiated?.getTime() ?? 0
      if (initiated && Date.now() - initiated > olderThanMs) {
        try {
          await abortMultipartUpload(bucket, upload.Key ?? '', upload.UploadId ?? '')
          aborted += 1
        } catch {
          // best-effort: ignore failures
        }
      }
    }
    truncated = response.IsTruncated === true
    keyMarker = response.NextKeyMarker
    uploadIdMarker = response.NextUploadIdMarker
  } while (truncated)

  return aborted
}

/**
 * Abort any existing incomplete multipart upload for the exact same key,
 * so a fresh upload never collides with a stale one.
 */
export async function abortExistingUploadForKey(
  bucket: string,
  key: string
): Promise<number> {
  const client = getR2Client()
  let aborted = 0
  let keyMarker: string | undefined
  let uploadIdMarker: string | undefined
  let truncated = true

  do {
    const response = await client.send(
      new ListMultipartUploadsCommand({
        Bucket: bucket,
        Prefix: key,
        KeyMarker: keyMarker,
        UploadIdMarker: uploadIdMarker
      })
    )
    for (const upload of response.Uploads ?? []) {
      if (upload.Key === key && upload.UploadId) {
        try {
          await abortMultipartUpload(bucket, key, upload.UploadId)
          aborted += 1
        } catch {
          // best-effort
        }
      }
    }
    truncated = response.IsTruncated === true
    keyMarker = response.NextKeyMarker
    uploadIdMarker = response.NextUploadIdMarker
  } while (truncated)

  return aborted
}
