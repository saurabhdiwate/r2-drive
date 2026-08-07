#!/usr/bin/env node
/**
 * Generate a random secret for SESSION_SECRET.
 *
 * Usage:
 *   npm run gen:secret
 *
 * The generated secret is printed to stdout and must be stored in the
 * SESSION_SECRET environment variable (never in the browser or repo).
 * Rotate it to invalidate all existing sessions.
 */
import crypto from 'node:crypto'

const secret = crypto.randomBytes(48).toString('base64')
console.log('Copy this value into your SESSION_SECRET environment variable:')
console.log('')
console.log(secret)
