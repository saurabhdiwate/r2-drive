import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { getPresignedShareUrl } from '@/lib/r2/presign'
import { toErrorResponse, badRequest } from '@/lib/api-route'

const ALLOWED_EXPIRY_SECONDS = [900, 3600, 86400, 259200, 604800]

export async function GET(request: NextRequest) {
  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const bucket = request.nextUrl.searchParams.get('bucket')
    const key = request.nextUrl.searchParams.get('key') ?? ''
    const name = request.nextUrl.searchParams.get('name') ?? key.split('/').pop() ?? 'file'
    const expiresIn = Number(request.nextUrl.searchParams.get('expiresIn') ?? 3600)

    if (!bucket || !key) throw badRequest('Missing bucket or key')
    if (!ALLOWED_EXPIRY_SECONDS.includes(expiresIn)) {
      throw badRequest('Invalid expiry; choose 900, 3600, 86400, 259200 or 604800 seconds')
    }

    const url = await getPresignedShareUrl(bucket, key, name, expiresIn)
    const expiresAt = Date.now() + expiresIn * 1000
    return NextResponse.json({
      ok: true,
      data: { url, expiresAt, expiresInSeconds: expiresIn }
    })
  } catch (error) {
    return toErrorResponse(error)
  }
}
