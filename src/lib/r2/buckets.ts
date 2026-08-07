import {
  ListBucketsCommand,
  HeadBucketCommand
} from '@aws-sdk/client-s3'
import { getR2Client } from '@/lib/r2/client'
import type { R2BucketInfo } from '@/lib/types'

export async function listBuckets(): Promise<R2BucketInfo[]> {
  const client = getR2Client()
  const response = await client.send(new ListBucketsCommand({}))
  const buckets = response.Buckets ?? []
  return buckets
    .sort((a, b) => (a.Name ?? '').localeCompare(b.Name ?? ''))
    .map((bucket) => ({
      name: bucket.Name ?? '',
      creationDate: bucket.CreationDate?.toISOString()
    }))
}

export async function headBucket(name: string): Promise<{
  exists: boolean
  region?: string
  error?: string
}> {
  const client = getR2Client()
  try {
    await client.send(
      new HeadBucketCommand({ Bucket: name })
    )
    return { exists: true }
  } catch (error) {
    return { exists: false, error: (error as Error).message }
  }
}

export async function testConnection(): Promise<{
  ok: boolean
  bucketCount: number
  error?: string
}> {
  try {
    const buckets = await listBuckets()
    return { ok: true, bucketCount: buckets.length }
  } catch (error) {
    return { ok: false, bucketCount: 0, error: (error as Error).message }
  }
}
