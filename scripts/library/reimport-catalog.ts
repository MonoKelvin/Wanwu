/**
 * 将 catalog 入库（增量 / 按 id 更新 / 全量）
 *
 * 用法:
 *   npm run seed:library:reimport              # 仅新增尚未入库的 id
 *   npm run seed:library:reimport -- --id=<uuid> --id=<uuid>
 *   npm run seed:library:reimport -- --full    # 全量同步（开发恢复）
 */
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { DatabaseService } from '../../electron/services/database'
import { importLibraryCatalog, writeCatalogImportMarker, loadLibraryCatalog } from '../../electron/services/librarySeed'

function resolveUserData(): string {
  if (process.env.WANWU_USER_DATA) return process.env.WANWU_USER_DATA
  const appName = 'wanwu'
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA ?? join(homedir(), 'AppData', 'Roaming')
    return join(appData, appName)
  }
  if (process.platform === 'darwin') {
    return join(homedir(), 'Library', 'Application Support', appName)
  }
  return join(homedir(), '.config', appName)
}

function parseArgs(argv: string[]) {
  return {
    full: argv.includes('--full'),
    ids: argv.filter((a) => a.startsWith('--id=')).map((a) => a.slice(5))
  }
}

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const userData = resolveUserData()
  mkdirSync(join(userData, 'db'), { recursive: true })

  if (!existsSync(join(process.cwd(), 'assets', 'seed', 'library', 'catalog.json'))) {
    console.error('未找到 assets/seed/library/catalog.json，请先 npm run seed:library -- build')
    process.exit(1)
  }

  const db = new DatabaseService(userData)
  await db.init({ skipLibrarySeed: true })

  const result = importLibraryCatalog(db, {
    importNew: !opts.full && opts.ids.length === 0,
    updateIds: opts.ids.length ? opts.ids : undefined,
    full: opts.full
  })

  const catalog = loadLibraryCatalog()
  if (catalog?.items?.length && (opts.full || result.imported > 0 || result.skipped === catalog.items.length)) {
    writeCatalogImportMarker(userData, catalog)
  }

  console.log(
    `入库完成 → ${userData}\n  新增 ${result.imported} · 跳过 ${result.skipped} · 更新 ${result.updated}`
  )
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
