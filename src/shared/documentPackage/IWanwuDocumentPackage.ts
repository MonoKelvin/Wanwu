import type {
  PackageOpenOptions,
  PackageSaveOptions,
  PackageVerifyResult,
  WanwuDocumentManifest
} from './types'

/** 条目写入时的媒体类型元数据 */
export interface PackageEntryMeta {
  mediaType: string
  encoding?: 'utf-8' | 'binary'
}

/**
 * Wanwu 通用压缩文档包（内存模型）。
 * 业务模块通过约定路径读写条目，不耦合具体 docType 布局。
 */
export interface IWanwuDocumentPackage {
  getManifest(): WanwuDocumentManifest
  listEntryPaths(): string[]
  hasEntry(path: string): boolean
  getEntryBuffer(path: string): Buffer | null
  getEntryText(path: string): string | null
  setEntryBuffer(path: string, data: Buffer, meta?: PackageEntryMeta): void
  setEntryText(path: string, text: string, mediaType?: string): void
  setEntryJson(path: string, value: unknown): void
  deleteEntry(path: string): void
  getDirtyPaths(): string[]
  getRemovedPaths(): string[]
  isDirty(): boolean
  markAllClean(): void
  markClean(path: string): void
  rebuildManifestFromEntries(): void
  verify(): PackageVerifyResult
  materializeEntriesForWrite(options?: PackageSaveOptions): Map<string, Buffer>
  ingestRawEntry(path: string, raw: Buffer): void
  setPassword(password: string): void
  updateTitle(title: string): void
}

export interface WanwuDocumentPackageFactory {
  create(input: {
    docType: WanwuDocumentManifest['docType']
    docId: string
    title: string
  }): IWanwuDocumentPackage
  fromManifest(manifest: WanwuDocumentManifest, options?: PackageOpenOptions): IWanwuDocumentPackage
}
