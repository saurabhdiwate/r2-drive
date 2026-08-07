import {
  S3Client
} from '@aws-sdk/client-s3'
import { getR2Config, getR2Endpoint, isR2Configured, R2ConfigError } from '@/lib/r2/config'

let cachedClient: S3Client | null = null

/**
 * Lazily create (and cache) the R2 S3 client using server-only environment
 * variables. Never call this from client components.
 */
export function getR2Client(): S3Client {
  const config = getR2Config()
  if (!isR2Configured(config)) {
    throw new R2ConfigError(
      'Cloudflare R2 is not configured. Set CLOUDFLARE_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY (and optionally R2_ENDPOINT) as server environment variables.'
    )
  }
  if (cachedClient) return cachedClient

  cachedClient = new S3Client({
    region: 'auto',
    endpoint: getR2Endpoint(config),
    credentials: {
      accessKeyId: config.accessKeyId!,
      secretAccessKey: config.secretAccessKey!
    }
  })
  return cachedClient
}

export function resetR2Client(): void {
  cachedClient = null
}
