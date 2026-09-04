import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword, BCRYPT_COST } from '@/lib/auth/password'

describe('password', () => {
  describe('hashPassword', () => {
    it('returns a bcrypt hash', async () => {
      const hash = await hashPassword('test-password')
      expect(hash).toMatch(/^\$2[aby]?\$\d{2}\$/)
    })

    it('uses configured cost factor', async () => {
      const hash = await hashPassword('test')
      const costStr = hash.split('$')[2]
      expect(Number(costStr)).toBe(BCRYPT_COST)
    })

    it('produces different hashes for same input', async () => {
      const hash1 = await hashPassword('same-password')
      const hash2 = await hashPassword('same-password')
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('verifies correct password', async () => {
      const hash = await hashPassword('correct-password')
      expect(await verifyPassword('correct-password', hash)).toBe(true)
    })

    it('rejects wrong password', async () => {
      const hash = await hashPassword('correct-password')
      expect(await verifyPassword('wrong-password', hash)).toBe(false)
    })

    it('returns false when no hash provided', async () => {
      expect(await verifyPassword('anything')).toBe(false)
    })
  })
})
