import { describe, it, expect } from 'vitest'
import {
  isBlocked,
  recordFailure,
  clearFailures,
  getClientIp
} from '@/lib/auth/rate-limit'

describe('rate limiting', () => {
  describe('getClientIp', () => {
    it('extracts IP from x-forwarded-for', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' }
      })
      expect(getClientIp(request)).toBe('1.2.3.4')
    })

    it('falls back to x-real-ip', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '1.2.3.4' }
      })
      expect(getClientIp(request)).toBe('1.2.3.4')
    })

    it('returns unknown when no headers', () => {
      const request = new Request('http://localhost')
      expect(getClientIp(request)).toBe('unknown')
    })
  })

  describe('recordFailure and isBlocked', () => {
    it('blocks after max attempts', () => {
      clearFailures('1.2.3.4', 'admin')
      for (let i = 0; i < 5; i++) {
        recordFailure('1.2.3.4', 'admin')
      }
      const status = isBlocked('1.2.3.4::admin')
      expect(status.blocked).toBe(true)
      expect(status.retryAfterSeconds).toBeGreaterThan(0)
      clearFailures('1.2.3.4', 'admin')
    })

    it('not blocked initially', () => {
      clearFailures('1.2.3.5', 'admin')
      const status = isBlocked('1.2.3.5::admin')
      expect(status.blocked).toBe(false)
      clearFailures('1.2.3.5', 'admin')
    })
  })

  describe('clearFailures', () => {
    it('clears failure record', () => {
      recordFailure('10.0.0.1', 'user')
      clearFailures('10.0.0.1', 'user')
      const status = isBlocked('10.0.0.1::user')
      expect(status.blocked).toBe(false)
    })
  })
})
