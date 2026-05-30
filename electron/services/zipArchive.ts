/**
 * archiver v8 的 ZipArchive 包装（@types/archiver 仍为 v7，无 ZipArchive 命名导出类型）。
 */
import { ZipArchive as ZipArchiveImpl } from 'archiver'
import type { Writable } from 'stream'
import type { ZlibOptions } from 'zlib'

export interface ZipArchiveEntry {
  name?: string
}

export type ZipArchiveHandle = {
  pipe<T extends Writable>(destination: T): T
  file(filepath: string, data?: { name?: string }): ZipArchiveHandle
  finalize(): Promise<void>
  on(event: 'error', listener: (err: Error) => void): ZipArchiveHandle
  on(event: 'entry', listener: (entry: ZipArchiveEntry) => void): ZipArchiveHandle
}

export const ZipArchive = ZipArchiveImpl as new (options?: { zlib?: ZlibOptions }) => ZipArchiveHandle
