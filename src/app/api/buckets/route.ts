import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { listBuckets } from '@/lib/r2/buckets'
import { toErrorResponse } from '@/lib/api-route'

export async function GET(request: NextRequest) {
  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const buckets = await listBuckets()
    return NextResponse.json({ ok: true, data: buckets })
  } catch (error) {
    return toErrorResponse(error)
  }
}
