import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { getStorageSummary } from '@/lib/r2/stats'
import { toErrorResponse } from '@/lib/api-route'

export async function GET(request: NextRequest) {
  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const bucket = request.nextUrl.searchParams.get('bucket') ?? undefined
    const maxScanned = Number(request.nextUrl.searchParams.get('maxScanned') ?? 25000)
    const summary = await getStorageSummary({
      bucket,
      maxScanned: Number.isFinite(maxScanned) ? Math.min(Math.max(100, maxScanned), 200000) : 25000
    })
    return NextResponse.json({ ok: true, data: summary })
  } catch (error) {
    return toErrorResponse(error)
  }
}
