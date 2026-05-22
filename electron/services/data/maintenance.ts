import { app, dialog } from 'electron'
import { ZipArchive } from 'archiver'
import { createRequire } from 'node:module'
import { cpSync, createWriteStream, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs'
import { mkdir, stat, writeFile } from 'fs/promises'
import { join } from 'path'
import { tmpdir } from 'os'
import { randomUUID } from 'crypto'
import { getMainWindow } from '../../windowState'
import { resolveExistingFilePath } from '../media/shell'
import type { DatabaseService } from '../core/database'
import type { RssService } from '../rss/service'
import { normalizeAppSettings } from '../data/settings'
import { APP_VERSION } from '@shared/constants/appVersion'
import { DEFAULT_APP_SETTINGS } from '../../../src/shared/types/settings'

const require = createRequire(import.meta.url)
const extractZip = require('extract-zip') as (zipPath: string, opts: { dir: string }) => Promise<void>

export type BackupResult =
  | { ok: true; path: string; bytes: number }
  | { ok: false; canceled?: boolean; error?: string }

export type RestoreResult =
  | { ok: true }
  | { ok: false; canceled?: boolean; error?: string }

function formatTimestamp(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
}

function zipDirectory(sourceDir: string, outPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const output = createWriteStream(outPath)
    const archive = new ZipArchive({ zlib: { level: 9 } })
    let bytes = 0

    output.on('close', () => {
      try {
        bytes = statSync(outPath).size
      } catch {
        bytes = typeof archive.pointer === 'function' ? Number(archive.pointer()) : 0
      }
      resolve(bytes)
    })
    output.on('error', reject)
    archive.on('error', reject)
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') console.warn('[wanwu] backup warning', err)
      else reject(err)
    })

    archive.pipe(output)
    archive.directory(sourceDir, false)
    void archive.finalize()
  })
}

function validateBackupRoot(dir: string): boolean {
  return existsSync(join(dir, 'db', 'user.sqlite'))
}

export async function createDataBackup(wanwuPath: string): Promise<BackupResult> {
  if (!existsSync(wanwuPath)) {
    return { ok: false, error: '数据目录不存在' }
  }

  const win = getMainWindow()
  const defaultName = `wanwu-backup-${formatTimestamp()}.zip`
  const result = win
    ? await dialog.showSaveDialog(win, {
        title: '保存备份',
        defaultPath: defaultName,
        filters: [{ name: 'Zip 压缩包', extensions: ['zip'] }]
      })
    : await dialog.showSaveDialog({
        title: '保存备份',
        defaultPath: defaultName,
        filters: [{ name: 'Zip 压缩包', extensions: ['zip'] }]
      })

  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true }
  }

  try {
    const bytes = await zipDirectory(wanwuPath, result.filePath)
    return { ok: true, path: resolveExistingFilePath(result.filePath), bytes }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `备份失败：${message}` }
  }
}

