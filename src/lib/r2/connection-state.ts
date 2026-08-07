import { testConnection } from '@/lib/r2/buckets'
import type { ConnectionStatus } from '@/lib/types'
import {
  getMissingR2Vars,
  getR2Config,
  getR2Endpoint,
  isR2Configured
} from '@/lib/r2/config'

interface ConnectionTestResult {
  ok: boolean
  bucketCount: number
  error?: string
}

let lastTested: string | undefined
let lastResult: ConnectionTestResult | null = null

export async function runConnectionTest(): Promise<ConnectionTestResult> {
  const result = await testConnection()
  lastTested = new Date().toISOString()
  lastResult = result
  return result
}

export function getConnectionStatus(): ConnectionStatus {
  const config = getR2Config()
  const missing = getMissingR2Vars(config)
  const configured = isR2Configured(config)

  return {
    configured,
    valid: configured && lastResult?.ok === true,
    error: configured ? lastResult?.error : undefined,
    bucketCount: configured ? (lastResult?.bucketCount ?? 0) : 0,
    lastTested,
    endpoint: getR2Endpoint(config),
    missing
  }
}
