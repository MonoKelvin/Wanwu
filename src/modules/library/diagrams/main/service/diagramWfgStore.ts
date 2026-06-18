/**
 * 流程图库内存储：每个文档仅落盘一个 .wfg 压缩包。
 * 编辑在系统临时目录解压工作，提交时整目录只保留 .wfg。
 */
import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync
} from 'node:fs'
import { ensureDirSync } from '@shared/lib/fsEnsure'
import {
  createTempWfgPath,
  publishTempWfgFile
} from './diagramWfgFs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import type { DiagramContent, DiagramWritePatch } from '@modules/library/diagrams/domain/types'
import { extractZipToDir } from '@shared/documentPackage/node'
import {
  diagramContentDir,
  findDiagramWfgPath,
  isExternalDiagramContentPath,
  relativeDiagramWfgPath,
  resolveStoredDiagramWfgPath
} from './diagramWfgPaths'
import {
  isPackageLayoutDir,
  WfgDiagramDocument,
  diagramContentFromLegacy
} from './wfgDiagramDocument'
import {
  extractInlineImageAssets,
  materializeGraphInlineAssets
} from '@modules/library/diagrams/lib/diagramInlineAssets'

function diagramWorkDir(fileId: string): string {
  return join(tmpdir(), 'wanwu-diagram-work', fileId)
}

const wfgPathByFileId = new Map<string, string>()

export function registerDiagramWfgPath(fileId: string, contentPath: string, mediaDir: string): void {
  wfgPathByFileId.set(fileId, resolveStoredDiagramWfgPath(mediaDir, contentPath))
}

export function unregisterDiagramWfgPath(fileId: string): void {
  wfgPathByFileId.delete(fileId)
}

export function getRegisteredDiagramWfgPath(fileId: string): string | undefined {
  return wfgPathByFileId.get(fileId)
}

function locateDiagramWfgPath(
  mediaDir: string,
  fileId: string,
  contentPath: string
): string | null {
  const resolved = resolveStoredDiagramWfgPath(mediaDir, contentPath)
  if (existsSync(resolved)) {
    wfgPathByFileId.set(fileId, resolved)
    return resolved
  }
  const cached = wfgPathByFileId.get(fileId)
  if (cached && existsSync(cached)) return cached
  if (!isExternalDiagramContentPath(contentPath)) {
    return findDiagramWfgPath(mediaDir, fileId)
  }
  return null
}

function resetWorkDir(workDir: string): void {
  if (existsSync(workDir)) {
    rmSync(workDir, { recursive: true, force: true })
  }
  ensureDirSync(workDir)
}

function readLegacyContent(mediaDir: string, fileId: string): DiagramContent | null {
  const path = join(diagramContentDir(mediaDir, fileId), 'content.json')
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8')) as DiagramContent
}

/** 将文档提交到 content_path 对应的 .wfg（用户路径或库内相对路径） */
async function commitStorageAsWfg(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  doc: WfgDiagramDocument
): Promise<string> {
  const wfgPath = resolveStoredDiagramWfgPath(mediaDir, contentPath)
  const tempWfg = createTempWfgPath()
  try {
    await doc.exportWfg(tempWfg)
    await publishTempWfgFile(tempWfg, wfgPath)
  } finally {
    if (existsSync(tempWfg)) rmSync(tempWfg, { force: true })
  }

  if (!isExternalDiagramContentPath(contentPath)) {
    const storageDir = diagramContentDir(mediaDir, fileId)
    if (existsSync(storageDir)) {
      for (const name of readdirSync(storageDir)) {
        const full = join(storageDir, name)
        if (full === wfgPath) continue
        rmSync(full, { recursive: true, force: true })
      }
    }
  }

  wfgPathByFileId.set(fileId, wfgPath)
  invalidateDiagramAssetCache(fileId)
  return wfgPath
}

async function syncWorkFromWfg(fileId: string, wfgPath: string): Promise<string> {
  const workDir = diagramWorkDir(fileId)
  const wfgMtime = statSync(wfgPath).mtimeMs
  const stampPath = join(workDir, '.source-mtime')
  const cached = existsSync(stampPath) ? Number(readFileSync(stampPath, 'utf8')) : -1

  if (!isPackageLayoutDir(workDir) || cached !== wfgMtime) {
    resetWorkDir(workDir)
    await extractZipToDir(wfgPath, workDir)
    writeFileSync(stampPath, String(wfgMtime))
  }
  return workDir
}

