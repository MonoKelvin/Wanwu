import {
  MANIFEST_ENTRY_PATH,
  MIME_JSON,
  MIME_OCTET,
  buildEntryManifest,
  createEmptyManifest,
  normalizeEntryPath,
  parseManifestJson,
  removeManifestEntry,
  serializeManifest,
  upsertManifestEntry,
  verifyManifestAgainstEntries,
  type PackageOpenOptions,
  type PackageSaveOptions,
  type PackageVerifyResult,
  type WanwuDocumentManifest
} from '@shared/documentPackage'
import { decryptEntry, encryptEntry, isEncryptionEnabled } from './crypto'
import { sha256Hex } from './hash'

export interface PackageEntryMeta {
  mediaType: string
  encoding?: 'utf-8' | 'binary'
}

export class WanwuDocumentPackage {
  private manifest: WanwuDocumentManifest
  private readonly entries = new Map<string, Buffer>()
  private readonly dirty = new Set<string>()
  private readonly removed = new Set<string>()
  private manifestDirty = false
  private password: string | undefined

  private constructor(manifest: WanwuDocumentManifest, password?: string) {
    this.manifest = manifest
    this.password = password
  }

  static create(input: {
    docType: WanwuDocumentManifest['docType']
    docId: string
    title: string
  }): WanwuDocumentPackage {
    return new WanwuDocumentPackage(createEmptyManifest(input))
  }

  static fromManifest(manifest: WanwuDocumentManifest, options?: PackageOpenOptions): WanwuDocumentPackage {
    const pkg = new WanwuDocumentPackage(manifest, options?.password)
    if (isEncryptionEnabled(manifest.encryption) && !options?.password) {
      throw new Error('文档已加密，需要密码')
    }
    return pkg
  }

  getManifest(): WanwuDocumentManifest {
    return this.manifest
  }

  listEntryPaths(): string[] {
    return [...this.entries.keys()].sort()
  }

  hasEntry(path: string): boolean {
    return this.entries.has(normalizeEntryPath(path))
  }

  getEntryBuffer(path: string): Buffer | null {
    return this.entries.get(normalizeEntryPath(path)) ?? null
  }

  getEntryText(path: string): string | null {
    const buf = this.getEntryBuffer(path)
    return buf ? buf.toString('utf-8') : null
  }

  setEntryBuffer(path: string, data: Buffer, meta: PackageEntryMeta = { mediaType: MIME_OCTET }): void {
    const normalized = normalizeEntryPath(path)
    if (normalized === MANIFEST_ENTRY_PATH) {
      throw new Error('请使用 setManifest 更新 manifest')
    }
    this.entries.set(normalized, Buffer.from(data))
    this.dirty.add(normalized)
    this.manifest = upsertManifestEntry(
      this.manifest,
      buildEntryManifest({
        path: normalized,
        mediaType: meta.mediaType,
        size: data.length,
        sha256: sha256Hex(data),
        encoding: meta.encoding,
        encrypted: isEncryptionEnabled(this.manifest.encryption)
      })
    )
    this.manifestDirty = true
  }

  setEntryText(path: string, text: string, mediaType = MIME_JSON): void {
    this.setEntryBuffer(path, Buffer.from(text, 'utf-8'), {
      mediaType,
      encoding: 'utf-8'
    })
  }

  setEntryJson(path: string, value: unknown): void {
    this.setEntryText(path, `${JSON.stringify(value, null, 2)}\n`)
  }

  deleteEntry(path: string): void {
    const normalized = normalizeEntryPath(path)
    if (!this.entries.delete(normalized)) return
    this.dirty.delete(normalized)
    this.removed.add(normalized)
    this.manifest = removeManifestEntry(this.manifest, normalized)
    this.manifestDirty = true
  }

  getDirtyPaths(): string[] {
    return [...this.dirty]
  }

  getRemovedPaths(): string[] {
    return [...this.removed]
  }

  isDirty(): boolean {
    return this.dirty.size > 0 || this.removed.size > 0 || this.manifestDirty
  }

  markAllClean(): void {
    this.dirty.clear()
    this.removed.clear()
    this.manifestDirty = false
  }

  markClean(path: string): void {
    const normalized = normalizeEntryPath(path)
    this.dirty.delete(normalized)
    this.removed.delete(normalized)
    if (normalized === MANIFEST_ENTRY_PATH) this.manifestDirty = false
    if (this.dirty.size === 0 && this.removed.size === 0) this.manifestDirty = false
  }

  rebuildManifestFromEntries(): void {
    let manifest = {
      ...this.manifest,
      modifiedAt: new Date().toISOString(),
      entries: [] as WanwuDocumentManifest['entries']
    }
    for (const [path, data] of this.entries) {
      if (path === MANIFEST_ENTRY_PATH) continue
      manifest = upsertManifestEntry(
        manifest,
        buildEntryManifest({
          path,
          mediaType: MIME_OCTET,
          size: data.length,
          sha256: sha256Hex(data)
        })
      )
    }
    this.manifest = manifest
    this.manifestDirty = true
  }

  verify(): PackageVerifyResult {
    const map = new Map<string, { size: number; sha256: string }>()
    for (const [path, data] of this.entries) {
      if (path === MANIFEST_ENTRY_PATH) continue
      map.set(path, { size: data.length, sha256: sha256Hex(data) })
    }
    return verifyManifestAgainstEntries(this.manifest, map)
  }

  /** 将内存条目序列化为可写入 zip / 目录的明文或加密 buffer */
  materializeEntriesForWrite(options?: PackageSaveOptions): Map<string, Buffer> {
    const password = options?.password ?? this.password
    const encrypt = isEncryptionEnabled(this.manifest.encryption)
    if (encrypt && !password) {
      throw new Error('保存加密文档需要密码')
    }

    const out = new Map<string, Buffer>()
    for (const [path, data] of this.entries) {
      if (path === MANIFEST_ENTRY_PATH) continue
      out.set(path, encrypt ? encryptEntry(data, password!, this.manifest.encryption) : data)
    }

    const manifest = serializeManifest(this.manifest)
    out.set(MANIFEST_ENTRY_PATH, Buffer.from(manifest, 'utf-8'))
    return out
  }

  /** 从磁盘或 zip 读出的条目灌入内存（自动解密） */
  ingestRawEntry(path: string, raw: Buffer): void {
    const normalized = normalizeEntryPath(path)
    if (normalized === MANIFEST_ENTRY_PATH) {
      this.manifest = parseManifestJson(raw.toString('utf-8'))
      if (isEncryptionEnabled(this.manifest.encryption) && !this.password) {
        throw new Error('文档已加密，需要密码')
      }
      return
    }

    let data = raw
    if (isEncryptionEnabled(this.manifest.encryption)) {
      if (!this.password) throw new Error('文档已加密，需要密码')
      data = decryptEntry(raw, this.password, this.manifest.encryption)
    }
    this.entries.set(normalized, data)
  }

  setPassword(password: string): void {
    this.password = password
  }

  updateTitle(title: string): void {
    if (this.manifest.title === title) return
    this.manifest = { ...this.manifest, title, modifiedAt: new Date().toISOString() }
    this.manifestDirty = true
  }
}
