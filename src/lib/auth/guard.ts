import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import {
  SESSION_COOKIE_NAME,
  verifySession
} from '@/lib/auth/session'
import type { SessionPayload } from '@/lib/types'

export function readSessionFromRequest(request: NextRequest): SessionPayload | null {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  return verifySession(token)
}

export async function readSessionServer(): Promise<SessionPayload | null> {
  const token = cookies().get(SESSION_COOKIE_NAME)?.value
  return verifySession(token)
}

/** Guard for API route handlers. Returns the session or a JSON 401 response. */
export function requireApiSession(
  request: NextRequest
): { session: SessionPayload } | { response: NextResponse } {
  const session = readSessionFromRequest(request)
  if (!session) {
    return {
      response: NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
  }
  return { session }
}

export function getAuthConfigStatus(): {
  configured: boolean
  missing: string[]
} {
  const missing: string[] = []
  if (!process.env.APP_USERNAME) missing.push('APP_USERNAME')
  if (!process.env.APP_PASSWORD_HASH) missing.push('APP_PASSWORD_HASH')
  if (!process.env.SESSION_SECRET) missing.push('SESSION_SECRET')
  return {
    configured: missing.length === 0,
    missing
  }
}

export function getConfiguredUsername(): string {
  return process.env.APP_USERNAME ?? ''
}
