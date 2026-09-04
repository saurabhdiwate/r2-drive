import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  readSessionFromRequest,
  requireApiSession,
  getAuthConfigStatus,
  getConfiguredUsername
} from '@/lib/auth/guard'
import { NextRequest, NextResponse } from 'next/server'
import { createSession } from '@/lib/auth/session'

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn()
  }))
}))

describe('auth guard', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.SESSION_SECRET = 'test-secret-key-that-is-long-enough-1234'
    process.env.APP_USERNAME = 'admin'
    process.env.APP_PASSWORD_HASH = '$2b$12$test-hash'
  })

  describe('readSessionFromRequest', () => {
    it('returns null for request without session cookie', () => {
      const request = new NextRequest(new Request('http://localhost/api/test'))
      const session = readSessionFromRequest(request)
      expect(session).toBeNull()
    })

    it('returns session for valid cookie', () => {
      const { value } = createSession('admin')
      const request = new NextRequest(new Request('http://localhost/api/test'), {
        headers: { cookie: `r2fm_session=${value}` }
      })
      const session = readSessionFromRequest(request)
      expect(session).not.toBeNull()
      expect(session?.sub).toBe('admin')
    })
  })

  describe('requireApiSession', () => {
    it('returns 401 for unauthenticated request', () => {
      const request = new NextRequest(new Request('http://localhost/api/test'))
      const result = requireApiSession(request)
      expect('response' in result).toBe(true)
      if ('response' in result) {
        expect(result.response.status).toBe(401)
      }
    })

    it('returns session for authenticated request', () => {
      const { value } = createSession('admin')
      const request = new NextRequest(new Request('http://localhost/api/test'), {
        headers: { cookie: `r2fm_session=${value}` }
      })
      const result = requireApiSession(request)
      expect('session' in result).toBe(true)
    })
  })

  describe('getAuthConfigStatus', () => {
    it('reports configured when all vars set', () => {
      const status = getAuthConfigStatus()
      expect(status.configured).toBe(true)
      expect(status.missing).toEqual([])
    })

    it('reports missing vars', () => {
      delete process.env.APP_USERNAME
      delete process.env.APP_PASSWORD_HASH
      const status = getAuthConfigStatus()
      expect(status.configured).toBe(false)
      expect(status.missing).toContain('APP_USERNAME')
      expect(status.missing).toContain('APP_PASSWORD_HASH')
    })
  })

  describe('getConfiguredUsername', () => {
    it('returns configured username', () => {
      expect(getConfiguredUsername()).toBe('admin')
    })

    it('returns empty when not set', () => {
      delete process.env.APP_USERNAME
      expect(getConfiguredUsername()).toBe('')
    })
  })
})
