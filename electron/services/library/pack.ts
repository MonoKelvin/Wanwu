/**
 * 预编译图鉴数据包：解压 library-data-pack.zip、版本标记、启动引导。
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import extract from 'extract-zip'
import type { DatabaseService } from '../core/database'
import { getBundledLibraryPackPath, getLibraryCatalogPath } from './paths'
import { getCatalogSeedToken, type LibraryCatalog } from './seed'

const CATALOG_IMPORT_MARKER = '.library-catalog-import'

export const LIBRARY_PACK_MARKER = '.library-data-pack'
const PACK_MANIFEST = 'manifest.json'
const STAGING_DIR = '.library-pack-staging'

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

export function getLibraryBootstrapPhase(): LibraryBootstrapPhase {
  return phase
}

export function getLibraryBootstrapError(): string | null {
  return bootstrapError
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

async function readManifestFromZip(zipPath: string): Promise<LibraryPackManifest | null> {
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

/** 从 bundled zip 解压图鉴 sqlite 到用户数据目录（仅替换 library_*.sqlite） */
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
 * 首次安装：异步解压预编译库；已安装且 catalog 未变则跳过；
 * 已有旧库但种子升级：仅后台 importNew（由 runStartupLibrarySeed 处理）。
 */
export async function ensureLibraryPackInstalled(dbService: DatabaseService): Promise<'skipped' | 'installed' | 'no-pack'> {
  const zipPath = getBundledLibraryPackPath()
  const basePath = dbService.getBasePath()

  if (!zipPath) return 'no-pack'

  const manifest = await readManifestFromZip(zipPath)
  if (!manifest) {
    console.warn('[libraryPack] zip 缺少 manifest.json，跳过预装')
    return 'no-pack'
  }

  if (isLibraryPackUpToDate(basePath, manifest)) {
    return 'skipped'
  }

  const dbDir = join(basePath, 'db')
  if (countLibrarySqliteFiles(dbDir) > 0 && existsSync(join(dbDir, CATALOG_IMPORT_MARKER))) {
    return 'skipped'
  }

  const t0 = Date.now()
  console.log(`[libraryPack] 解压预编译库（${manifest.libraryDbCount} 个分类）…`)
  dbService.closeAllLibraryDbs()
  await applyBundledLibraryPack(basePath, zipPath, manifest)
  console.log(`[libraryPack] 解压完成，耗时 ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  return 'installed'
}

export function startLibraryBootstrap(dbService: DatabaseService, runSeed: () => void): void {
  if (bootstrapPromise) return
  phase = 'installing'
  bootstrapPromise = (async () => {
    const packResult = await ensureLibraryPackInstalled(dbService)
    if (packResult === 'installed') {
      phase = 'ready'
      return
    }
    runSeed()
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
