import {
  PutObjectCommand,
  GetObjectCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { getR2Client } from '@/lib/r2/client'

function encodeDispositionFilename(name: string): string {
  const safe = name.replace(/["\\\r\n]/g, '_')
  return `attachment; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(name)}`
}

export async function getPresignedUploadUrl(
  bucket: string,
  key: string,
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  const client = getR2Client()
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType || 'application/octet-stream'
  })
  return getSignedUrl(client, command, { expiresIn })
}

export async function getPresignedDownloadUrl(
  bucket: string,
  key: string,
  name: string,
  expiresIn = 60 * 30
): Promise<string> {
  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: encodeDispositionFilename(name)
  })
  return getSignedUrl(client, command, { expiresIn })
}

export async function getPresignedPreviewUrl(
  bucket: string,
  key: string,
  name: string,
  expiresIn = 60 * 30
): Promise<string> {
  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `inline; filename="${name.replace(/["\\\r\n]/g, '_')}"`
  })
  return getSignedUrl(client, command, { expiresIn })
}

export async function getPresignedShareUrl(
  bucket: string,
  key: string,
  name: string,
  expiresIn: number
): Promise<string> {
  const client = getR2Client()
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: `inline; filename="${name.replace(/["\\\r\n]/g, '_')}"`
  })
  return getSignedUrl(client, command, { expiresIn })
}

/**
 * Stream the object body from R2 as a web ReadableStream. Used for text
 * previews. Never buffers the full object in memory.
 */
export async function getObjectStream(
  bucket: string,
  key: string,
  maxBytes?: number
): Promise<{
  stream: ReadableStream<Uint8Array>
  contentType?: string
  size: number
  truncated: boolean
}> {
  const client = getR2Client()
  const command = new GetObjectCommand({ Bucket: bucket, Key: key })
  const response = await client.send(command)
  const body = response.Body as AsyncIterable<Uint8Array> | undefined
  if (!body) {
    throw new Error('Object body is empty')
  }

  const contentType = response.ContentType
  let size = 0
  let truncated = false
  const chunks: Uint8Array[] = []

  for await (const chunk of body) {
    const remaining = maxBytes ? maxBytes - size : Infinity
    if (remaining <= 0) {
      truncated = true
      break
    }
    const slice = chunk.length > remaining ? chunk.slice(0, remaining) : chunk
    size += slice.length
    chunks.push(slice)
    if (maxBytes && size >= maxBytes) {
      truncated = true
      break
    }
  }

  return {
    stream: new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk)
        controller.close()
      }
    }),
    contentType,
    size,
    truncated
  }
}
