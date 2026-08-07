import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { searchObjects } from '@/lib/r2/objects'
import { toErrorResponse, badRequest } from '@/lib/api-route'

export async function GET(request: NextRequest) {
  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const bucket = request.nextUrl.searchParams.get('bucket')
    const q = (request.nextUrl.searchParams.get('q') ?? '').trim()
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 200)
    if (!bucket) throw badRequest('Missing bucket')
    if (!q) return NextResponse.json({ ok: true, data: { items: [], scanned: 0, truncated: false } })

    const result = await searchObjects(bucket, q, {
      limit: Number.isFinite(limit) ? Math.min(Math.max(1, limit), 500) : 200
    })
    return NextResponse.json({ ok: true, data: result })
  } catch (error) {
    return toErrorResponse(error)
  }
}
