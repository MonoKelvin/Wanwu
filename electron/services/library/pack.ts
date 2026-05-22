/**
 * 预编译图鉴数据包：发现 zip → 解压到数据/资源目录 → 成功则删除 zip。
 */
import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import extract from 'extract-zip'
import type { DatabaseService } from '../core/database'
import { getBundledAssetsRoot } from '../core/assetsRoot'
import { getWanwuResourcesDirectory, patchWanwuPathConfig, readWanwuPathConfig } from '../data/paths'
import {
  discoverLibraryPackZip,
  getLibraryCatalogPath,
  isBundledLibrarySeedAvailable,
  LIBRARY_PACK_ZIP
} from './paths'
import { getCatalogSeedToken, type LibraryCatalog } from './seed'

const CATALOG_IMPORT_MARKER = '.library-catalog-import'

export const LIBRARY_PACK_MARKER = '.library-data-pack'
export const LIBRARY_MEDIA_MARKER = '.library-media-bundle'
const PACK_MANIFEST = 'manifest.json'
const STAGING_DIR = '.library-pack-staging'
const MEDIA_STAGING_DIR = '.library-media-staging'

export interface LibraryPackManifest {
  packVersion: number
  catalogToken: string
  catalogMtimeMs: number
  catalogSize: number
  builtAt: string
  libraryDbCount: number
}

export type LibraryBootstrapPhase = 'idle' | 'installing' | 'ready' | 'error'

let phase: LibraryBootstrapPhase = 'idle'
let bootstrapError: string | null = null
let bootstrapPromise: Promise<void> | null = null
const startupNotices: string[] = []

export function getLibraryBootstrapPhase(): LibraryBootstrapPhase {
  return phase
}

export function getLibraryBootstrapError(): string | null {
  return bootstrapError
}

export function consumeStartupNotices(): string[] {
  const copy = [...startupNotices]
  startupNotices.length = 0
  return copy
}

function pushStartupNotice(message: string): void {
  startupNotices.push(message)
  console.warn('[libraryPack]', message)
}

function packMarkerPath(basePath: string): string {
  return join(basePath, 'db', LIBRARY_PACK_MARKER)
}

function readPackMarker(basePath: string): LibraryPackManifest | null {
  const path = packMarkerPath(basePath)
  if (!existsSync(path)) return null
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as LibraryPackManifest
  } catch {
    return null
  }
}

