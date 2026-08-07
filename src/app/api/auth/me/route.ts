import { NextRequest, NextResponse } from 'next/server'
import {
  getConfiguredUsername,
  readSessionFromRequest
} from '@/lib/auth/guard'

export async function GET(request: NextRequest) {
  const session = readSessionFromRequest(request)
  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
  }
  const username = getConfiguredUsername() || session.sub
  return NextResponse.json({
    ok: true,
    user: { username },
    expiresAt: session.exp
  })
}
