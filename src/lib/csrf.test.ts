import { describe, it, expect } from 'vitest'
import { validateSameOrigin, csrfGuard } from '@/lib/csrf'
import { NextRequest } from 'next/server'

describe('CSRF protection', () => {
  describe('validateSameOrigin', () => {
    it('allows same-origin requests', () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test'), {
        headers: {
          origin: 'http://localhost:3000',
          host: 'localhost:3000'
        }
      })
      expect(validateSameOrigin(request)).toBe(true)
    })

    it('rejects cross-origin requests', () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test'), {
        headers: {
          origin: 'http://evil.com',
          host: 'localhost:3000'
        }
      })
      expect(validateSameOrigin(request)).toBe(false)
    })

    it('allows requests without Origin header', () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test'), {
        headers: {
          host: 'localhost:3000'
        }
      })
      expect(validateSameOrigin(request)).toBe(true)
    })

    it('rejects requests without Host header', () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test'), {
        headers: {
          origin: 'http://localhost:3000'
        }
      })
      expect(validateSameOrigin(request)).toBe(false)
    })

    it('rejects invalid origin URL', () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test'), {
        headers: {
          origin: 'not-a-url',
          host: 'localhost:3000'
        }
      })
      expect(validateSameOrigin(request)).toBe(false)
    })
  })

  describe('csrfGuard', () => {
    it('returns null for valid origin', () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test'), {
        headers: {
          origin: 'http://localhost:3000',
          host: 'localhost:3000'
        }
      })
      expect(csrfGuard(request)).toBeNull()
    })

    it('returns 403 for cross-origin', () => {
      const request = new NextRequest(new Request('http://localhost:3000/api/test'), {
        headers: {
          origin: 'http://evil.com',
          host: 'localhost:3000'
        }
      })
      const response = csrfGuard(request)
      expect(response).not.toBeNull()
      expect(response!.status).toBe(403)
    })
  })
})
