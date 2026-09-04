import { describe, it, expect } from 'vitest'
import { ApiError, toErrorResponse, badRequest, notFound } from '@/lib/api-route'

describe('API error handling', () => {
  describe('ApiError', () => {
    it('creates error with status', () => {
      const error = new ApiError('test error', 400)
      expect(error.message).toBe('test error')
      expect(error.status).toBe(400)
      expect(error.name).toBe('ApiError')
    })

    it('defaults to 400 status', () => {
      const error = new ApiError('test')
      expect(error.status).toBe(400)
    })
  })

  describe('toErrorResponse', () => {
    it('converts ApiError to JSON response', () => {
      const error = new ApiError('bad request', 400)
      const response = toErrorResponse(error)
      expect(response.status).toBe(400)
    })

    it('converts generic error to 500', () => {
      const error = new Error('something broke')
      const response = toErrorResponse(error)
      expect(response.status).toBe(500)
    })

    it('handles unknown error types', () => {
      const response = toErrorResponse('string error')
      expect(response.status).toBe(500)
    })
  })

  describe('badRequest', () => {
    it('creates 400 ApiError', () => {
      const error = badRequest('invalid input')
      expect(error.status).toBe(400)
      expect(error.message).toBe('invalid input')
    })
  })

  describe('notFound', () => {
    it('creates 404 ApiError', () => {
      const error = notFound('resource missing')
      expect(error.status).toBe(404)
      expect(error.message).toBe('resource missing')
    })
  })
})
