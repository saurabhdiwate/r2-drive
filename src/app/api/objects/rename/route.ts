import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { renamePath } from '@/lib/r2/ops'
import { csrfGuard } from '@/lib/csrf'
import { toErrorResponse, badRequest } from '@/lib/api-route'
import { assertSafeName } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const body = await request.json()
    const { bucket, sourceKey } = body as {
      bucket?: string
      sourceKey?: string
      newName?: string
    }
    let { newName } = body as { newName?: string }
    newName = assertSafeName(newName ?? '')

    if (!bucket || !sourceKey) throw badRequest('Missing bucket or sourceKey')

    const result = await renamePath(bucket, sourceKey, newName)
    if (result.failed > 0 && result.success === 0) {
      return NextResponse.json(
        { error: result.errors[0] ?? 'Rename failed' },
        { status: 502 }
      )
    }
    return NextResponse.json({ ok: true, data: result })
  } catch (error) {
    return toErrorResponse(error)
  }
}
