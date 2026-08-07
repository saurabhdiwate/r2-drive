import { testConnection } from '@/lib/r2/buckets'
import { isR2Configured } from '@/lib/r2/config'

let cachedHealthyAt = 0
let cachedHealthy = false

/**
 * Connection health with a short cache so health checks do not hammer R2.
 */
export async function getR2Health(): Promise<boolean> {
  const now = Date.now()
  if (now - cachedHealthyAt < 30_000) return cachedHealthy
  if (!isR2Configured()) return false
  const result = await testConnection().catch(() => ({ ok: false as const }))
  cachedHealthyAt = now
  cachedHealthy = result.ok
  return result.ok
}
