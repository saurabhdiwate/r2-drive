import { NextResponse } from 'next/server'

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Convert an unknown thrown error into a safe JSON error response.
 * Detailed errors go to the server logs; the client receives an
 * understandable message without internal details.
 */
export function toErrorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) {
    return NextResponse.json({ error: error.message }, { status: error.status })
  }
  console.error('[api] request failed:', error)
  const message =
    error instanceof Error && error.message
      ? error.message
      : 'An unexpected server error occurred'
  return NextResponse.json({ error: message }, { status: 500 })
}

export function badRequest(message: string): ApiError {
  return new ApiError(message, 400)
}

export function notFound(message: string): ApiError {
  return new ApiError(message, 404)
}
