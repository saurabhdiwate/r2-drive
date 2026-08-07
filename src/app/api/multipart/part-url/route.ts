import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { getMultipartPartUrl } from '@/lib/r2/multipart'
import { csrfGuard } from '@/lib/csrf'
import { toErrorResponse, badRequest } from '@/lib/api-route'
import { assertSafeKey } from '@/lib/utils'

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const body = await request.json()
    const { bucket, key, uploadId, partNumber } = body as {
      bucket?: string
      key?: string
      uploadId?: string
      partNumber?: number
    }
    if (!bucket || !key || !uploadId) throw badRequest('Missing bucket, key or uploadId')
    if (!partNumber || partNumber < 1 || partNumber > 10000) {
      throw badRequest('Invalid part number')
    }
    assertSafeKey(key)

    const url = await getMultipartPartUrl(bucket, key, uploadId, partNumber)
    return NextResponse.json({ ok: true, data: { url } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
