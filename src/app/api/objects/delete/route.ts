import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { deletePath } from '@/lib/r2/ops'
import { csrfGuard } from '@/lib/csrf'
import { toErrorResponse, badRequest } from '@/lib/api-route'

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const body = await request.json()
    const { bucket, key } = body as { bucket?: string; key?: string }
    if (!bucket || !key) throw badRequest('Missing bucket or key')

    const result = await deletePath(bucket, key)
    if (result.failed > 0 && result.success === 0) {
      return NextResponse.json(
        { error: result.errors[0] ?? 'Delete failed' },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true, data: result })
  } catch (error) {
    return toErrorResponse(error)
  }
}
