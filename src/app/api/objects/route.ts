import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { listObjects } from '@/lib/r2/objects'
import { toErrorResponse, badRequest } from '@/lib/api-route'

export async function GET(request: NextRequest) {
  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const bucket = request.nextUrl.searchParams.get('bucket')
    const prefix = request.nextUrl.searchParams.get('prefix') ?? ''
    const continuationToken =
      request.nextUrl.searchParams.get('continuationToken') ?? undefined
    const maxKeys = Number(request.nextUrl.searchParams.get('maxKeys') ?? 2000)

    if (!bucket) throw badRequest('Missing bucket parameter')

    const result = await listObjects(bucket, {
      prefix,
      continuationToken,
      maxKeys: Number.isFinite(maxKeys) ? Math.min(Math.max(1, maxKeys), 5000) : 2000
    })
    return NextResponse.json({ ok: true, data: result })
  } catch (error) {
    return toErrorResponse(error)
  }
}
