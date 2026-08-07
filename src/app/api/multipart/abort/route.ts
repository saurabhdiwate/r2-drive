import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { abortMultipartUpload } from '@/lib/r2/multipart'
import { csrfGuard } from '@/lib/csrf'
import { toErrorResponse, badRequest } from '@/lib/api-route'

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const body = await request.json()
    const { bucket, key, uploadId } = body as {
      bucket?: string
      key?: string
      uploadId?: string
    }
    if (!bucket || !key || !uploadId) throw badRequest('Missing bucket, key or uploadId')

    await abortMultipartUpload(bucket, key, uploadId)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return toErrorResponse(error)
  }
}
