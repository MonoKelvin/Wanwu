import { createCipheriv, createDecipheriv, pbkdf2Sync, randomBytes } from 'node:crypto'
import type { PackageEncryptionMeta } from '@shared/documentPackage'

const ALGORITHM = 'aes-256-gcm' as const
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32
const DEFAULT_ITERATIONS = 120_000

export interface EncryptedEntryPayload {
  iv: string
  authTag: string
  ciphertext: string
}

export function createEncryptionMeta(password: string): PackageEncryptionMeta {
  return {
    enabled: true,
    algorithm: 'aes-256-gcm',
    kdf: 'pbkdf2-sha256',
    iterations: DEFAULT_ITERATIONS,
    salt: randomBytes(16).toString('base64')
  }
}

export function deriveKey(password: string, meta: PackageEncryptionMeta): Buffer {
  if (!meta.salt || !meta.iterations) {
    throw new Error('加密元数据缺少 salt 或 iterations')
  }
  const salt = Buffer.from(meta.salt, 'base64')
  return pbkdf2Sync(password, salt, meta.iterations, KEY_LENGTH, 'sha256')
}

export function encryptEntry(data: Buffer, password: string, meta: PackageEncryptionMeta): Buffer {
  const key = deriveKey(password, meta)
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()])
  const authTag = cipher.getAuthTag()
  const payload: EncryptedEntryPayload = {
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    ciphertext: encrypted.toString('base64')
  }
  return Buffer.from(JSON.stringify(payload), 'utf-8')
}

export function decryptEntry(data: Buffer, password: string, meta: PackageEncryptionMeta): Buffer {
  const payload = JSON.parse(data.toString('utf-8')) as EncryptedEntryPayload
  const key = deriveKey(password, meta)
  const iv = Buffer.from(payload.iv, 'base64')
  const authTag = Buffer.from(payload.authTag, 'base64')
  const ciphertext = Buffer.from(payload.ciphertext, 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)
  return Buffer.concat([decipher.update(ciphertext), decipher.final()])
}

export function isEncryptionEnabled(meta: PackageEncryptionMeta): boolean {
  return meta.enabled && meta.algorithm === 'aes-256-gcm'
}
