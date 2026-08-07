#!/usr/bin/env node
/**
 * Generate a bcrypt hash for APP_PASSWORD_HASH.
 *
 * Usage:
 *   npm run hash:password
 *   npm run hash:password -- -- "my-super-secret-password"
 *
 * The resulting hash is printed to stdout and must be stored in the
 * APP_PASSWORD_HASH environment variable (never in the browser or repo).
 */
import bcrypt from 'bcryptjs'
import readline from 'node:readline/promises'
import { stdin, stdout } from 'node:process'

const COST = 12

async function askPassword(prompt) {
  const rl = readline.createInterface({ input: stdin, output: stdout })
  try {
    return await rl.question(prompt)
  } finally {
    rl.close()
  }
}

let password = process.argv.find((arg, i) => i > 1 && !arg.startsWith('--'))
if (!password) {
  password = await askPassword('Enter password to hash: ')
  if (!password) {
    console.error('No password provided.')
    process.exit(1)
  }
}

if (password.length < 8) {
  console.warn('Warning: the password is shorter than 8 characters. Use a longer password.')
}

const hash = await bcrypt.hash(password, COST)
console.log('')
console.log('1) For real environment variables (Docker, EasyPanel, systemd):')
console.log('   APP_PASSWORD_HASH=' + hash)
console.log('')
console.log('2) For a .env / .env.local file that Next.js reads (every $ must be escaped):')
console.log("   APP_PASSWORD_HASH='" + hash.replace(/\$/g, '\\$') + "'")
