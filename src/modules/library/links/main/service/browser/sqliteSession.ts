import Database from 'better-sqlite3'
import { copyFileSync, existsSync, mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/** 复制 SQLite 主库及 WAL/SHM，在临时目录以只读方式打开（避免占用中的锁） */
export function openSqliteSnapshot(
  sourcePath: string,
  options?: { journalModeOff?: boolean }
): { db: Database.Database; cleanup: () => void } {
  const dir = mkdtempSync(join(tmpdir(), 'wanwu-sqlite-'))
  const base = join(dir, 'db.sqlite')
  copyFileSync(sourcePath, base)
  for (const suffix of ['-wal', '-shm']) {
    const side = sourcePath + suffix
    if (existsSync(side)) copyFileSync(side, base + suffix)
  }

  const pragma = options?.journalModeOff ? 'journal_mode=off' : 'mode=ro'
  const db = new Database(base, { readonly: !options?.journalModeOff })
  db.pragma(pragma)

  const cleanup = () => {
    try {
      db.close()
    } catch {
      /* ignore */
    }
    try {
      rmSync(dir, { recursive: true, force: true })
    } catch {
      /* ignore */
    }
  }

  return { db, cleanup }
}
