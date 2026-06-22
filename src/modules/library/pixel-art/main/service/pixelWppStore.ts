import { existsSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { ensureDirSync } from '@shared/lib/fsEnsure'
import { extractZipToDir } from '@shared/documentPackage/node'
import { createTempWfgPath, publishTempWfgFile } from '@modules/library/diagrams/main/service/diagramWfgFs'
import type { PixelDocument, PixelWritePatch } from '@modules/library/pixel-art/domain/types'
import { createBlankPixelDocument } from '@modules/library/pixel-art/lib/blankDocument'
import {
  findPixelWppPath,
  isExternalPixelContentPath,
  pixelContentDir,
  pixelWorkDir,
  relativePixelWppPath,
  resolveStoredPixelWppPath
} from '@modules/library/pixel-art/main/pixelPaths'
import { isPixelPackageLayoutDir, WppPixelDocument } from '@modules/library/pixel-art/main/service/wppPixelDocument'

const wppPathByFileId = new Map<string, string>()

export function registerPixelWppPath(fileId: string, contentPath: string, mediaDir: string): void {
  wppPathByFileId.set(fileId, resolveStoredPixelWppPath(mediaDir, contentPath))
}

export function unregisterPixelWppPath(fileId: string): void {
  wppPathByFileId.delete(fileId)
}

function locatePixelWppPath(mediaDir: string, fileId: string, contentPath: string): string | null {
  const resolved = resolveStoredPixelWppPath(mediaDir, contentPath)
  if (existsSync(resolved)) {
    wppPathByFileId.set(fileId, resolved)
    return resolved
  }
  const cached = wppPathByFileId.get(fileId)
  if (cached && existsSync(cached)) return cached
  if (!isExternalPixelContentPath(contentPath)) {
    return findPixelWppPath(mediaDir, fileId)
  }
  return null
}

function resetWorkDir(workDir: string): void {
  if (existsSync(workDir)) rmSync(workDir, { recursive: true, force: true })
  ensureDirSync(workDir)
}

async function syncWorkFromWpp(fileId: string, wppPath: string): Promise<string> {
  const workDir = pixelWorkDir(fileId)
  const mtime = statSync(wppPath).mtimeMs
  const stampPath = join(workDir, '.source-mtime')
  const cached = existsSync(stampPath) ? Number(readFileSync(stampPath, 'utf8')) : -1
  if (!isPixelPackageLayoutDir(workDir) || cached !== mtime) {
    resetWorkDir(workDir)
    await extractZipToDir(wppPath, workDir)
    writeFileSync(stampPath, String(mtime))
  }
  return workDir
}

async function openWorkDocument(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  title?: string
): Promise<{ workDir: string; doc: WppPixelDocument } | null> {
  const wppPath = locatePixelWppPath(mediaDir, fileId, contentPath)
  if (wppPath) {
    const workDir = await syncWorkFromWpp(fileId, wppPath)
    return { workDir, doc: WppPixelDocument.openFolder(fileId, workDir) }
  }
  if (isExternalPixelContentPath(contentPath)) return null
  return null
}

async function commitStorageAsWpp(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  doc: WppPixelDocument
): Promise<string> {
  const wppPath = resolveStoredPixelWppPath(mediaDir, contentPath)
  ensureDirSync(join(wppPath, '..'))
  const tempWpp = createTempWfgPath().replace('.wfg.tmp', '.wpp.tmp')
  try {
    await doc.exportWpp(tempWpp)
    await publishTempWfgFile(tempWpp, wppPath)
  } finally {
    if (existsSync(tempWpp)) rmSync(tempWpp, { force: true })
  }
  if (!isExternalPixelContentPath(contentPath)) {
    const storageDir = pixelContentDir(mediaDir, fileId)
    if (existsSync(storageDir)) {
      for (const name of readdirSync(storageDir)) {
        const full = join(storageDir, name)
        if (full === wppPath) continue
        rmSync(full, { recursive: true, force: true })
      }
    }
  }
  wppPathByFileId.set(fileId, wppPath)
  return wppPath
}

export async function ensurePixelWppFile(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  title: string
): Promise<string | null> {
  const existing = locatePixelWppPath(mediaDir, fileId, contentPath)
  if (existing) return existing
  const doc = WppPixelDocument.create(fileId, title, createBlankPixelDocument(32, 32, title))
  const workDir = pixelWorkDir(fileId)
  resetWorkDir(workDir)
  doc.saveFolder(workDir)
  await commitStorageAsWpp(mediaDir, fileId, contentPath, doc)
  return locatePixelWppPath(mediaDir, fileId, contentPath)
}

export async function readPixelContent(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  title?: string
): Promise<PixelDocument | null> {
  const opened = await openWorkDocument(mediaDir, fileId, contentPath, title)
  if (!opened) return null
  return opened.doc.readContent()
}

export async function writePixelContent(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  content: PixelDocument
): Promise<void> {
  let opened = await openWorkDocument(mediaDir, fileId, contentPath, content.meta.title)
  if (!opened) {
    const workDir = pixelWorkDir(fileId)
    resetWorkDir(workDir)
    const doc = WppPixelDocument.create(fileId, content.meta.title, content)
    doc.saveFolder(workDir)
    opened = { workDir, doc }
  } else {
    opened.doc.replaceContent(content)
    opened.doc.saveFolder(opened.workDir)
  }
  await commitStorageAsWpp(mediaDir, fileId, contentPath, opened.doc)
}

export async function writePixelContentPatch(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  content: PixelDocument,
  patch: PixelWritePatch
): Promise<void> {
  const opened = await openWorkDocument(mediaDir, fileId, contentPath, content.meta.title)
  if (!opened) {
    await writePixelContent(mediaDir, fileId, contentPath, content)
    return
  }
  const { width, height } = content.meta
  if (patch.meta) opened.doc.writeMeta(patch.meta)
  for (const layerId of patch.dirtyLayerIds) {
    const pixels = content.layerPixels[layerId]
    if (pixels) opened.doc.writeLayer(layerId, pixels, width, height)
  }
  const frame = content.frames[0]
  if (frame) opened.doc.writeFrame(frame)
  opened.doc.flushDirtyToFolder(opened.workDir)
  await commitStorageAsWpp(mediaDir, fileId, contentPath, opened.doc)
}

export { relativePixelWppPath }
