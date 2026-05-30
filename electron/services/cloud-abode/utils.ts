import { randomBytes, scryptSync, timingSafeEqual } from 'crypto'

const PASSWORD_SALT_LEN = 16
const PASSWORD_KEY_LEN = 32

export function luhnValid(cardNumber: string): boolean {
  const digits = cardNumber.replace(/\D/g, '')
  if (digits.length < 13 || digits.length > 19) return false
  let sum = 0
  let alt = false
  for (let i = digits.length - 1; i >= 0; i--) {
    let n = parseInt(digits[i]!, 10)
    if (alt) {
      n *= 2
      if (n > 9) n -= 9
    }
    sum += n
    alt = !alt
  }
  return sum % 10 === 0
}

export function maskCardNumber(cardNumber: string): string {
  const digits = cardNumber.replace(/\D/g, '')
  const last4 = digits.slice(-4)
  return `****${last4}`
}

export function hashPaymentPassword(password: string): string {
  const salt = randomBytes(PASSWORD_SALT_LEN)
  const hash = scryptSync(password, salt, PASSWORD_KEY_LEN)
  return `${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPaymentPassword(password: string, stored: string): boolean {
  const [saltHex, hashHex] = stored.split(':')
  if (!saltHex || !hashHex) return false
  const salt = Buffer.from(saltHex, 'hex')
  const expected = Buffer.from(hashHex, 'hex')
  const actual = scryptSync(password, salt, expected.length)
  if (actual.length !== expected.length) return false
  return timingSafeEqual(actual, expected)
}

export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10)
}
