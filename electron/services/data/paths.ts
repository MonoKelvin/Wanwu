import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, normalize, resolve } from 'path'

const CONFIG_FILE = 'wanwu-path.json'

export interface WanwuPathConfig {
  wanwuPath?: string
}

export function getConfigFilePath(): string {
  return join(app.getPath('userData'), CONFIG_FILE)
}

export function getDefaultWanwuPath(): string {
  return join(app.getPath('userData'), 'wanwu')
}

export function readWanwuPathConfig(): WanwuPathConfig {
  const file = getConfigFilePath()
  if (!existsSync(file)) return {}
  try {
    return JSON.parse(readFileSync(file, 'utf-8')) as WanwuPathConfig
  } catch {
    return {}
  }
}

/** 当前生效的万物数据目录（含 db / media / cache） */
export function resolveWanwuPath(): string {
  const configured = readWanwuPathConfig().wanwuPath?.trim()
  if (configured) {
    return normalize(resolve(configured))
  }
  return getDefaultWanwuPath()
}

export function isCustomWanwuPath(): boolean {
  const configured = readWanwuPathConfig().wanwuPath?.trim()
  if (!configured) return false
  return normalize(resolve(configured)) !== normalize(getDefaultWanwuPath())
}

export function writeWanwuPathConfig(wanwuPath: string): void {
  const userData = app.getPath('userData')
  mkdirSync(userData, { recursive: true })
  writeFileSync(
    getConfigFilePath(),
    `${JSON.stringify({ wanwuPath: normalize(resolve(wanwuPath)) }, null, 2)}\n`,
    'utf-8'
  )
}

/** 目标父目录下将创建或使用 wanwu 子目录 */
export function resolveWanwuPathUnderParent(parentDir: string): string {
  return normalize(resolve(parentDir, 'wanwu'))
}

export function validateMigrationTarget(
  currentPath: string,
  targetParentDir: string
): { ok: true; targetPath: string } | { ok: false; error: string } {
  const current = normalize(resolve(currentPath))
  const parent = normalize(resolve(targetParentDir))
  const target = resolveWanwuPathUnderParent(parent)

  if (parent === normalize(resolve(current, '..'))) {
    return { ok: false, error: '请选择新的父目录，而非当前数据目录本身' }
  }

  if (target === current) {
    return { ok: false, error: '目标路径与当前数据目录相同' }
  }

  const currentLower = current.toLowerCase()
  const targetLower = target.toLowerCase()
  if (targetLower.startsWith(`${currentLower}\\`) || targetLower.startsWith(`${currentLower}/`)) {
    return { ok: false, error: '目标目录不能位于当前数据目录内部' }
  }
  if (currentLower.startsWith(`${targetLower}\\`) || currentLower.startsWith(`${targetLower}/`)) {
    return { ok: false, error: '目标目录不能包含当前数据目录' }
  }

  return { ok: true, targetPath: target }
}