async function openWorkDocument(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  title?: string
): Promise<{ workDir: string; doc: WfgDiagramDocument } | null> {
  const wfgPath = locateDiagramWfgPath(mediaDir, fileId, contentPath)

  if (wfgPath) {
    const workDir = await syncWorkFromWfg(fileId, wfgPath)
    return { workDir, doc: WfgDiagramDocument.openFolder(fileId, workDir) }
  }

  if (isExternalDiagramContentPath(contentPath)) return null

  const storageDir = diagramContentDir(mediaDir, fileId)
  if (isPackageLayoutDir(storageDir)) {
    const legacyDoc = WfgDiagramDocument.openFolder(fileId, storageDir)
    const resolvedTitle = title ?? legacyDoc.readContent().meta.title
    const workDir = diagramWorkDir(fileId)
    resetWorkDir(workDir)
    legacyDoc.saveFolder(workDir)
    const doc = WfgDiagramDocument.openFolder(fileId, workDir)
    await commitStorageAsWfg(mediaDir, fileId, contentPath, doc)
    return { workDir, doc }
  }

  const legacy = readLegacyContent(mediaDir, fileId)
  if (!legacy) return null

  const resolvedTitle = title ?? legacy.meta.title
  const workDir = diagramWorkDir(fileId)
  resetWorkDir(workDir)
  const doc = WfgDiagramDocument.create(fileId, resolvedTitle, diagramContentFromLegacy(legacy))
  doc.saveFolder(workDir)
  await commitStorageAsWfg(mediaDir, fileId, contentPath, doc)
  return { workDir, doc: WfgDiagramDocument.openFolder(fileId, workDir) }
}

const assetCacheRoot = join(tmpdir(), 'wanwu-diagram-assets')

export function invalidateDiagramAssetCache(fileId: string): void {
  const dir = join(assetCacheRoot, fileId)
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
}

function isIgnorableWfgEntry(name: string): boolean {
  const lower = name.toLowerCase()
  if (lower.endsWith('.wfg')) return true
  return lower.endsWith('.wfg.tmp') && name.startsWith('._')
}

function diagramDirNeedsWfgMigration(mediaDir: string, fileId: string): boolean {
  const dir = join(mediaDir, 'diagrams', fileId)
  if (!existsSync(dir) || !statSync(dir).isDirectory()) return false

  const wfgPath = findDiagramWfgPath(mediaDir, fileId)
  if (!wfgPath) return true

  if (isPackageLayoutDir(dir) || existsSync(join(dir, 'content.json'))) return true

  return readdirSync(dir).some((n) => !isIgnorableWfgEntry(n))
}

