import type { WANWU_DOCUMENT_PACKAGE_FORMAT } from './constants'

export type WanwuDocType = 'flow-graph' | 'generic'

export type PackageEncryptionAlgorithm = 'none' | 'aes-256-gcm'

export interface PackageEncryptionMeta {
  enabled: boolean
  algorithm: PackageEncryptionAlgorithm
  kdf?: 'pbkdf2-sha256'
  iterations?: number
  /** PBKDF2 salt（base64） */
  salt?: string
}

export interface PackageEntryManifest {
  /** zip 内相对路径，POSIX，无前导斜杠 */
  path: string
  mediaType: string
  size: number
  sha256: string
  encoding?: 'utf-8' | 'binary'
  encrypted?: boolean
}

export interface WanwuDocumentManifest {
  format: typeof WANWU_DOCUMENT_PACKAGE_FORMAT
  formatVersion: number
  docType: WanwuDocType
  docId: string
  title: string
  createdAt: string
  modifiedAt: string
  encryption: PackageEncryptionMeta
  entries: PackageEntryManifest[]
}

export interface PackageVerifyIssue {
  path: string
  code: 'missing' | 'size_mismatch' | 'hash_mismatch' | 'manifest_orphan'
  message: string
}

export interface PackageVerifyResult {
  ok: boolean
  issues: PackageVerifyIssue[]
}

export interface PackageOpenOptions {
  password?: string
}

export interface PackageSaveOptions {
  password?: string
}
