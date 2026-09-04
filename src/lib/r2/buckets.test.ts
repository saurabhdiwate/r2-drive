import { describe, it, expect, vi, beforeEach } from 'vitest'
import { listBuckets, testConnection, headBucket } from '@/lib/r2/buckets'

const mockSend = vi.fn()
vi.mock('@/lib/r2/client', () => ({
  getR2Client: vi.fn(() => ({ send: mockSend }))
}))

describe('bucket operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('listBuckets', () => {
    it('returns sorted bucket list', async () => {
      mockSend.mockResolvedValue({
        Buckets: [
          { Name: 'zebra-bucket', CreationDate: new Date('2024-01-01') },
          { Name: 'alpha-bucket', CreationDate: new Date('2024-01-02') }
        ]
      })

      const buckets = await listBuckets()
      expect(buckets).toHaveLength(2)
      expect(buckets[0].name).toBe('alpha-bucket')
      expect(buckets[1].name).toBe('zebra-bucket')
    })

    it('returns empty array when no buckets', async () => {
      mockSend.mockResolvedValue({ Buckets: [] })
      const buckets = await listBuckets()
      expect(buckets).toEqual([])
    })
  })

  describe('testConnection', () => {
    it('returns ok when buckets accessible', async () => {
      mockSend.mockResolvedValue({ Buckets: [{ Name: 'test' }] })
      const result = await testConnection()
      expect(result.ok).toBe(true)
      expect(result.bucketCount).toBe(1)
    })

    it('returns error when connection fails', async () => {
      mockSend.mockRejectedValue(new Error('Access Denied'))
      const result = await testConnection()
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Access Denied')
    })
  })

  describe('headBucket', () => {
    it('returns exists true when bucket accessible', async () => {
      mockSend.mockResolvedValue({})
      const result = await headBucket('my-bucket')
      expect(result.exists).toBe(true)
    })

    it('returns exists false when bucket not found', async () => {
      mockSend.mockRejectedValue(new Error('NoSuchBucket'))
      const result = await headBucket('missing-bucket')
      expect(result.exists).toBe(false)
    })
  })
})