async function withDiagramMigrationTimeout<T>(
  task: Promise<T>,
  fileId: string,
  timeoutMs = 60_000
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      task,
      new Promise<T>((_, reject) => {
        timer = setTimeout(
          () => reject(new Error(`文档 ${fileId} 迁移超时 (${timeoutMs}ms)`)),
          timeoutMs
        )
      })
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/** 启动迁移：将所有解压目录转为仅含 .wfg 的库文件 */
export async function migrateAllDiagramStorageToWfg(
  mediaDir: string,
  titlesByFileId?: Map<string, string>
): Promise<number> {
  const root = join(mediaDir, 'diagrams')
  if (!existsSync(root)) return 0

  let migrated = 0
  for (const fileId of readdirSync(root)) {
    if (!diagramDirNeedsWfgMigration(mediaDir, fileId)) continue

    const dir = join(root, fileId)
    try {
      const title =
        titlesByFileId?.get(fileId) ??
        (isPackageLayoutDir(dir)
          ? WfgDiagramDocument.openFolder(fileId, dir).readContent().meta.title
          : readLegacyContent(mediaDir, fileId)?.meta.title ?? '未命名流程图')

      const contentPath = relativeDiagramWfgPath(fileId, title)
      const opened = await withDiagramMigrationTimeout(
        openWorkDocument(mediaDir, fileId, contentPath, title),
        fileId
      )
      if (!opened) continue

      await withDiagramMigrationTimeout(
        commitStorageAsWfg(mediaDir, fileId, contentPath, opened.doc),
        fileId
      )
      migrated++
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(`[wanwu:diagrams] 迁移跳过 ${fileId}: ${message}`)
    }
  }
  return migrated
}

export async function ensureDiagramWfgFile(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  title: string
): Promise<string | null> {
  const existing = locateDiagramWfgPath(mediaDir, fileId, contentPath)
  const dir = diagramContentDir(mediaDir, fileId)
  const hasUnpack =
    !isExternalDiagramContentPath(contentPath) &&
    existsSync(dir) &&
    readdirSync(dir).some((n) => !n.toLowerCase().endsWith('.wfg'))

  if (existing && !hasUnpack) return existing

  const opened = await openWorkDocument(mediaDir, fileId, contentPath, title)
  if (!opened) return null
  return commitStorageAsWfg(mediaDir, fileId, contentPath, opened.doc)
}

export async function readDiagramContent(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  title?: string
): Promise<DiagramContent | null> {
  const opened = await openWorkDocument(mediaDir, fileId, contentPath, title)
  return opened?.doc.readContent() ?? null
}

export async function writeDiagramContentWithAssets(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  content: DiagramContent
): Promise<DiagramContent> {
  const { content: stripped, assets } = extractInlineImageAssets(content)
  const normalized = diagramContentFromLegacy(stripped)
  resetWorkDir(diagramWorkDir(fileId))
  const workDir = diagramWorkDir(fileId)

  const doc = WfgDiagramDocument.create(fileId, normalized.meta.title, normalized)
  for (const asset of assets) {
    doc.writeAsset(asset.assetId, asset.ext, Buffer.from(asset.bytes))
  }
  doc.saveFolder(workDir)
  await commitStorageAsWfg(mediaDir, fileId, contentPath, doc)
  return doc.readContent()
}

export async function writeDiagramContentPatch(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  content: DiagramContent,
  patch: DiagramWritePatch
): Promise<void> {
  const normalized = diagramContentFromLegacy(content)
  const opened = await openWorkDocument(mediaDir, fileId, contentPath, normalized.meta.title)
  if (!opened) {
    await writeDiagramContentWithAssets(mediaDir, fileId, contentPath, content)
    return
  }

  const { doc } = opened
  if (patch.metaDirty) {
    doc.writeMeta({
      format: 'wanwu-diagram',
      formatVersion: 2,
      engine: normalized.engine,
      engineVersion: normalized.engineVersion,
      title: normalized.meta.title,
      defaultPageId: normalized.meta.defaultPageId
    })
  }

  for (const pageId of patch.deletedPageIds ?? []) {
    doc.deletePageEntry(pageId)
  }

  for (const pageId of patch.dirtyPageIds) {
    const page = normalized.pages.find((p) => p.id === pageId)
    if (!page) continue
    const { graph, assets } = materializeGraphInlineAssets(page.graphData)
    for (const asset of assets) {
      doc.writeAsset(asset.assetId, asset.ext, Buffer.from(asset.bytes))
    }
    doc.writePage({ ...page, graphData: graph })
  }

  doc.flushDirtyToFolder(opened.workDir)
  await commitStorageAsWfg(mediaDir, fileId, contentPath, doc)
}

export async function writeDiagramContent(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  content: DiagramContent
): Promise<DiagramContent> {
  return writeDiagramContentWithAssets(mediaDir, fileId, contentPath, content)
}

export function diagramContentSizeBytes(
  mediaDir: string,
  fileId: string,
  contentPath: string
): number | null {
  const wfgPath = locateDiagramWfgPath(mediaDir, fileId, contentPath)
  if (!wfgPath) return null
  try {
    return statSync(wfgPath).size
  } catch {
    return null
  }
}

export function deleteDiagramContent(
  mediaDir: string,
  fileId: string,
  contentPath: string
): void {
  const wfgPath = resolveStoredDiagramWfgPath(mediaDir, contentPath)
  if (existsSync(wfgPath)) rmSync(wfgPath, { force: true })
  if (!isExternalDiagramContentPath(contentPath)) {
    const dir = diagramContentDir(mediaDir, fileId)
    if (existsSync(dir)) rmSync(dir, { recursive: true, force: true })
  }
  const workDir = diagramWorkDir(fileId)
  if (existsSync(workDir)) rmSync(workDir, { recursive: true, force: true })
  unregisterDiagramWfgPath(fileId)
  invalidateDiagramAssetCache(fileId)
}

export async function writeDiagramAsset(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  assetId: string,
  ext: string,
  data: Buffer
): Promise<void> {
  const opened = await openWorkDocument(mediaDir, fileId, contentPath)
  if (!opened) {
    const blank = WfgDiagramDocument.create(fileId, '未命名流程图')
    blank.writeAsset(assetId, ext, data)
    await commitStorageAsWfg(mediaDir, fileId, contentPath, blank)
    return
  }
  opened.doc.writeAsset(assetId, ext, data)
  opened.doc.flushDirtyToFolder(opened.workDir)
  await commitStorageAsWfg(mediaDir, fileId, contentPath, opened.doc)
}

export async function copyDiagramPackageAssets(
  mediaDir: string,
  sourceFileId: string,
  sourceContentPath: string,
  targetFileId: string,
  targetContentPath: string,
  targetTitle: string
): Promise<void> {
  const srcOpened = await openWorkDocument(mediaDir, sourceFileId, sourceContentPath)
  if (!srcOpened) return

  const content = diagramContentFromLegacy(srcOpened.doc.readContent())
  content.meta.title = targetTitle

  const workDir = diagramWorkDir(targetFileId)
  resetWorkDir(workDir)
  const dest = WfgDiagramDocument.create(targetFileId, targetTitle, content)

  for (const path of srcOpened.doc.getPackage().listEntryPaths()) {
    if (!path.startsWith('assets/')) continue
    const data = srcOpened.doc.getPackage().getEntryBuffer(path)
    if (!data) continue
    const name = path.slice('assets/'.length)
    const dot = name.lastIndexOf('.')
    const assetId = dot >= 0 ? name.slice(0, dot) : name
    const assetExt = dot >= 0 ? name.slice(dot + 1) : 'png'
    dest.writeAsset(assetId, assetExt, data)
  }

  dest.saveFolder(workDir)
  await commitStorageAsWfg(mediaDir, targetFileId, targetContentPath, dest)
}

export async function renameDiagramWfgFile(
  mediaDir: string,
  fileId: string,
  contentPath: string,
  newTitle: string,
  newContentPath: string
): Promise<void> {
  const opened = await openWorkDocument(mediaDir, fileId, contentPath, newTitle)
  if (!opened) return
  const wfgPath = await commitStorageAsWfg(mediaDir, fileId, newContentPath, opened.doc)
  if (
    newContentPath !== contentPath &&
    existsSync(resolveStoredDiagramWfgPath(mediaDir, contentPath))
  ) {
    rmSync(resolveStoredDiagramWfgPath(mediaDir, contentPath), { force: true })
  }
  wfgPathByFileId.set(fileId, wfgPath)
}

/** 从 .wfg 解压单张资源到缓存，供 wanwu-media 读取 */
export async function resolveDiagramAssetCachePath(
  mediaDir: string,
  fileId: string,
  assetId: string,
  ext: string
): Promise<string | null> {
  const wfgPath = wfgPathByFileId.get(fileId) ?? findDiagramWfgPath(mediaDir, fileId)
  if (!wfgPath) return null

  const cacheDir = join(assetCacheRoot, fileId, 'assets')
  const cachePath = join(cacheDir, `${assetId}.${ext}`)
  const wfgMtime = statSync(wfgPath).mtimeMs
  const stampPath = join(assetCacheRoot, fileId, '.wfg-mtime')

  if (existsSync(cachePath)) {
    const cachedMtime = existsSync(stampPath) ? Number(readFileSync(stampPath, 'utf8')) : -1
    if (cachedMtime === wfgMtime) return cachePath
    invalidateDiagramAssetCache(fileId)
  }

  const workDir = await syncWorkFromWfg(fileId, wfgPath)
  const doc = WfgDiagramDocument.openFolder(fileId, workDir)
  const entry = `assets/${assetId}.${ext}`
  const data = doc.getPackage().getEntryBuffer(entry)
  if (!data) return null

  ensureDirSync(cacheDir)
  writeFileSync(cachePath, data)
  ensureDirSync(join(assetCacheRoot, fileId))
  writeFileSync(stampPath, String(wfgMtime))
  return cachePath
}
