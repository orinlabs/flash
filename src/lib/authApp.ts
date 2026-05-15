import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

const ALLOWED_DOMAIN = 'orinlabs.ai'

export function normalizeAppEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export function assertOrinlabsEmail(email: string): void {
  const normalized = normalizeAppEmail(email)
  const parts = normalized.split('@')
  if (parts.length !== 2 || parts[0].length === 0) {
    throw new Error('Invalid email address')
  }
  if (parts[1] !== ALLOWED_DOMAIN) {
    throw new Error('Only @orinlabs.ai accounts can sign in')
  }
}

export function sha256Hex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex')
}

export function secureCompareHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex')
    const bb = Buffer.from(b, 'hex')
    if (ba.length !== bb.length) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

export function randomSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function randomLoginCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0')
}
