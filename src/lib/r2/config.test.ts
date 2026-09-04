import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getR2Config,
  getR2Endpoint,
  getMissingR2Vars,
  isR2Configured,
  R2ConfigError
} from '@/lib/r2/config'

describe('R2ConfigError', () => {
  it('has correct name', () => {
    const error = new R2ConfigError('test')
    expect(error.name).toBe('R2ConfigError')
    expect(error.message).toBe('test')
  })
})

describe('getR2Config', () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('reads environment variables', () => {
    process.env.CLOUDFLARE_ACCOUNT_ID = 'test-account'
    process.env.R2_ACCESS_KEY_ID = 'test-key'
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret'
    process.env.R2_ENDPOINT = 'https://custom.endpoint.com'

    const config = getR2Config()
    expect(config.accountId).toBe('test-account')
    expect(config.accessKeyId).toBe('test-key')
    expect(config.secretAccessKey).toBe('test-secret')
    expect(config.endpoint).toBe('https://custom.endpoint.com')
  })

  it('returns undefined for missing variables', () => {
    delete process.env.CLOUDFLARE_ACCOUNT_ID
    delete process.env.R2_ACCESS_KEY_ID
    delete process.env.R2_SECRET_ACCESS_KEY
    delete process.env.R2_ENDPOINT

    const config = getR2Config()
    expect(config.accountId).toBeUndefined()
    expect(config.accessKeyId).toBeUndefined()
    expect(config.secretAccessKey).toBeUndefined()
    expect(config.endpoint).toBeUndefined()
  })
})

describe('getR2Endpoint', () => {
  it('returns custom endpoint when set', () => {
    const config = { endpoint: 'https://custom.r2.dev' }
    expect(getR2Endpoint(config)).toBe('https://custom.r2.dev')
  })

  it('strips trailing slashes from custom endpoint', () => {
    const config = { endpoint: 'https://custom.r2.dev///' }
    expect(getR2Endpoint(config)).toBe('https://custom.r2.dev')
  })

  it('derives endpoint from account ID', () => {
    const config = { accountId: 'abc123' }
    expect(getR2Endpoint(config)).toBe('https://abc123.r2.cloudflarestorage.com')
  })

  it('returns empty string when no config', () => {
    expect(getR2Endpoint({})).toBe('')
  })
})

describe('getMissingR2Vars', () => {
  it('returns empty when all vars present', () => {
    const config = {
      accountId: 'abc',
      accessKeyId: 'key',
      secretAccessKey: 'secret'
    }
    expect(getMissingR2Vars(config)).toEqual([])
  })

  it('reports missing access key', () => {
    const config = {
      accountId: 'abc',
      secretAccessKey: 'secret'
    }
    expect(getMissingR2Vars(config)).toContain('R2_ACCESS_KEY_ID')
  })

  it('reports missing secret key', () => {
    const config = {
      accountId: 'abc',
      accessKeyId: 'key'
    }
    expect(getMissingR2Vars(config)).toContain('R2_SECRET_ACCESS_KEY')
  })

  it('reports missing account ID when no endpoint', () => {
    const config = {
      accessKeyId: 'key',
      secretAccessKey: 'secret'
    }
    expect(getMissingR2Vars(config)).toContain('CLOUDFLARE_ACCOUNT_ID (or R2_ENDPOINT)')
  })

  it('does not require account ID when endpoint is set', () => {
    const config = {
      accessKeyId: 'key',
      secretAccessKey: 'secret',
      endpoint: 'https://custom.r2.dev'
    }
    expect(getMissingR2Vars(config)).toEqual([])
  })
})

describe('isR2Configured', () => {
  it('returns true when all vars present', () => {
    const config = {
      accountId: 'abc',
      accessKeyId: 'key',
      secretAccessKey: 'secret'
    }
    expect(isR2Configured(config)).toBe(true)
  })

  it('returns false when vars missing', () => {
    const config = {}
    expect(isR2Configured(config)).toBe(false)
  })
})
