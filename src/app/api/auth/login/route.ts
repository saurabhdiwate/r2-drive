import { NextRequest, NextResponse } from 'next/server'
import {
  getAuthConfigStatus,
  getConfiguredUsername
} from '@/lib/auth/guard'
import { verifyPassword } from '@/lib/auth/password'
import {
  clearFailures,
  getClientIp,
  isBlocked,
  recordFailure
} from '@/lib/auth/rate-limit'
import {
  createSession,
  isSecureEnv,
  sessionCookieAttributes
} from '@/lib/auth/session'
import { csrfGuard } from '@/lib/csrf'

const GENERIC_ERROR = 'Invalid username or password'

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const ip = getClientIp(request)

  let body: { username?: unknown; password?: unknown } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const username = typeof body.username === 'string' ? body.username.trim() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  const { configured } = getAuthConfigStatus()
  if (!configured) {
    return NextResponse.json(
      {
        error:
          'Authentication is not configured. Set APP_USERNAME, APP_PASSWORD_HASH and SESSION_SECRET as server environment variables.'
      },
      { status: 500 }
    )
  }

  const key = `${ip}::${username.toLowerCase()}`
  const blocked = isBlocked(key)
  if (blocked.blocked) {
    return NextResponse.json(
      {
        error: 'Too many failed login attempts. Try again later.',
        retryAfterSeconds: blocked.retryAfterSeconds
      },
      { status: 429 }
    )
  }

  const valid =
    username === getConfiguredUsername() &&
    (await verifyPassword(password, process.env.APP_PASSWORD_HASH))

  if (!valid) {
    const after = recordFailure(ip, username)
    return NextResponse.json(
      {
        error: GENERIC_ERROR,
        ...(after.retryAfterSeconds ? { retryAfterSeconds: after.retryAfterSeconds } : {})
      },
      { status: 401 }
    )
  }

  clearFailures(ip, username)

  let session: ReturnType<typeof createSession>
  try {
    session = createSession(username)
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }

  const attrs = sessionCookieAttributes(isSecureEnv())
  const response = NextResponse.json({
    ok: true,
    user: { username }
  })
  response.cookies.set(attrs.name, session.value, {
    ...attrs.options,
    expires: session.expires
  })
  return response
}
