import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import {
  abortExistingUploadForKey,
  createMultipartUpload
} from '@/lib/r2/multipart'
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
    const { bucket, key, contentType } = body as {
      bucket?: string
      key?: string
      contentType?: string
    }
    if (!bucket || !key) throw badRequest('Missing bucket or key')
    assertSafeKey(key)

    // Avoid collisions with abandoned uploads for the same key.
    await abortExistingUploadForKey(bucket, key).catch(() => undefined)

    const { uploadId } = await createMultipartUpload(bucket, key, contentType)
    return NextResponse.json({ ok: true, data: { uploadId } })
  } catch (error) {
    return toErrorResponse(error)
  }
}
