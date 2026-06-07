import { copyFile, rename } from 'node:fs/promises'
import { existsSync, mkdirSync, rmSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, join, normalize } from 'node:path'
import { tmpdir } from 'node:os'

const WIN_DRIVE_ROOT_RE = /^[a-zA-Z]:[\\/]?$/

/** Windows 上 rm 后立刻 mkdir 可能 EPERM，短暂重试可提高成功率 */
export function ensureDirSync(dir: string): void {
  let lastErr: unknown
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      mkdirSync(dir, { recursive: true })
      return
    } catch (err) {
      const code = (err as NodeJS.ErrnoException).code
      if (code !== 'EPERM' && code !== 'EACCES' && code !== 'EBUSY') throw err
      lastErr = err
      if (attempt < 5) {
        const end = Date.now() + 40 * (attempt + 1)
        while (Date.now() < end) {
          /* spin */
        }
      }
    }
  }
  throw lastErr
}

/** 仅为文件创建父目录；跳过盘符根目录（如 E:\），避免 EPERM */
export function ensureParentDirForFile(filePath: string): void {
  const parent = dirname(normalize(filePath))
  if (!parent || parent === '.' || WIN_DRIVE_ROOT_RE.test(parent)) return
  if (existsSync(parent)) return
  ensureDirSync(parent)
}

export function createTempWfgPath(): string {
  return join(tmpdir(), `wanwu-${randomUUID()}.wfg.tmp`)
}

/** 将临时 .wfg 发布到目标路径（跨盘符时自动 copyFile） */
export async function publishTempWfgFile(tempPath: string, destPath: string): Promise<void> {
  const dest = normalize(destPath)
  ensureParentDirForFile(dest)

  if (existsSync(dest)) rmSync(dest, { force: true })

  let lastErr: unknown
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      try {
        await rename(tempPath, dest)
        return
      } catch (err) {
        const code = (err as NodeJS.ErrnoException).code
        if (code === 'EXDEV' || code === 'EPERM' || code === 'EBUSY' || code === 'EACCES') {
          await copyFile(tempPath, dest)
          return
        }
        throw err
      }
    } catch (err) {
      lastErr = err
      const code = (err as NodeJS.ErrnoException).code
      if (code !== 'EPERM' && code !== 'EACCES' && code !== 'EBUSY') throw err
      if (attempt < 5) {
        await new Promise((r) => setTimeout(r, 40 * (attempt + 1)))
      }
    }
  }
  throw lastErr
}
