/**
 * 从 assets/seed/illustrated-handbook/items 各 JSON 生成预编译图鉴 SQLite 数据包
 *
 *   npm run build（经 run.mjs library-pack，使用 Electron Node）
 *
 * 产出: assets/packed/library-data-pack.zip（由 pack 单独复制到 release/ 分发，不打进安装包）
 */
import { createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'fs'
import { join } from 'path'
import { ZipArchive } from '../electron/services/zipArchive'
import { DatabaseService } from '../electron/services/core/database'
import type { ImportLibraryProgress } from '../electron/services/library/seed'
import {
  importLibraryCatalog,
  loadLibraryCatalog,
  writeCatalogImportMarker
} from '../electron/services/library/seed'
import { buildManifestFromCatalog, LIBRARY_PACK_MARKER } from '../electron/services/library/pack'

const root = process.cwd()
const outDir = join(root, 'assets', 'packed')
const zipPath = join(outDir, 'library-data-pack.zip')
const libraryMediaRoot = join(root, 'assets', 'seed', 'illustrated-handbook', 'resources')
const MEDIA_FILE = /\.(jpe?g|png|webp|md)$/i
const cacheDir = join(root, '.cache', 'wanwu-library-pack')
const CATALOG_IMPORT_MARKER = '.library-catalog-import'

/** 构建前删除旧 zip 与 staging，避免半成品污染本次 library-data-pack.zip */
function cleanLibraryPackBuildOutputs(): void {
  rmSync(cacheDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })
  if (!existsSync(outDir)) return
  for (const name of readdirSync(outDir)) {
    if (!/\.zip$/i.test(name)) continue
    const p = join(outDir, name)
    if (!UNIFIED_PACK) console.log(`[build] 清理旧图鉴 zip: ${p}`)
    rmSync(p, { force: true })
  }
}

const STAGE_LABEL: Record<ImportLibraryProgress['stage'], string> = {
  'prepare-categories': '准备分类库',
  'import-items': '写入条目',
  'cleanup-category': '清理分类'
}

const UNIFIED_PACK = process.env.WANWU_PACK_PROGRESS === '1'
const WANWU_PROGRESS_MARKER = '@@WANWU_PROGRESS@@'

function emitUnifiedProgress(local: number, label: string): void {
  const line = `${WANWU_PROGRESS_MARKER}${JSON.stringify({
    local: Math.min(1, Math.max(0, local)),
    label
  })}\n`
  process.stderr.write(line)
}

const UNIFIED_PHASE = {
  catalog: { start: 0, end: 0.03 },
  clean: { start: 0.03, end: 0.06 },
  import: { start: 0.06, end: 0.7 },
  manifest: { start: 0.7, end: 0.74 },
  zip: { start: 0.74, end: 1 }
} as const

type UnifiedPhase = keyof typeof UNIFIED_PHASE

function emitPhaseProgress(phase: UnifiedPhase, local: number, label: string): void {
  const range = UNIFIED_PHASE[phase]
  const text = label.length > 72 ? `${label.slice(0, 71)}…` : label
  emitUnifiedProgress(range.start + (range.end - range.start) * Math.min(1, Math.max(0, local)), text)
}

interface PackProgress {
  step(title: string, phase?: UnifiedPhase): void
  progress(
    label: string,
    current: number,
    total: number,
    detail?: string,
    phase?: UnifiedPhase
  ): void
  done(message: string): void
}

function createPackProgress(prefix = '[build]'): PackProgress {
  const t0 = Date.now()
  let lastLineAt = 0
  let lastPct = -1
  const isTTY = Boolean(process.stdout.isTTY) && !UNIFIED_PACK

  function elapsedSec(): string {
    return ((Date.now() - t0) / 1000).toFixed(0)
  }

  function bar(pct: number): string {
    const w = 24
    const filled = Math.round((pct / 100) * w)
    return `[${'█'.repeat(filled)}${'░'.repeat(w - filled)}]`
  }

  return {
    step(title, phase = 'catalog') {
      if (UNIFIED_PACK) {
        emitPhaseProgress(phase, 0, title)
        return
      }
      if (isTTY) process.stdout.write('\n')
      console.log(`${prefix} ▶ ${title}`)
    },

    progress(label, current, total, detail = '', phase = 'import') {
      const local = total > 0 ? current / total : 0
      if (UNIFIED_PACK) {
        const extra = detail ? ` · ${detail}` : ''
        emitPhaseProgress(phase, local, `${label} ${current}/${total}${extra}`)
        return
      }

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
      if (UNIFIED_PACK) {
        emitUnifiedProgress(1, message)
        return
      }
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
      else if (MEDIA_FILE.test(ent.name)) {
        out.push({ abs, name: `illustrated-handbook/${rel}` })
      }
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
    `压缩数据包：${dbFiles.length} 个库文件 + ${mediaFiles.length} 个图鉴媒体 → library-data-pack.zip`,
    'zip'
  )

  await new Promise<void>((resolve, reject) => {
    const output = createWriteStream(zipPath)
    const archive = new ZipArchive({ zlib: { level: 9 } })
    let packed = 0

    output.on('close', () => resolve())
    archive.on('error', reject)
    archive.on('entry', (entry: { name?: string }) => {
      packed++
      const name = entry.name ?? ''
      log.progress('打包', packed, totalEntries, name.split('/').pop(), 'zip')
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
  log.progress(STAGE_LABEL[p.stage], p.current, p.total, p.detail, 'import')
}

async function main(): Promise<void> {
  const log = createPackProgress()

  log.step('扫描 assets/seed/illustrated-handbook/items', 'catalog')
  const catalog = loadLibraryCatalog()
  if (!catalog?.items?.length) {
    console.error('[build] 未找到种子条目，请维护 assets/seed/illustrated-handbook/items 下各 JSON')
    process.exit(1)
  }
  if (!UNIFIED_PACK) console.log(`[build]   共 ${catalog.items.length} 条`)

  log.step('清理图鉴包旧产物与缓存', 'clean')
  cleanLibraryPackBuildOutputs()
  mkdirSync(join(cacheDir, 'db'), { recursive: true })

  log.step(`根据种子 JSON 生成 SQLite（约 1–3 分钟）`, 'import')
  const db = new DatabaseService(cacheDir)
  await db.init({ skipLibrarySeed: true })
  const result = importLibraryCatalog(db, {
    full: true,
    onProgress: (p) => mapSeedProgress(log, p)
  })
  if (!UNIFIED_PACK) {
    console.log(
      `[build]   写入 ${result.imported} · 更新 ${result.updated} · 跳过 ${result.skipped}`
    )
  }

  log.step('写入版本标记', 'manifest')
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
