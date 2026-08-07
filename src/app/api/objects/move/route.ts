import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { movePath } from '@/lib/r2/ops'
import { csrfGuard } from '@/lib/csrf'
import { toErrorResponse, badRequest } from '@/lib/api-route'
import { assertSafeKey } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const body = await request.json()
    const { bucket, sourceKey, destinationKey } = body as {
      bucket?: string
      sourceKey?: string
      destinationKey?: string
    }
    if (!bucket || !sourceKey || !destinationKey) {
      throw badRequest('Missing bucket, sourceKey or destinationKey')
    }
    assertSafeKey(destinationKey)

    const result = await movePath(bucket, sourceKey, destinationKey)
    if (result.failed > 0 && result.success === 0) {
      return NextResponse.json(
        { error: result.errors[0] ?? 'Move failed' },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true, data: result })
  } catch (error) {
    return toErrorResponse(error)
  }
}
