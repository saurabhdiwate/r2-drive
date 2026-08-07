import { NextRequest, NextResponse } from 'next/server'

/**
 * Validate the Origin/Host of a state-changing request as a CSRF defense
 * in depth measure (primary defense is SameSite=Lax cookies).
 */
export function validateSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')
  if (!host) return false
  if (!origin) {
    // Some same-origin clients (e.g. curl, health checks) omit Origin.
    return true
  }
  let originHost: string
  try {
    originHost = new URL(origin).host
  } catch {
    return false
  }
  return originHost === host
}

export function csrfGuard(request: NextRequest): NextResponse | null {
  if (!validateSameOrigin(request)) {
    return NextResponse.json(
      { error: 'Cross-site request rejected' },
      { status: 403 }
    )
  }
  return null
}
