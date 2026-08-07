import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { getPresignedDownloadUrl } from '@/lib/r2/presign'
import { toErrorResponse, badRequest } from '@/lib/api-route'

export async function GET(request: NextRequest) {
  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const bucket = request.nextUrl.searchParams.get('bucket')
    const key = request.nextUrl.searchParams.get('key') ?? ''
    const name = request.nextUrl.searchParams.get('name') ?? key.split('/').pop() ?? 'file'
    if (!bucket || !key) throw badRequest('Missing bucket or key')

    const url = await getPresignedDownloadUrl(bucket, key, name)
    const response = NextResponse.redirect(url, 307)
    response.headers.set('Cache-Control', 'no-store')
    return response
  } catch (error) {
    return toErrorResponse(error)
  }
}
