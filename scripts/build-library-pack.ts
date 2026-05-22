/**
 * 从 assets/seed/library/catalog.json 生成预编译图鉴 SQLite 数据包
 *
 *   npm run build（第一步）
 *
 * 产出: assets/packed/library-data-pack.zip（由 pack 单独复制到 release/ 分发，不打进安装包）
 */
import { createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import { createRequire } from 'module'
import { DatabaseService } from '../electron/services/core/database'
import type { ImportLibraryProgress } from '../electron/services/library/seed'
import {
  importLibraryCatalog,
  loadLibraryCatalog,
  writeCatalogImportMarker
} from '../electron/services/library/seed'
import { buildManifestFromCatalog, LIBRARY_PACK_MARKER } from '../electron/services/library/pack'

const require = createRequire(import.meta.url)
const { ZipArchive } = require('archiver') as typeof import('archiver')

const root = process.cwd()
const outDir = join(root, 'assets', 'packed')
const zipPath = join(outDir, 'library-data-pack.zip')
const libraryMediaRoot = join(root, 'assets', 'library')
const MEDIA_FILE = /\.(jpe?g|png|webp|md)$/i
const cacheDir = join(root, '.cache', 'wanwu-library-pack')
const CATALOG_IMPORT_MARKER = '.library-catalog-import'

const STAGE_LABEL: Record<ImportLibraryProgress['stage'], string> = {
  'prepare-categories': '准备分类库',
  'import-items': '写入条目',
  'cleanup-category': '清理分类'
}

interface PackProgress {
  step(title: string): void
  progress(label: string, current: number, total: number, detail?: string): void
  done(message: string): void
}

function createPackProgress(prefix = '[build]'): PackProgress {
  const t0 = Date.now()
  let lastLineAt = 0
  let lastPct = -1
  const isTTY = Boolean(process.stdout.isTTY)

  function elapsedSec(): string {
    return ((Date.now() - t0) / 1000).toFixed(0)
  }

  function bar(pct: number): string {
    const w = 24
    const filled = Math.round((pct / 100) * w)
    return `[${'█'.repeat(filled)}${'░'.repeat(w - filled)}]`
  }

  return {
    step(title) {
      if (isTTY) process.stdout.write('\n')
      console.log(`${prefix} ▶ ${title}`)
    },

    progress(label, current, total, detail = '') {
      const pct = total > 0 ? Math.min(100, Math.floor((current * 100) / total)) : 0
      const now = Date.now()
      const throttle = now - lastLineAt < 150
      const isDone = current >= total
      if (!isDone && throttle && pct === lastPct) return

      lastLineAt = now
      lastPct = pct
      const extra = detail ? ` · ${detail}` : ''
      const line = `${prefix} ${bar(pct)} ${String(pct).padStart(3)}% ${label} ${current}/${total}${extra} (${elapsedSec()}s)`

      if (isTTY && !isDone) {
        process.stdout.write(`\r${line.padEnd(100)}`)
      } else if (isDone || pct % 5 === 0 || current % 50 === 0) {
        if (isTTY) process.stdout.write(`\r${line.padEnd(100)}\n`)
        else console.log(line)
      }
    },

    done(message) {
      if (isTTY) process.stdout.write('\n')
      console.log(`${prefix} ✓ ${message}（总耗时 ${elapsedSec()}s）`)
    }
  }
}

function collectLibraryMediaFiles(): Array<{ abs: string; name: string }> {
  const out: Array<{ abs: string; name: string }> = []
  if (!existsSync(libraryMediaRoot)) return out

  function walk(dir: string, relPrefix: string): void {
    for (const ent of readdirSync(dir, { withFileTypes: true })) {
      const rel = relPrefix ? `${relPrefix}/${ent.name}` : ent.name
      const abs = join(dir, ent.name)
      if (ent.isDirectory()) walk(abs, rel)
      else if (MEDIA_FILE.test(ent.name)) out.push({ abs, name: `library/${rel}` })
    }
  }
  walk(libraryMediaRoot, '')
  return out
}

async function zipPack(
  stagingDb: string,
  manifestPath: string,
  log: PackProgress
): Promise<void> {
  mkdirSync(outDir, { recursive: true })
  if (existsSync(zipPath)) rmSync(zipPath, { force: true })

  const dbFiles = readdirSync(stagingDb).filter(
    (f) =>
      (f.startsWith('library_') && f.endsWith('.sqlite')) ||
      f === CATALOG_IMPORT_MARKER ||
      f === '.library-media-sync'
  )
  const mediaFiles = collectLibraryMediaFiles()
  const totalEntries = dbFiles.length + mediaFiles.length + 1
  log.step(
    `压缩数据包：${dbFiles.length} 个库文件 + ${mediaFiles.length} 个图鉴媒体 → library-data-pack.zip`
  )

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath)
    const archive = new ZipArchive({ zlib: { level: 9 } })
    let packed = 0

    output.on('close', () => resolve())
    archive.on('error', reject)
    archive.on('entry', (entry) => {
      packed++
      const name = typeof entry === 'object' && entry && 'name' in entry ? String(entry.name) : ''
      log.progress('打包', packed, totalEntries, name.split('/').pop())
    })

    archive.pipe(output)
    archive.file(manifestPath, { name: 'manifest.json' })
    for (const file of dbFiles) {
      archive.file(join(stagingDb, file), { name: `db/${file}` })
    }
    for (const file of mediaFiles) {
      archive.file(file.abs, { name: file.name })
    }
    void archive.finalize()
  })
}

