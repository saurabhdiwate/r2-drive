import type { ApiResponse } from '@/lib/types'

export class ApiClientError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiClientError'
    this.status = status
  }
}

interface RequestOptions {
  method?: string
  body?: unknown
  signal?: AbortSignal
  headers?: Record<string, string>
}

/**
 * Authenticated fetch wrapper. Attaches JSON headers, parses JSON responses
 * and normalises error handling. Throws ApiClientError on non-2xx responses.
 */
export async function apiFetch<T = unknown>(
  path: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, signal, headers } = options

  let response: Response
  try {
    response = await fetch(path, {
      method,
      signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...headers
      },
      body: body !== undefined ? JSON.stringify(body) : undefined
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error
    }
    throw new ApiClientError('Network error, please try again.', 0)
  }

  let data: unknown = null
  const text = await response.text()
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = null
  }

  if (!response.ok) {
    const message =
      data && typeof data === 'object' && 'error' in data
        ? String((data as { error: unknown }).error)
        : `Request failed (${response.status})`
    throw new ApiClientError(message, response.status)
  }

  return data as T
}

export async function apiGet<T = unknown>(path: string, signal?: AbortSignal) {
  return apiFetch<T>(path, { signal })
}

export function unwrap<T>(payload: ApiResponse<T>): T {
  if (!payload || payload.ok !== true) {
    throw new ApiClientError(payload?.error ?? 'Unknown error', 500)
  }
  return payload.data as T
}
