import crypto from 'node:crypto'
import type { SessionPayload } from '@/lib/types'

export const SESSION_COOKIE_NAME = 'r2fm_session'

const SESSION_DURATION_MS =
  Number(process.env.SESSION_DURATION_HOURS ?? 24 * 7) * 60 * 60 * 1000

const SECRET_HASH_ALGO = 'sha256'

function requireSecret(): string {
  const secret = process.env.SESSION_SECRET
  if (!secret || secret.length < 16) {
    throw new Error(
      'SESSION_SECRET is not configured. Generate a strong random value (e.g. `openssl rand -base64 48`).'
    )
  }
  return secret
}

export function getSessionDurationMs(): number {
  return SESSION_DURATION_MS
}

function b64urlEncode(input: string): string {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function b64urlDecode(input: string): string {
  return Buffer.from(input, 'base64url').toString('utf8')
}

function sign(payloadB64: string): string {
  const secret = requireSecret()
  return crypto
    .createHmac(SECRET_HASH_ALGO, secret)
    .update(payloadB64)
    .digest('hex')
}

export function createSession(username: string): {
  value: string
  expires: Date
} {
  const now = Date.now()
  const expires = new Date(now + getSessionDurationMs())
  const payload: SessionPayload = {
    sub: username,
    iat: now,
    exp: expires.getTime()
  }
  const payloadB64 = b64urlEncode(JSON.stringify(payload))
  const value = `${payloadB64}.${sign(payloadB64)}`
  return { value, expires }
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 2) return null
  const [payloadB64, signature] = parts

  const expected = sign(payloadB64)
  const sigA = Buffer.from(signature)
  const sigB = Buffer.from(expected)
  if (sigA.length !== sigB.length || !crypto.timingSafeEqual(sigA, sigB)) {
    return null
  }

  let payload: SessionPayload
  try {
    payload = JSON.parse(b64urlDecode(payloadB64)) as SessionPayload
  } catch {
    return null
  }
  if (!payload || typeof payload.sub !== 'string' || typeof payload.exp !== 'number') {
    return null
  }
  if (Date.now() > payload.exp) return null
  return payload
}

export function sessionCookieAttributes(secure: boolean): {
  name: string
  options: {
    httpOnly: boolean
    secure: boolean
    sameSite: 'lax'
    path: string
    maxAge: number
  }
} {
  return {
    name: SESSION_COOKIE_NAME,
    options: {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      path: '/',
      maxAge: Math.floor(getSessionDurationMs() / 1000)
    }
  }
}

export function isSecureEnv(): boolean {
  // Secure cookies by default in production. Set COOKIE_SECURE=false only if
  // the app is served over plain HTTP (not recommended).
  const override = process.env.COOKIE_SECURE
  if (override === 'false' || override === '0') return false
  return process.env.NODE_ENV === 'production'
}
