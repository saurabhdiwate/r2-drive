import bcrypt from 'bcryptjs'

export const BCRYPT_COST = 12

/**
 * Hash a plain-text password using bcrypt.
 * Used by the interactive `npm run hash:password` script.
 */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST)
}

/**
 * Verify a plain-text password against a stored bcrypt hash.
 * When no hash is configured a constant dummy comparison is still performed
 * so response timing does not reveal whether APP_PASSWORD_HASH is set.
 */
export async function verifyPassword(plain: string, hash?: string): Promise<boolean> {
  if (!hash) {
    // Consume comparable work to keep timing consistent.
    await bcrypt.hash('invalid-password-placeholder', BCRYPT_COST)
    return false
  }
  return bcrypt.compare(plain, hash)
}
