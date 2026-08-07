import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/guard'
import { completeMultipartUpload } from '@/lib/r2/multipart'
import { csrfGuard } from '@/lib/csrf'
import { toErrorResponse, badRequest } from '@/lib/api-route'

export async function POST(request: NextRequest) {
  const csrf = csrfGuard(request)
  if (csrf) return csrf

  const guarded = requireApiSession(request)
  if ('response' in guarded) return guarded.response

  try {
    const body = await request.json()
    const { bucket, key, uploadId, parts } = body as {
      bucket?: string
      key?: string
      uploadId?: string
      parts?: { PartNumber?: number; ETag?: string }[]
    }
    if (!bucket || !key || !uploadId) throw badRequest('Missing bucket, key or uploadId')
    if (!Array.isArray(parts) || parts.length === 0) {
      throw badRequest('Missing completed parts')
    }
    if (parts.some((p) => !p.ETag || typeof p.PartNumber !== 'number')) {
      throw badRequest('Invalid parts payload')
    }

    const result = await completeMultipartUpload(
      bucket,
      key,
      uploadId,
      parts.map((p) => ({ partNumber: p.PartNumber as number, etag: p.ETag as string, size: 0, uploaded: true }))
    )
    return NextResponse.json({ ok: true, data: result })
  } catch (error) {
    return toErrorResponse(error)
  }
}
