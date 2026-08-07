import type { SessionPayload } from '@/lib/types'


interface Attempt {
  count: number
  firstAt: number
  blockedUntil: number
}

const WINDOW_MS = 15 * 60 * 1000
const BLOCK_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

const store = new Map<string, Attempt>()

// Periodically prune expired entries to avoid unbounded growth.
const PRUNE_INTERVAL_MS = 10 * 60 * 1000
setInterval(
  () => {
    const now = Date.now()
    for (const [key, attempt] of store) {
      if (now > attempt.blockedUntil && now - attempt.firstAt > WINDOW_MS) {
        store.delete(key)
      }
    }
  },
  PRUNE_INTERVAL_MS
).unref?.()

function getClientKey(ip: string, username: string): string {
  return `${ip}::${username.toLowerCase()}`
}

export function isBlocked(key: string): { blocked: boolean; retryAfterSeconds?: number } {
  const attempt = store.get(key)
  if (!attempt) return { blocked: false }
  if (Date.now() < attempt.blockedUntil) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((attempt.blockedUntil - Date.now()) / 1000)
    }
  }
  return { blocked: false }
}

export function recordFailure(ip: string, username: string): {
  blocked: boolean
  retryAfterSeconds?: number
} {
  const key = getClientKey(ip, username)
  const now = Date.now()
  const existing = store.get(key)

  if (existing && now > existing.firstAt + WINDOW_MS) {
    store.delete(key)
  }

  const attempt = store.get(key) ?? { count: 0, firstAt: now, blockedUntil: 0 }
  attempt.count += 1
  if (attempt.count >= MAX_ATTEMPTS) {
    attempt.blockedUntil = now + BLOCK_MS
    attempt.count = 0
  }
  store.set(key, attempt)

  if (now < attempt.blockedUntil) {
    return {
      blocked: true,
      retryAfterSeconds: Math.ceil((attempt.blockedUntil - now) / 1000)
    }
  }
  return { blocked: false }
}

export function clearFailures(ip: string, username: string): void {
  store.delete(getClientKey(ip, username))
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  return request.headers.get('x-real-ip') ?? 'unknown'
}