function mapSeedProgress(log: PackProgress, p: ImportLibraryProgress): void {
  log.progress(STAGE_LABEL[p.stage], p.current, p.total, p.detail)
}

async function main(): Promise<void> {
  const log = createPackProgress()

  log.step('读取 assets/seed/library/catalog.json')
  const catalog = loadLibraryCatalog()
  if (!catalog?.items?.length) {
    console.error('[build] 未找到 catalog.json 或条目为空，请先维护种子 JSON 并提交 catalog.json')
    process.exit(1)
  }
  console.log(`[build]   共 ${catalog.items.length} 条`)

  log.step('清理缓存并初始化数据库目录')
  rmSync(cacheDir, { recursive: true, force: true })
  mkdirSync(join(cacheDir, 'db'), { recursive: true })

  log.step(`根据 catalog 生成 SQLite（约 1–3 分钟）`)
  const db = new DatabaseService(cacheDir)
  await db.init({ skipLibrarySeed: true })
  const result = importLibraryCatalog(db, {
    full: true,
    onProgress: (p) => mapSeedProgress(log, p)
  })
  console.log(
    `[build]   写入 ${result.imported} · 更新 ${result.updated} · 跳过 ${result.skipped}`
  )

  log.step('写入版本标记')
  writeCatalogImportMarker(cacheDir, catalog)
  writeFileSync(
    join(cacheDir, 'db', '.library-media-sync'),
    `v${catalog.schema ?? 0}-${catalog.mediaConfigVersion ?? 0}\n`,
    'utf-8'
  )
  db.close()

  const dbDir = join(cacheDir, 'db')
  const libraryDbCount = readdirSync(dbDir).filter(
    (f) => f.startsWith('library_') && f.endsWith('.sqlite')
  ).length
  const manifest = buildManifestFromCatalog(catalog, libraryDbCount)
  const manifestPath = join(cacheDir, 'manifest.json')
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8')
  writeFileSync(join(dbDir, LIBRARY_PACK_MARKER), `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8')

  await zipPack(dbDir, manifestPath, log)

  const sizeMb = (statSync(zipPath).size / (1024 * 1024)).toFixed(1)
  log.done(`已生成 ${zipPath}（${sizeMb} MB，${libraryDbCount} 个分类库）`)
}

main().catch((err) => {
  console.error('[build] 数据包失败:', err)
  process.exit(1)
})