export function writePackMarker(basePath: string, manifest: LibraryPackManifest): void {
  mkdirSync(join(basePath, 'db'), { recursive: true })
  writeFileSync(packMarkerPath(basePath), `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8')
}

export function buildManifestFromCatalog(catalog: LibraryCatalog, libraryDbCount: number): LibraryPackManifest {
  const catalogPath = getLibraryCatalogPath()
  const stat = existsSync(catalogPath) ? statSync(catalogPath) : { mtimeMs: 0, size: 0 }
  return {
    packVersion: 1,
    catalogToken: getCatalogSeedToken(catalog),
    catalogMtimeMs: stat.mtimeMs,
    catalogSize: stat.size,
    builtAt: new Date().toISOString(),
    libraryDbCount
  }
}

function manifestMatches(a: LibraryPackManifest, b: LibraryPackManifest): boolean {
  return (
    a.packVersion === b.packVersion &&
    a.catalogToken === b.catalogToken &&
    a.catalogMtimeMs === b.catalogMtimeMs &&
    a.catalogSize === b.catalogSize
  )
}

export async function readManifestFromZip(zipPath: string): Promise<LibraryPackManifest | null> {
  const staging = join(process.cwd(), '.cache', 'wanwu-pack-read')
  mkdirSync(staging, { recursive: true })
  try {
    rmSync(staging, { recursive: true, force: true })
    mkdirSync(staging, { recursive: true })
    await extract(zipPath, { dir: staging })
    const manifestPath = join(staging, PACK_MANIFEST)
    if (!existsSync(manifestPath)) return null
    return JSON.parse(readFileSync(manifestPath, 'utf-8')) as LibraryPackManifest
  } finally {
    try {
      rmSync(staging, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

function countLibrarySqliteFiles(dbDir: string): number {
  if (!existsSync(dbDir)) return 0
  return readdirSync(dbDir).filter((f) => f.startsWith('library_') && f.endsWith('.sqlite')).length
}

function hasUsableLibraryDbs(basePath: string, expectedCount: number): boolean {
  const dbDir = join(basePath, 'db')
  if (countLibrarySqliteFiles(dbDir) < Math.max(1, expectedCount)) return false
  const marker = join(dbDir, CATALOG_IMPORT_MARKER)
  return existsSync(marker)
}

/** 是否可跳过解压（数据包版本与本地一致且库文件齐全） */
export function isLibraryPackUpToDate(basePath: string, bundled: LibraryPackManifest): boolean {
  const local = readPackMarker(basePath)
  if (!local || !manifestMatches(local, bundled)) return false
  return hasUsableLibraryDbs(basePath, bundled.libraryDbCount)
}

function copySqliteFilesFromStaging(stagingDb: string, targetDb: string): number {
  mkdirSync(targetDb, { recursive: true })
  let n = 0
  for (const file of readdirSync(stagingDb)) {
    if (!file.startsWith('library_') || !file.endsWith('.sqlite')) continue
    const src = join(stagingDb, file)
    const dest = join(targetDb, file)
    const tmp = `${dest}.tmp-${process.pid}`
    copyFileSync(src, tmp)
    if (existsSync(dest)) rmSync(dest, { force: true })
    renameSync(tmp, dest)
    n++
  }
  for (const extra of [CATALOG_IMPORT_MARKER, '.library-media-sync']) {
    const src = join(stagingDb, extra)
    if (existsSync(src)) copyFileSync(src, join(targetDb, extra))
  }
  return n
}

function tryDeleteLibraryPackZip(zipPath: string): boolean {
  try {
    rmSync(zipPath, { force: true })
    return !existsSync(zipPath)
  } catch (err) {
    console.warn('[libraryPack] 无法删除 zip', zipPath, err)
    return false
  }
}

function clearLibraryPackPathConfigIfMatches(zipPath: string): void {
  const configured = readWanwuPathConfig().libraryPackPath?.trim()
  if (configured && configured.toLowerCase() === zipPath.toLowerCase()) {
    patchWanwuPathConfig({ libraryPackPath: '' })
  }
}

/** 从 zip 解压图鉴配图到用户数据目录 resources/library */
export async function ensureBundledLibraryMediaInstalled(
  zipPath: string,
  dataPath?: string
): Promise<'skipped' | 'installed' | 'no-pack'> {
  const resourcesRoot = dataPath ? join(dataPath, 'resources') : getWanwuResourcesDirectory()
  const marker = join(resourcesRoot, LIBRARY_MEDIA_MARKER)
  if (existsSync(marker)) return 'skipped'

  const staging = join(resourcesRoot, MEDIA_STAGING_DIR)
  rmSync(staging, { recursive: true, force: true })
  mkdirSync(staging, { recursive: true })

  try {
    await extract(zipPath, { dir: staging })
    const libSrc = join(staging, 'library')
    if (!existsSync(libSrc)) {
      console.warn('[libraryPack] zip 内无 library/ 媒体目录，跳过配图解压')
      return 'no-pack'
    }
    const libDest = join(resourcesRoot, 'library')
    mkdirSync(libDest, { recursive: true })
    cpSync(libSrc, libDest, { recursive: true })
    writeFileSync(marker, `${new Date().toISOString()}\n`, 'utf-8')
    console.log('[libraryPack] 图鉴配图已解压到', libDest)
    return 'installed'
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}

/** 从 zip 解压图鉴 sqlite 到用户数据目录 */
export async function applyBundledLibraryPack(
  basePath: string,
  zipPath: string,
  manifest: LibraryPackManifest
): Promise<void> {
  const dbDir = join(basePath, 'db')
  mkdirSync(dbDir, { recursive: true })
  const staging = join(dbDir, STAGING_DIR)
  rmSync(staging, { recursive: true, force: true })
  mkdirSync(staging, { recursive: true })

  try {
    await extract(zipPath, { dir: staging })
    const stagingDb = existsSync(join(staging, 'db')) ? join(staging, 'db') : staging
    const copied = copySqliteFilesFromStaging(stagingDb, dbDir)
    if (copied < 1) {
      throw new Error('数据包内未找到 library_*.sqlite')
    }
    writePackMarker(basePath, manifest)
  } finally {
    rmSync(staging, { recursive: true, force: true })
  }
}

/**
 * 发现 library-data-pack.zip 并导入；成功删除 zip，失败保留并写入启动提示。
 */
export async function applyPendingLibraryPackZip(
  dbService: DatabaseService
): Promise<'none' | 'installed' | 'skipped' | 'failed'> {
  const zipPath = discoverLibraryPackZip()
  if (!zipPath) return 'none'

  const basePath = dbService.getBasePath()
  const manifest = await readManifestFromZip(zipPath)
  if (!manifest) {
    pushStartupNotice(
      `图鉴数据包无效（缺少 manifest.json），已保留文件：${zipPath}`
    )
    return 'failed'
  }

  if (isLibraryPackUpToDate(basePath, manifest)) {
    if (tryDeleteLibraryPackZip(zipPath)) {
      clearLibraryPackPathConfigIfMatches(zipPath)
    }
    return 'skipped'
  }

  const dbDir = join(basePath, 'db')
  if (countLibrarySqliteFiles(dbDir) > 0 && existsSync(join(dbDir, CATALOG_IMPORT_MARKER))) {
    if (tryDeleteLibraryPackZip(zipPath)) {
      clearLibraryPackPathConfigIfMatches(zipPath)
    }
    return 'skipped'
  }

  const t0 = Date.now()
  console.log(`[libraryPack] 导入图鉴包（${manifest.libraryDbCount} 个分类）…`)

  try {
    dbService.closeAllLibraryDbs()
    await applyBundledLibraryPack(basePath, zipPath, manifest)
    const mediaResult = await ensureBundledLibraryMediaInstalled(zipPath, basePath)
    if (mediaResult === 'no-pack') {
      console.log('[libraryPack] 数据包无配图目录，未写入 resources/library')
    }

    if (!tryDeleteLibraryPackZip(zipPath)) {
      pushStartupNotice(
        `图鉴已导入。请手动删除安装目录或数据目录下的 ${LIBRARY_PACK_ZIP}（可能需要管理员权限）。`
      )
    } else {
      clearLibraryPackPathConfigIfMatches(zipPath)
    }

    console.log(`[libraryPack] 导入完成，耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`)
    return 'installed'
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    pushStartupNotice(`图鉴导入失败：${message}。已保留 ${LIBRARY_PACK_ZIP}，请检查后重试。`)
    return 'failed'
  }
}

/** @deprecated 使用 applyPendingLibraryPackZip */
export async function ensureLibraryPackInstalled(dbService: DatabaseService): Promise<'skipped' | 'installed' | 'no-pack'> {
  const r = await applyPendingLibraryPackZip(dbService)
  if (r === 'failed') return 'no-pack'
  if (r === 'none') return 'no-pack'
  return r
}

function shouldRunBundledSeedFallback(): boolean {
  return isBundledLibrarySeedAvailable()
}

export function startLibraryBootstrap(dbService: DatabaseService, runSeed: () => void): void {
  if (bootstrapPromise) return
  phase = 'installing'
  bootstrapPromise = (async () => {
    const packResult = await applyPendingLibraryPackZip(dbService)
    if (packResult === 'installed' || packResult === 'skipped') {
      phase = 'ready'
      return
    }
    if (packResult === 'failed' && shouldRunBundledSeedFallback()) {
      runSeed()
      phase = 'ready'
      return
    }
    if (shouldRunBundledSeedFallback()) {
      runSeed()
    }
    phase = 'ready'
  })().catch((err) => {
    phase = 'error'
    bootstrapError = err instanceof Error ? err.message : String(err)
    console.error('[libraryPack] bootstrap failed', err)
  })
}

export async function waitForLibraryBootstrap(timeoutMs = 120_000): Promise<void> {
  if (phase === 'ready') return
  if (phase === 'error') throw new Error(bootstrapError ?? '图鉴库初始化失败')
  if (!bootstrapPromise) return
  let timer: ReturnType<typeof setTimeout> | undefined
  await Promise.race([
    bootstrapPromise,
    new Promise<void>((_, reject) => {
      timer = setTimeout(() => reject(new Error('图鉴库初始化超时')), timeoutMs)
    })
  ]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}
