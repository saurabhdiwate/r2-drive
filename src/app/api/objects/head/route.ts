import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { headObject } from '@/lib/r2/objects'
import { toErrorResponse, badRequest } from '@/lib/api-route'

export async function GET(request: NextRequest) {
  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const bucket = request.nextUrl.searchParams.get('bucket')
    const key = request.nextUrl.searchParams.get('key') ?? ''
    if (!bucket || !key) throw badRequest('Missing bucket or key')

    const meta = await headObject(bucket, key)
    return NextResponse.json({ ok: true, data: meta })
  } catch (error) {
    return toErrorResponse(error)
  }
}
