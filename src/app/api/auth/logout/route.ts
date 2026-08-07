import { NextRequest, NextResponse } from 'next/server'
import { isSecureEnv, sessionCookieAttributes } from '@/lib/auth/session'
import { csrfGuard } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const attrs = sessionCookieAttributes(isSecureEnv())
  const response = NextResponse.json({ ok: true })
  response.cookies.set(attrs.name, '', {
    ...attrs.options,
    maxAge: 0,
    expires: new Date(0)
  })
  return response
}
