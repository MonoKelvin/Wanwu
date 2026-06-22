import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { nativeImage } from 'electron'
import { MANIFEST_ENTRY_PATH } from '@shared/documentPackage'
import type { IWanwuDocumentPackage } from '@shared/documentPackage'
import {
  WanwuDocumentPackage,
  openPackageFromFolder,
  openPackageFromZip,
  saveAllEntriesToFolder,
  saveDirtyEntriesToFolder,
  savePackageToZip
} from '@shared/documentPackage/node'
import { PIXEL_ART_DOC_TYPE } from '@modules/library/pixel-art/domain/meta'
import { PIXEL_PACKAGE_PATHS } from '@modules/library/pixel-art/domain/meta'
import type {
  PixelDocument,
  PixelFrame,
  WppFrameFile,
  WppMetaFile
} from '@modules/library/pixel-art/domain/types'

function rgbaToPngBuffer(rgba: Uint8ClampedArray, width: number, height: number): Buffer {
  const bgra = Buffer.alloc(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    bgra[i * 4] = rgba[i * 4 + 2]!
    bgra[i * 4 + 1] = rgba[i * 4 + 1]!
    bgra[i * 4 + 2] = rgba[i * 4]!
    bgra[i * 4 + 3] = rgba[i * 4 + 3]!
  }
  return nativeImage.createFromBitmap(bgra, { width, height }).toPNG()
}

function pngBufferToRgba(png: Buffer, width: number, height: number): Uint8ClampedArray {
  const img = nativeImage.createFromBuffer(png)
  const size = img.getSize()
  if (size.width !== width || size.height !== height) {
    const resized = img.resize({ width, height })
    return bitmapToRgba(resized.toBitmap(), width, height)
  }
  return bitmapToRgba(img.toBitmap(), width, height)
}

function bitmapToRgba(bitmap: Buffer, width: number, height: number): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    rgba[i * 4] = bitmap[i * 4 + 2]!
    rgba[i * 4 + 1] = bitmap[i * 4 + 1]!
    rgba[i * 4 + 2] = bitmap[i * 4]!
    rgba[i * 4 + 3] = bitmap[i * 4 + 3]!
  }
  return rgba
}

export function isPixelPackageLayoutDir(dir: string): boolean {
  return existsSync(join(dir, MANIFEST_ENTRY_PATH))
}

function toMetaFile(doc: PixelDocument): WppMetaFile {
  return { ...doc.meta }
}

function serializeFrame(frame: PixelFrame): WppFrameFile {
  return {
    id: frame.id,
    name: frame.name,
    sortOrder: frame.sortOrder,
    durationMs: frame.durationMs,
    layerOrder: [...frame.layerOrder],
    layers: frame.layers.map((l) => ({ ...l }))
  }
}

export class WppPixelDocument {
  private constructor(
    readonly fileId: string,
    private readonly pkg: IWanwuDocumentPackage
  ) {}

  static openFolder(fileId: string, dir: string): WppPixelDocument {
    return new WppPixelDocument(fileId, openPackageFromFolder(dir))
  }

  static create(fileId: string, title: string, content?: PixelDocument): WppPixelDocument {
    const pkg = WanwuDocumentPackage.create({
      docType: PIXEL_ART_DOC_TYPE,
      docId: fileId,
      title: content?.meta.title ?? title
    })
    const doc = new WppPixelDocument(fileId, pkg)
    if (content) doc.replaceContent(content)
    return doc
  }

  static async openWpp(fileId: string, wppPath: string): Promise<WppPixelDocument> {
    const pkg = await openPackageFromZip(wppPath)
    return new WppPixelDocument(fileId, pkg)
  }

