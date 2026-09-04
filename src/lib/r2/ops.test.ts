import { describe, it, expect, vi, beforeEach } from 'vitest'
import { deleteFile, deletePath, copyObject, createFolder, renamePath } from '@/lib/r2/ops'

const mockSend = vi.fn()
vi.mock('@/lib/r2/client', () => ({
  getR2Client: vi.fn(() => ({ send: mockSend }))
}))

vi.mock('@/lib/r2/objects', () => ({
  listAllObjects: vi.fn(async () => ({
    items: [
      { key: 'folder/file1.txt', size: 100 },
      { key: 'folder/file2.txt', size: 200 }
    ],
    truncated: false
  }))
}))

describe('R2 operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSend.mockResolvedValue({})
  })

  describe('deleteFile', () => {
    it('deletes a single file', async () => {
      await deleteFile('bucket', 'file.txt')
      expect(mockSend).toHaveBeenCalledOnce()
    })
  })

  describe('deletePath', () => {
    it('deletes a single file', async () => {
      const result = await deletePath('bucket', 'file.txt')
      expect(result.success).toBe(1)
      expect(result.failed).toBe(0)
    })

    it('deletes folder contents', async () => {
      const result = await deletePath('bucket', 'folder/')
      expect(result.success).toBe(2)
    })
  })

  describe('copyObject', () => {
    it('copies an object', async () => {
      await copyObject('bucket', 'source.txt', 'dest.txt')
      expect(mockSend).toHaveBeenCalledOnce()
    })
  })

  describe('createFolder', () => {
    it('creates a folder', async () => {
      await createFolder('bucket', 'new-folder')
      expect(mockSend).toHaveBeenCalledOnce()
    })

    it('does not duplicate trailing slash', async () => {
      await createFolder('bucket', 'new-folder/')
      expect(mockSend).toHaveBeenCalledOnce()
    })
  })

  describe('renamePath', () => {
    it('renames a file', async () => {
      const result = await renamePath('bucket', 'old-name.txt', 'new-name.txt')
      expect(result.success).toBe(1)
    })
  })
})