export async function restoreDataBackup(
  wanwuPath: string,
  closeBefore: () => void
): Promise<RestoreResult> {
  const win = getMainWindow()
  const pick = win
    ? await dialog.showOpenDialog(win, {
        title: '选择备份文件',
        filters: [{ name: 'Zip 压缩包', extensions: ['zip'] }],
        properties: ['openFile']
      })
    : await dialog.showOpenDialog({
        title: '选择备份文件',
        filters: [{ name: 'Zip 压缩包', extensions: ['zip'] }],
        properties: ['openFile']
      })

  if (pick.canceled || !pick.filePaths?.length) {
    return { ok: false, canceled: true }
  }

  const zipPath = pick.filePaths[0]!
  const tempRoot = join(tmpdir(), `wanwu-restore-${randomUUID()}`)
  const extractDir = join(tempRoot, 'payload')

  try {
    await mkdir(extractDir, { recursive: true })
    await extractZip(zipPath, { dir: extractDir })

    let payloadDir = extractDir
    const entries = readdirSync(extractDir)
    if (entries.length === 1 && !validateBackupRoot(extractDir)) {
      const nested = join(extractDir, entries[0]!)
      if (validateBackupRoot(nested)) payloadDir = nested
    }

    if (!validateBackupRoot(payloadDir)) {
      return { ok: false, error: '备份文件无效：未找到 user.sqlite 数据库' }
    }

    closeBefore()
    rmSync(wanwuPath, { recursive: true, force: true })
    mkdirSync(wanwuPath, { recursive: true })

    cpSync(payloadDir, wanwuPath, { recursive: true })

    return { ok: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `恢复失败：${message}` }
  } finally {
    try {
      rmSync(tempRoot, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }
}

export function clearCacheDirectory(wanwuPath: string): { ok: true; bytesFreed: number } {
  const cacheDir = join(wanwuPath, 'cache')
  let bytesFreed = 0

  function measureDir(dir: string) {
    if (!existsSync(dir)) return
    for (const name of readdirSync(dir)) {
      const full = join(dir, name)
      try {
        const st = statSync(full)
        if (st.isDirectory()) {
          measureDir(full)
          rmSync(full, { recursive: true, force: true })
        } else {
          bytesFreed += st.size
          rmSync(full, { force: true })
        }
      } catch {
        /* skip */
      }
    }
  }

  measureDir(cacheDir)
  mkdirSync(cacheDir, { recursive: true })
  return { ok: true, bytesFreed }
}

export function resetAppSettingsInDb(db: DatabaseService): void {
  db.updateAppSettings({ ...DEFAULT_APP_SETTINGS })
}

export async function buildDiagnosticsReport(params: {
  wanwuPath: string
  db: DatabaseService | null
  rss: RssService | null
}): Promise<string> {
  const { wanwuPath, db, rss } = params
  const settings = normalizeAppSettings(db?.getAppSettings() ?? {})
  let feedCount = 0
  let groupCount = 0
  try {
    groupCount = rss?.listGroups().length ?? 0
    feedCount = rss?.listFeeds().length ?? 0
  } catch {
    /* db may be closed */
  }

  const dbFiles: string[] = []
  const dbDir = join(wanwuPath, 'db')
  if (existsSync(dbDir)) {
    for (const name of readdirSync(dbDir)) {
      if (name.endsWith('.sqlite')) {
        try {
          const size = (await stat(join(dbDir, name))).size
          dbFiles.push(`${name} (${Math.round(size / 1024)} KB)`)
        } catch {
          dbFiles.push(name)
        }
      }
    }
  }

  const lines = [
    'Wanwu Diagnostics',
    '=================',
    `generatedAt: ${new Date().toISOString()}`,
    `appVersion: ${APP_VERSION}`,
    `electron: ${process.versions.electron}`,
    `chrome: ${process.versions.chrome}`,
    `node: ${process.versions.node}`,
    `platform: ${process.platform} ${process.arch}`,
    `wanwuPath: ${wanwuPath}`,
    `settings: ${JSON.stringify(settings, null, 2)}`,
    `rssGroups: ${groupCount}`,
    `rssFeeds: ${feedCount}`,
    `databases: ${dbFiles.length ? dbFiles.join(', ') : 'n/a'}`
  ]
  return lines.join('\n')
}

export async function exportDiagnosticsToFile(content: string): Promise<
  | { ok: true; path: string }
  | { ok: false; canceled?: boolean; error?: string }
> {
  const win = getMainWindow()
  const defaultName = `wanwu-diagnostics-${formatTimestamp()}.txt`
  const result = win
    ? await dialog.showSaveDialog(win, {
        title: '导出诊断日志',
        defaultPath: defaultName,
        filters: [{ name: '文本文件', extensions: ['txt'] }]
      })
    : await dialog.showSaveDialog({
        title: '导出诊断日志',
        defaultPath: defaultName,
        filters: [{ name: '文本文件', extensions: ['txt'] }]
      })

  if (result.canceled || !result.filePath) {
    return { ok: false, canceled: true }
  }

  try {
    await writeFile(result.filePath, content, 'utf8')
    return { ok: true, path: resolveExistingFilePath(result.filePath) }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: message }
  }
}
