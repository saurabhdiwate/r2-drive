export interface R2Config {
  accountId?: string
  accessKeyId?: string
  secretAccessKey?: string
  endpoint?: string
}

export class R2ConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'R2ConfigError'
  }
}

export function getR2Config(): R2Config {
  return {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    endpoint: process.env.R2_ENDPOINT
  }
}

export function getR2Endpoint(config: R2Config = getR2Config()): string {
  if (config.endpoint) {
    return config.endpoint.replace(/\/+$/, '')
  }
  if (config.accountId) {
    return `https://${config.accountId}.r2.cloudflarestorage.com`
  }
  return ''
}

export function getMissingR2Vars(config: R2Config = getR2Config()): string[] {
  const missing: string[] = []
  if (!config.accessKeyId) missing.push('R2_ACCESS_KEY_ID')
  if (!config.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY')
  if (!config.accountId && !config.endpoint) {
    missing.push('CLOUDFLARE_ACCOUNT_ID (or R2_ENDPOINT)')
  }
  return missing
}

export function isR2Configured(config: R2Config = getR2Config()): boolean {
  return getMissingR2Vars(config).length === 0
}
