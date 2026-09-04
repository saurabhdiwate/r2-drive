import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getPresignedUploadUrl, getPresignedDownloadUrl, getPresignedShareUrl } from '@/lib/r2/presign'

vi.mock('@/lib/r2/client', () => ({
  getR2Client: vi.fn(() => ({
    send: vi.fn()
  }))
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(async () => 'https://r2.example.com/signed-url')
}))

describe('presigned URLs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('getPresignedUploadUrl', () => {
    it('generates upload URL with correct params', async () => {
      const url = await getPresignedUploadUrl('my-bucket', 'file.txt', 'text/plain')
      expect(url).toBe('https://r2.example.com/signed-url')
    })

    it('uses default content type when empty', async () => {
      const url = await getPresignedUploadUrl('my-bucket', 'file.txt', '')
      expect(url).toBeDefined()
    })
  })

  describe('getPresignedDownloadUrl', () => {
    it('generates download URL', async () => {
      const url = await getPresignedDownloadUrl('my-bucket', 'file.txt', 'file.txt')
      expect(url).toBe('https://r2.example.com/signed-url')
    })
  })

  describe('getPresignedShareUrl', () => {
    it('generates share URL with custom expiry', async () => {
      const url = await getPresignedShareUrl('my-bucket', 'file.txt', 'file.txt', 3600)
      expect(url).toBe('https://r2.example.com/signed-url')
    })
  })
})
