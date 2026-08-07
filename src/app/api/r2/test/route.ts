import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { runConnectionTest } from '@/lib/r2/connection-state'
import { csrfGuard } from '@/lib/csrf'

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const result = await runConnectionTest()
    if (result.ok) {
      return NextResponse.json({
        ok: true,
        data: result
      })
    }
    return NextResponse.json(
      {
        ok: false,
        error: result.error ?? 'Connection failed',
        data: result
      },
      { status: 502 }
    )
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    )
  }
}
