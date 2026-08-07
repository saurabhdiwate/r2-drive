import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { getObjectStream, getPresignedPreviewUrl } from '@/lib/r2/presign'
import { toErrorResponse, badRequest } from '@/lib/api-route'
import { isTextFile } from '@/lib/utils'

const MAX_TEXT_PREVIEW_BYTES = 1024 * 1024 // 1 MiB

export async function GET(request: NextRequest) {
  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const bucket = request.nextUrl.searchParams.get('bucket')
    const key = request.nextUrl.searchParams.get('key') ?? ''
    const name = request.nextUrl.searchParams.get('name') ?? key
    if (!bucket || !key) throw badRequest('Missing bucket or key')

    if (isTextFile(key)) {
      const { stream, contentType, truncated } = await getObjectStream(
        bucket,
        key,
        MAX_TEXT_PREVIEW_BYTES
      )
      const headers = new Headers()
      headers.set('Content-Type', contentType || 'text/plain; charset=utf-8')
      headers.set('Cache-Control', 'private, no-store')
      headers.set('X-Preview-Truncated', truncated ? '1' : '0')
      return new NextResponse(stream, { status: 200, headers })
    }

    const url = await getPresignedPreviewUrl(bucket, key, name)
    return NextResponse.json({ ok: true, data: { url } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
