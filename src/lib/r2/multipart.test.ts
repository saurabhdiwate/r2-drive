import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMultipartUpload,
  getMultipartPartUrl,
  completeMultipartUpload,
  abortMultipartUpload
} from '@/lib/r2/multipart'
import type { UploadPartState } from '@/lib/types'

const mockSend = vi.fn()
vi.mock('@/lib/r2/client', () => ({
  getR2Client: vi.fn(() => ({ send: mockSend }))
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://r2.example.com/part-signed-url')
}))

describe('multipart uploads', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createMultipartUpload', () => {
    it('creates upload and returns upload ID', async () => {
      mockSend.mockResolvedValueOnce({ UploadId: 'test-upload-id' })
      const result = await createMultipartUpload('bucket', 'key')
      expect(result.uploadId).toBe('test-upload-id')
    })

    it('throws when no upload ID returned', async () => {
      mockSend.mockResolvedValueOnce({})
      await expect(createMultipartUpload('bucket', 'key')).rejects.toThrow(
        'Multipart upload could not be initialised'
      )
    })
  })

  describe('getMultipartPartUrl', () => {
    it('generates presigned part URL', async () => {
      const url = await getMultipartPartUrl('bucket', 'key', 'upload-id', 1)
      expect(url).toBe('https://r2.example.com/part-signed-url')
    })
  })

  describe('completeMultipartUpload', () => {
    it('completes upload with parts', async () => {
      mockSend.mockResolvedValueOnce({ ETag: 'etag123', Location: '/bucket/key' })
      const parts: UploadPartState[] = [
        { partNumber: 1, size: 8388608, uploaded: true, etag: 'etag1' },
        { partNumber: 2, size: 4194304, uploaded: true, etag: 'etag2' }
      ]
      const result = await completeMultipartUpload('bucket', 'key', 'upload-id', parts)
      expect(result.etag).toBe('etag123')
    })
  })

  describe('abortMultipartUpload', () => {
    it('aborts upload without error', async () => {
      mockSend.mockResolvedValueOnce({})
      await expect(abortMultipartUpload('bucket', 'key', 'upload-id')).resolves.toBeUndefined()
    })
  })
})
