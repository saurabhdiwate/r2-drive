import { NextResponse } from 'next/server'
import { getAuthConfigStatus } from '@/lib/auth/guard'
import { isR2Configured } from '@/lib/r2/config'
import { getR2Health } from '@/lib/r2/health'

export const dynamic = 'force-dynamic'

/**
 * Liveness / readiness endpoint used by Docker and EasyPanel health checks.
 * Returns only boolean configuration status — never secret values.
 */
export async function GET() {
  const auth = getAuthConfigStatus()
  const r2Healthy = await getR2Health()

  return NextResponse.json({
    status: 'ok',
    time: new Date().toISOString(),
    authConfigured: auth.configured,
    r2Configured: isR2Configured(),
    r2Healthy
  })
}
