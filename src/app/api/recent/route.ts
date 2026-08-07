import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { getRecentFiles } from '@/lib/r2/stats'
import { toErrorResponse } from '@/lib/api-route'

export async function GET(request: NextRequest) {
  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const bucket = request.nextUrl.searchParams.get('bucket') ?? undefined
    const limit = Number(request.nextUrl.searchParams.get('limit') ?? 50)
    const result = await getRecentFiles(
      { bucket },
      Number.isFinite(limit) ? Math.min(Math.max(1, limit), 200) : 50
    )
    return NextResponse.json({ ok: true, data: result })
  } catch (error) {
    return toErrorResponse(error)
  }
}
