import { cpSync, existsSync, mkdirSync, readdirSync } from 'fs'
import { join } from 'path'
import { validateMigrationTarget, writeWanwuPathConfig } from './dataPaths'

export type MigrateDataResult =
  | { ok: true; targetPath: string }
  | { ok: false; error: string; code?: string }

function dirHasEntries(dir: string): boolean {
  if (!existsSync(dir)) return false
  try {
    return readdirSync(dir).length > 0
  } catch {
    return false
  }
}

/**
 * 将当前万物数据目录复制到 targetParentDir/wanwu，并写入路径配置。
 * 调用方须在复制前关闭数据库连接。
 */
export function migrateWanwuData(
  currentPath: string,
  targetParentDir: string,
  options?: { overwriteExisting?: boolean }
): MigrateDataResult {
  const validation = validateMigrationTarget(currentPath, targetParentDir)
  if (!validation.ok) {
    return { ok: false, error: validation.error, code: 'invalid_target' }
  }

  const targetPath = validation.targetPath

  if (existsSync(targetPath) && dirHasEntries(targetPath)) {
    if (!options?.overwriteExisting) {
      return {
        ok: false,
        error: '目标位置已存在 wanwu 文件夹且非空，请更换目录或确认覆盖',
        code: 'target_exists'
      }
    }
  } else {
    mkdirSync(targetPath, { recursive: true })
  }

  if (!existsSync(currentPath)) {
    return { ok: false, error: '当前数据目录不存在，无法迁移', code: 'source_missing' }
  }

  try {
    cpSync(currentPath, targetPath, {
      recursive: true,
      force: Boolean(options?.overwriteExisting),
      errorOnExist: !options?.overwriteExisting
    })
    writeWanwuPathConfig(targetPath)
    return { ok: true, targetPath }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { ok: false, error: `复制数据失败：${message}`, code: 'copy_failed' }
  }
}

export function wanwuDataHasContent(wanwuPath: string): boolean {
  const dbDir = join(wanwuPath, 'db')
  return dirHasEntries(dbDir) || dirHasEntries(join(wanwuPath, 'media'))
}