  readContent(): PixelDocument {
    const metaText = this.pkg.getEntryText(PIXEL_PACKAGE_PATHS.meta)
    if (!metaText) throw new Error('像素包缺少 content/meta.json')
    const meta = JSON.parse(metaText) as WppMetaFile
    const frames: PixelFrame[] = []
    for (const path of this.pkg.listEntryPaths()) {
      if (!path.startsWith('content/frames/') || !path.endsWith('.json')) continue
      const text = this.pkg.getEntryText(path)
      if (!text) continue
      const frameFile = JSON.parse(text) as WppFrameFile
      frames.push({
        id: frameFile.id,
        name: frameFile.name,
        sortOrder: frameFile.sortOrder,
        durationMs: frameFile.durationMs,
        layerOrder: [...frameFile.layerOrder],
        layers: frameFile.layers.map((l) => ({ ...l }))
      })
    }
    frames.sort((a, b) => a.sortOrder - b.sortOrder)

    const layerPixels: Record<string, Uint8ClampedArray> = {}
    for (const path of this.pkg.listEntryPaths()) {
      if (!path.startsWith('content/layers/') || !path.endsWith('.png')) continue
      const layerId = path.slice('content/layers/'.length, -'.png'.length)
      const buf = this.pkg.getEntryBuffer(path)
      if (!buf) continue
      layerPixels[layerId] = pngBufferToRgba(buf, meta.width, meta.height)
    }

    return {
      format: 'wanwu-pixel',
      formatVersion: 1,
      meta,
      frames,
      layerPixels
    }
  }

  replaceContent(content: PixelDocument): void {
    this.pkg.setEntryJson(PIXEL_PACKAGE_PATHS.meta, toMetaFile(content))
    const existingFrames = new Set(
      this.pkg
        .listEntryPaths()
        .filter((p) => p.startsWith('content/frames/') && p.endsWith('.json'))
    )
    const existingLayers = new Set(
      this.pkg
        .listEntryPaths()
        .filter((p) => p.startsWith('content/layers/') && p.endsWith('.png'))
    )

    for (const frame of content.frames) {
      const path = PIXEL_PACKAGE_PATHS.frame(frame.id)
      existingFrames.delete(path)
      this.pkg.setEntryJson(path, serializeFrame(frame))
    }
    for (const orphan of existingFrames) this.pkg.deleteEntry(orphan)

    const { width, height } = content.meta
    for (const [layerId, pixels] of Object.entries(content.layerPixels)) {
      const path = PIXEL_PACKAGE_PATHS.layer(layerId)
      existingLayers.delete(path)
      this.pkg.setEntryBuffer(path, rgbaToPngBuffer(pixels, width, height), {
        mediaType: 'image/png'
      })
    }
    for (const orphan of existingLayers) this.pkg.deleteEntry(orphan)
    this.pkg.updateTitle(content.meta.title)
  }

  writeLayer(layerId: string, pixels: Uint8ClampedArray, width: number, height: number): void {
    this.pkg.setEntryBuffer(
      PIXEL_PACKAGE_PATHS.layer(layerId),
      rgbaToPngBuffer(pixels, width, height),
      { mediaType: 'image/png' }
    )
  }

  writeMeta(partial: Partial<WppMetaFile>): void {
    const metaText = this.pkg.getEntryText(PIXEL_PACKAGE_PATHS.meta)
    const base: WppMetaFile = metaText
      ? (JSON.parse(metaText) as WppMetaFile)
      : {
          format: 'wanwu-pixel',
          formatVersion: 1,
          title: this.pkg.getManifest().title,
          width: 32,
          height: 32,
          background: 'transparent',
          defaultFrameId: 'frame-0',
          activeLayerId: '',
          foreground: '#FF6B6B',
          backgroundColor: '#4ECDC4',
          palette: [],
          grid: { visible: true, size: 1 },
          checkerboard: { visible: true }
        }
    this.pkg.setEntryJson(PIXEL_PACKAGE_PATHS.meta, { ...base, ...partial })
    if (partial.title) this.pkg.updateTitle(partial.title)
  }

  writeFrame(frame: PixelFrame): void {
    this.pkg.setEntryJson(PIXEL_PACKAGE_PATHS.frame(frame.id), serializeFrame(frame))
  }

  flushDirtyToFolder(dir: string): void {
    saveDirtyEntriesToFolder(dir, this.pkg)
  }

  saveFolder(dir: string): void {
    saveAllEntriesToFolder(dir, this.pkg)
  }

  async exportWpp(wppPath: string): Promise<void> {
    await savePackageToZip(wppPath, this.pkg)
  }

  getPackage(): IWanwuDocumentPackage {
    return this.pkg
  }
}
